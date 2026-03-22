import uuid
import boto3
import logging
import subprocess
import tempfile
import threading
import requests
from botocore.config import Config
from django.conf import settings
from rest_framework import status
from django.db.models import Count
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework import generics, permissions, viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Video, Comment, VideoVote, CommentVote, VideoView
from .serializers import VideoSerializer, CommentSerializer, VideoVoteSerializer, CommentVoteSerializer
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
    parser_classes = [JSONParser]

    def create(self, request, *args, **kwargs):
        logger = logging.getLogger(__name__)
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

            if not serializer.is_valid():
                logger.error("Validation errors: %s", serializer.errors)
                return Response(serializer.errors, status=400)

            self.perform_create(serializer)
            video_instance = serializer.instance
            
            # Trigger thumbnail extraction in the background
            threading.Thread(
                target=extract_and_upload_thumbnail, 
                args=(video_instance.file_url, video_instance)
            ).start()

            return Response(serializer.data, status=status.HTTP_201_CREATED)

            
        except Exception as e:

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

from django.db.models import Q

class VideoListView(generics.ListAPIView):
  serializer_class = VideoSerializer
  permission_classes = [permissions.IsAuthenticatedOrReadOnly]
  pagination_class = VideoPagination
  
  def get_serializer_context(self):
    return {"request": self.request}
  
  def get_queryset(self):
    queryset = Video.objects.order_by('-created_at')
    search_query = self.request.query_params.get('search', None)
    username = self.request.query_params.get('username', None)
    
    if search_query:
      queryset = queryset.filter(
        Q(title__icontains=search_query) | 
        Q(description__icontains=search_query)
      )
    
    if username:
      queryset = queryset.filter(uploader__username=username)
      
    return queryset

class VideoDetailView(generics.RetrieveAPIView):
  serializer_class = VideoSerializer
  permission_classes = [permissions.AllowAny]    

  def get_queryset(self):
    return Video.objects.order_by('-created_at')

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

class VideoVoteAPIView(generics.CreateAPIView):
    serializer = VideoVoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        video_id = request.data.get("video")
        value = int(request.data.get("value", 0))

        if value not in [1, -1]:
            return Response({"detail": "Invalid vote vallue"}, status=status.HTTP_400_BAD_REQUEST)
        
        existing_vote = VideoVote.objects.filter(video_id=video_id, user=request.user).first()

        if existing_vote:
            if existing_vote.value == value:
                existing_vote.delete()
                return Response({"detail": "Vote removed", "value": "0"}, status=status.HTTP_200_OK)
            else:
                existing_vote.value = value
                existing_vote.save()
                return Response({"detail": "Vote updated", "value": value}, status=status.HTTP_200_OK)
        
        VideoVote.objects.create(video_id=video_id, user=request.user, value=value)
        return Response({"detail": "Vote recorded", "value": value}, status=status.HTTP_201_CREATED)

class CommentVoteAPIView(generics.CreateAPIView):
    serializer_class = CommentVoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        comment_id = request.data.get("comment") or request.data.get("commentId")
        value = int(request.data.get("value", 1))

        print("Received data", request.data)
        
        if not comment_id:
            return Response({
                "detail": "Comment ID and vote value are required."
            }, status=status.HTTP_400_BAD_REQUEST
        )

        try:
            comment_uuid = uuid.UUID(comment_id)
        except (ValueError, TypeError):
            return Response({
                "detail": "Invalid comment ID format."
            }, status=status.HTTP_400_BAD_REQUEST)

        
        comment = get_object_or_404(Comment, pk=comment_uuid)


        existing_like = CommentVote.objects.filter(comment=comment, user=request.user, value=1).first()

        if existing_like:
            existing_like.delete()
            total_likes = CommentVote.objects.filter(comment=comment, value=1).count()

            return Response(
                {
                    "detail": "Like removed",
                    "liked": False,
                    "total_likes": total_likes
                }, status=status.HTTP_200_OK
            )

        CommentVote.objects.create(comment=comment, user=request.user, value=1)
        total_likes = CommentVote.objects.filter(comment=comment, value=1).count()

        return Response(
            {
                "detail": "Liked successfully",
                "liked": True,
                "total_likes": total_likes
            }, status=status.HTTP_201_CREATED
        )

