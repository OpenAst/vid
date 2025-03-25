from django.urls import path
from .views import VideoUploadView, VideoListView, VideoDetailView

urlpatterns = [
    path('videos/upload/', VideoUploadView.as_view(), name='video-upload'),
    path('videos/', VideoListView.as_view(), name='video-list'),
    path('videos/<int:pk>/', VideoDetailView.as_view(), name='video-detail'),
]