from django.urls import path
from .consumers import PostConsumer

websocket_urlpatterns = [
  path('ws/posts/', PostConsumer.as_asgi()),
  
]