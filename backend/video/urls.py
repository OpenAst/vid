from django.urls import path
from . import views 

urlpatterns = [
    path('realtime/auth/me/', views.RealtimeAuthMeAPIView.as_view(), name='realtime-auth-me'),
    path('realtime/comments/<uuid:video_id>/history/', views.RealtimeCommentHistoryAPIView.as_view(), name='realtime-comment-history'),
    path('realtime/comments/<uuid:video_id>/messages/', views.RealtimeCommentCreateAPIView.as_view(), name='realtime-comment-create'),
    path('realtime/comments/<uuid:video_id>/replies/', views.RealtimeReplyCreateAPIView.as_view(), name='realtime-reply-create'),
    path('realtime/comments/vote/toggle/', views.RealtimeCommentVoteToggleAPIView.as_view(), name='realtime-comment-vote-toggle'),
    path('realtime/videos/vote/toggle/', views.RealtimeVideoVoteToggleAPIView.as_view(), name='realtime-video-vote-toggle'),
    path('videos/save-metadata/', views.VideoUploadView.as_view(), name='video-upload'),
    path('videos/get_presigned_part_url/', views.get_presigned_part_url, name='presigned_part_url'),
    path('videos/initiate_multipart_upload/', views.initiate_multipart_upload, name='initiate_upload'),
    path('videos/complete_multipart_upload/', views.complete_multipart_upload, name='complete_upload'),
    path('videos/cleanup_multipart_uplaod/', views.cleanup_multipart_upload, name='cleanup_multipart_upload'),
    path('videos/', views.VideoListView.as_view(), name='video-list'),
    path('videos/<uuid:pk>/', views.VideoDetailView.as_view(), name='video-detail'),

    path('comments/', views.CommentListAPIView.as_view(), name='comment-list'),
    path('comments/create/<uuid:video_id>/', views.CommentCreateAPIView.as_view(), name='comment-create'),
    path('comments/<uuid:pk>/', views.CommentDetailAPIView.as_view(), name='comment-detail'),
    path('comments/<uuid:pk>/update/', views.CommentUpdateAPIView.as_view(), name='comment-update'),
    path('comments/<uuid:pk>/delete/', views.CommentDeleteAPIView.as_view(), name='comment-delete'),

    path("comments/vote/", views.CommentVoteAPIView.as_view(), name='comment-vote'),
    
    path("videos/vote/", views.VideoVoteAPIView.as_view(), name='video-vote'),
    path("videos/<uuid:video_id>/view/", views.VideoViewAPIView.as_view(), name='video-view'),
    path("calls/start/", views.CallStartAPIView.as_view(), name='call-start'),
    path("calls/turn-credentials/", views.TurnCredentialsAPIView.as_view(), name='call-turn-credentials'),
    path("calls/<uuid:call_id>/<str:action>/", views.CallActionAPIView.as_view(), name='call-action'),

]
