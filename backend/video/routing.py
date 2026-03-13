from django.urls import path
from .consumers import CommentsConsumer, VideoLikesConsumer


websocket_urlpatterns = [
    path("ws/comments/<uuid:room_id>/", CommentsConsumer.as_asgi()),
    path("ws/video-likes/", VideoLikesConsumer.as_asgi()),
]
