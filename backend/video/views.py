import uuid
import boto3
import logging
import subprocess
import tempfile
from botocore.config import Config
from botocore.client import Config
from django.conf import settings
from rest_framework import status
from django.db.models import Count
from django.http import JsonResponse
from rest_framework.response import Response
from rest_framework import generics, permissions, viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Video, Comment, VideoLike, CommentLike
from .serializers import VideoSerializer, CommentSerializer
from rest_framework.pagination import PageNumberPagination
from accounts.permissions import IsOwnerOrReadOnly
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import JSONParser, MultiPartParser

class VideoPagination(PageNumberPagination):
  page_size = 10
  page_size_query_param = 'limit'
  max_page_size = 100

class VideoUploadView(generics.CreateAPIView):
    serializer_class = VideoSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser]

    def create(self, request, *args, **kwargs):
        print("Request data:", request.data)

        try:
            # Validate required fields
            required_fields = ['title', 'description', 'file_url']
            missing = [f for f in required_fields if f not in request.data]
            
            if missing:
                return Response(
                    {"error": f"Missing required fields: {missing}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            data = {
                "title": request.data.get("title"),
                "description": request.data.get("description", ""),
                "file_url": request.data.get("file_url"),
            }
            
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

            
        except Exception as e:
            logger = logging.getLogger(__name__)
            
            if serializer:
                logger.error("Validation errors: %s", serializer.errors)

            logger.error("Request data: %s", request.data)
            logger.exception("Exception occurred during video metadata upload")

            return Response(
                {
                    "error": "Metadata upload failed",
                    "details": str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    def perform_create(self, serializer):
        serializer.save(uploader=self.request.user)

class VideoListView(generics.ListAPIView):
  serializer_class = VideoSerializer
  permission_classes = [permissions.IsAuthenticatedOrReadOnly]
  pagination_class = VideoPagination
  
  def get_serializer_context(self):
    return {"request": self.request}
  
  def get_queryset(self):
        return Video.objects.annotate(like_count=Count("likes")).order_by('-created_at')

class VideoDetailView(generics.RetrieveAPIView):
  serializer_class = VideoSerializer
  permission_classes = [permissions.AllowAny]    

  def get_queryset(self):
        return Video.objects.annotate(like_count=Count("likes")).order_by('-created_at')

class CommentListAPIView(generics.ListAPIView):
   serializer_class = CommentSerializer
   permission_classes = [permissions.AllowAny]

   def get_queryset(self):
      video_id = self.kwargs['video_id']
      return Comment.objects.filter(video_id=video_id).order_by('-created_at')

class CommentCreateAPIView(generics.CreateAPIView):
   serializer_class = CommentSerializer
   permission_classes = [permissions.IsAuthenticated]

   def perform_create(self, serializer):
      video_id = self.kwargs['video_id']
      serializer.save(user=self.request.user, video_id=video_id)

class CommentDetailAPIView(generics.RetrieveAPIView):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "pk"

class CommentUpdateAPIView(generics.UpdateAPIView):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    lookup_field = "pk"


class CommentDeleteAPIView(generics.DestroyAPIView):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    lookup_field = "pk"

class VideoLikeViewSet(viewsets.ViewSet):
   permission_classes = [permissions.IsAuthenticated]
   queryset = Video.objects.annotate(like_count=Count("likes"))

   def create(self, request):
      video_id = request.data.get('video')
      video = Video.objects.get(id=video_id)
      like, created = VideoLike.objects.get_or_create(video=video, user=request.user)
      if not created:
        return Response({"detail": "Already liked"}, status=400)
      return Response({"detail": "Liked"}, status=201)
   
   def destroy(self, request, pk=None):
      try:
         like = VideoLike.objects.get(video_id=pk, user=request.user)
         like.delete()
         return Response({"detail": "Unliked"}, status=204)
      except VideoLike.DoesNotExist:
         return Response({"detail": "Like does not exist"}, status=404)
      
class CommentLikeViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Comment.objects.annotate(like_count=Count("likes"))

    def create(self, request):
        comment_id = request.data.get("comment")
        comment = Comment.objects.get(id=comment_id)
        like, created = CommentLike.objects.get_or_create(comment=comment, user=request.user)

        if not created:
            return Response({"detail": "Already liked"}, status=400)
        return Response({"detail": "Liked"}, status=201)

    def destroy(self, request, pk=None):
        try:
            like = CommentLike.objects.get(comment_id=pk, user=request.user)
            like.delete()
            return Response({"detail": "Unliked"}, status=204)
        except CommentLike.DoesNotExist:
            return Response({"detail": "Like does not exist"}, status=404)      
        

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def get_presigned_url(request):
    try:
        file_name = request.data['file_name']
        file_type = request.data['file_type']
        
        s3 = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name='auto',
            config=Config(
                signature_version='s3v4',
                s3={'addressing_style': 'virtual'}
            )
        )

        object_key = f"user_{request.user.id}/{uuid.uuid4()}_{file_name}"
        
        presigned_url = s3.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                'Key': object_key,
                'ContentType': file_type,
                'ACL': 'public-read'
            },
            ExpiresIn=3600 
        )

        public_url = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{object_key}"
        logger.info(f"Presigned upload URL: {presigned_url}")
        logger.info(f"Public file will be accessible at: {public_url}")

        return Response({
            'url': presigned_url,
            'object_key': object_key,
            'public_url': public_url
        })

    except Exception as e:
        logger.error(f"Error generating presigned URL: {e}")
        return Response({'error': str(e)}, status=500)


def extract_and_upload_thumbnail(video_url, video_instance):
    temp_video = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False).name
    subprocess.call([
        'ffmpeg',
        '-i', temp_video.name,
        '-ss', '00:00:03.000',
        '-vframes', '1',
        thumbnail_path
    ])
    s3 = boto3.client('s3', 
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name='auto',
        config=Config(
            signature_version='s3v4', 
            s3={'addressing_style': 'virtual'}
        )
    )
    key = f"thumbnails/{video_instance.id}_thumb.jpg"
    with open(thumbnail_path, 'rb') as f:
        s3.put_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=key,
            Body=f,
            ACL='public-read',
            ContentType='image/jpeg'
        )

    public_url = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{key}"
    video_instance.thumbnail = public_url
    video_instance.save()
