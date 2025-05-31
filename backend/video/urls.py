from django.urls import path
from . import views 

urlpatterns = [
    path('videos/upload/', views.VideoUploadView.as_view(), name='video-upload'),
    path('videos/', views.VideoListView.as_view(), name='video-list'),
    path('videos/<int:pk>/', views.VideoDetailView.as_view(), name='video-detail'),

    path('video/pre_signed_url/', views.get_presigned_url, name='presigned_url'),
    path('videos/<uuid:video_id>/comments/', views.CommentListAPIView.as_view(), name='comment-list'),
    path('videos/<uuid:video_id>/comments/create/', views.CommentCreateAPIView.as_view(), name='comment-create'),
    path('comments/<int:pk>/', views.CommentDetailAPIView.as_view(), name='comment-detail'),
    path('comments/<int:pk>/update/', views.CommentUpdateAPIView.as_view(), name='comment-update'),
    path('comments/<int:pk>/delete/', views.CommentDeleteAPIView.as_view(), name='comment-delete'),

    path("videos/like/", views.VideoLikeViewSet.as_view({"post": "create"})),
    path("videos/unlike/<str:pk>/", views.VideoLikeViewSet.as_view({"delete": "destroy"})),

    path("comments/like/", views.CommentLikeViewSet.as_view({"post": "create"})),
    path("comments/unlike/<str:pk>/", views.CommentLikeViewSet.as_view({"delete": "destroy"})),
]