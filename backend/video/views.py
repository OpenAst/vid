from rest_framework import generics, permissions, viewsets
from .models import Video, Comment, VideoLike, CommentLike
from .serializers import VideoSerializer, CommentSerializer
from rest_framework.pagination import PageNumberPagination
from rest_framework import status
from rest_framework.response import Response
from accounts.permissions import IsOwnerOrReadOnly
from django.db.models import Count

class VideoPagination(PageNumberPagination):
  page_size = 10
  page_size_query_param = 'limit'
  max_page_size = 100

class VideoUploadView(generics.CreateAPIView):
    serializer_class = VideoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
      print("Authenticated user:", self.request.user)
      print("Incoming data:", self.request.data)
      
      serializer.save(uploader=self.request.user)

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
class VideoListView(generics.ListAPIView):
  serializer_class = VideoSerializer
  permission_classes = [permissions.IsAuthenticatedOrReadOnly]
  pagination_class = VideoPagination
  
  def perform_create(self, serializer):
    serializer.save(uploader=self.request.user)

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