class VideoViewAPIView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        video_id = self.kwargs.get("video_id")
        video = get_object_or_404(Video, pk=video_id)
        
        user = request.user if request.user.is_authenticated else None
        ip_address = self.get_client_ip(request)
        session_key = request.session.session_key or ""

        # Logic for unique views: 
        # 1. If authenticated, check if this user has viewed this video in the last 24 hours.
        # 2. If anonymous, check if this IP has viewed this video in the last 24 hours.
        
        from django.utils import timezone
        from datetime import timedelta
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        # Reduced window for testing/verification, can be increased later
        time_threshold = timezone.now() - timedelta(minutes=1)
        
        if user:
            already_viewed = VideoView.objects.filter(
                video=video, user=user, created_at__gt=time_threshold
            ).exists()
        else:
            already_viewed = VideoView.objects.filter(
                video=video, ip_address=ip_address, created_at__gt=time_threshold
            ).exists()

        if not already_viewed:
            VideoView.objects.create(
                video=video,
                user=user,
                ip_address=ip_address,
                session_key=session_key
            )
            # Increment the views count on the video model for fast access
            video.views += 1
            video.save(update_fields=['views'])

            # Broadcast update via WebSocket
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "video_likes", # Reusing the video_likes group
                {
                    "type": "videos.view_updated",
                    "videoId": str(video.id),
                    "views": video.views,
                }
            )

            return Response({"detail": "View recorded", "total_views": video.views}, status=status.HTTP_201_CREATED)
        
        return Response({"detail": "Already viewed", "total_views": video.views}, status=status.HTTP_200_OK)

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initiate_multipart_upload(request):
    file_name = request.data['file_name']
    object_key = f"user_{request.user.id}/{uuid.uuid4()}_{file_name}"

    s3 = boto3.client(
        's3',
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name='auto'
    )
    response = s3.create_multipart_upload(
        Bucket=settings.AWS_STORAGE_BUCKET_NAME,
        Key=object_key,
        ACL='public-read',
        ContentType='application/octet-stream'
    )
    public_url = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{object_key}"

    return Response(
        {
            'upload_id': response['UploadId'],
            'object_key': object_key,
            'public_url': public_url
        })

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def get_presigned_part_url(request):
    try:
        object_key = request.data['object_key']
        file_type = request.data['file_type']
        part_number = int(request.data['part_number'])
        upload_id = request.data['upload_id']
        
        s3 = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name='auto',
            config=Config(
                signature_version='s3v4',
                s3={'addressing_style': 'path'}
            )
        )
        
        presigned_url = s3.generate_presigned_url(
            'upload_part',
            Params={
                'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                'Key': object_key,
                'UploadId': upload_id,
                'PartNumber': part_number,
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_multipart_upload(request):
    try:
        object_key = request.data['object_key']
        upload_id = request.data['upload_id']
        parts = request.data['parts']

        s3 = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name='auto',
            config=Config(
                signature_version='s3v4',
                s3={'addressing_style': 'path'}
            )
        )

        response = s3.complete_multipart_upload(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=object_key,
            UploadId=upload_id,
            MultipartUpload={'Parts': parts}
        )

        public_url = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{object_key}"

        return Response({
            'message': 'Upload complete',
            'location': response.get('Location'),
            'object_key': object_key,
            'public_url': public_url
            })
    except Exception as e:
        logger.exception("Error completing multipart upload")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cleanup_multipart_upload(request):
    """
    Delete all incomplete multipart uploads for this bucket.
    """

    s3 = boto3.client(
        's3',
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name='auto'
    )

    aborted = []
    paginator = s3.get_paginator("list_multipart_uploads")

    for page in paginator.paginate(Bucket=settings.AWS_STORAGE_BUCKET_NAME):
        uploads = page.get("Uploads", [])
        for u in uploads:
            object_key = u["Key"]
            upload_id = u["UploadId"]
            try:
                s3.abort_multipart_upload(
                    Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                    Key=object_key,
                    UploadId=upload_id
                )
                aborted.append({"key": object_key, "upload_id": upload_id})
            except Exception as e:
                print(f"Failed to abort {object_key} - {upload_id}: {e}")

    return Response({
        'message': f'Aborted {len(aborted)} incomplete multipart uploads',
        'aborted': aborted
        })

def extract_and_upload_thumbnail(video_url, video_instance):
    """
    Downloads the first part of the video, extracts a thumbnail using ffmpeg,
    and uploads it to R2.
    """
    temp_video = None
    temp_thumb = None
    try:
        # Create temp files
        temp_video = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False).name
        temp_thumb = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False).name

        # Download video (first 2MB should be enough for metadata and frame at 3s)
        # However, for simplicity and reliability with S3 urls, we'll download enough or use stream if ffmpeg supports it.
        # Deep diving: ffmpeg can take a URL directly, but it might be slow or fail without headers.
        # For now, let's download the first bit using requests.
        response = requests.get(video_url, stream=True, timeout=10)
        with open(temp_video, 'wb') as f:
            for chunk in response.iter_content(chunk_size=1024*1024):
                f.write(chunk)
                if f.tell() > 5 * 1024 * 1024: # 5MB limit for thumbnail extraction
                    break
        
        # Extract frame
        subprocess.call([
            'ffmpeg',
            '-y', # Overwrite 
            '-i', temp_video,
            '-ss', '00:00:03.000',
            '-vframes', '1',
            '-f', 'image2',
            temp_thumb
        ])

        # Verify thumb was created
        if not os.path.exists(temp_thumb) or os.path.getsize(temp_thumb) == 0:
            print(f"Thumbnail extraction failed for video {video_instance.id}")
            return

        # Upload to S3/R2
        s3 = boto3.client('s3', 
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name='auto',
            config=Config(
                signature_version='s3v4', 
                s3={'addressing_style': 'path'} # Match the fixed style
            )
        )
        key = f"thumbnails/{video_instance.id}_thumb.jpg"
        
        with open(temp_thumb, 'rb') as f:
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
        print(f"Successfully generated and uploaded thumbnail for {video_instance.id}")

    except Exception as e:
        print(f"Error in extract_and_upload_thumbnail: {str(e)}")
    finally:
        # Cleanup
        if temp_video and os.path.exists(temp_video):
            os.remove(temp_video)
        if temp_thumb and os.path.exists(temp_thumb):
            os.remove(temp_thumb)
