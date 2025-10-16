from django.urls import path
from . import views 

urlpatterns = [
    path('videos/save-metadata/', views.VideoUploadView.as_view(), name='video-upload'),
    path('videos/get_presigned_part_url/', views.get_presigned_part_url, name='presigned_part_url'),
    path('videos/initiate_multipart_upload/', views.initiate_multipart_upload, name='initiate_upload'),
    path('videos/complete_multipart_upload/', views.complete_multipart_upload, name='complete_upload'),
    path('videos/cleanup_multipart_uplaod/', views.cleanup_multipart_upload, name='cleanup_multipart_upload'),
    path('videos/', views.VideoListView.as_view(), name='video-list'),
    path('videos/<int:pk>/', views.VideoDetailView.as_view(), name='video-detail'),

    path('comments/', views.CommentListAPIView.as_view(), name='comment-list'),
    path('comments/create/<int:video_id>/', views.CommentCreateAPIView.as_view(), name='comment-create'),
    path('comments/<int:pk>/', views.CommentDetailAPIView.as_view(), name='comment-detail'),
    path('comments/<int:pk>/update/', views.CommentUpdateAPIView.as_view(), name='comment-update'),
    path('comments/<int:pk>/delete/', views.CommentDeleteAPIView.as_view(), name='comment-delete'),

    path("videos/vote/", views.VideoVoteAPIView.as_view(), name='video-vote'),

    path("comments/vote/", views.CommentVoteAPIView.as_view(), name='comment-vote'),
]