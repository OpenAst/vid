from rest_framework import generics, permissions
from .models import Video
from .serializers import VideoSerializer
from rest_framework.pagination import PageNumberPagination
from rest_framework import status
from rest_framework.response import Response

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
  queryset = Video.objects.all().order_by('-created_at')
  serializer_class = VideoSerializer
  permission_classes = [permissions.IsAuthenticatedOrReadOnly]
  pagination_class = VideoPagination
  
  def perform_create(self, serializer):
    serializer.save(uploader=self.request.user)

class VideoDetailView(generics.RetrieveAPIView):
  queryset = Video.objects.all()
  serializer_class = VideoSerializer
  permission_classes = [permissions.AllowAny]    
