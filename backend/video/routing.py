from django.urls import re_path

from .consumers import CommentsConsumer, VideoLikesConsumer


websocket_urlpatterns = [
    re_path(r"ws/comments/(?P<room_id>[0-9a-f-]+)/$", CommentsConsumer.as_asgi()),
    re_path(r"ws/video-likes/$", VideoLikesConsumer.as_asgi()),
]
