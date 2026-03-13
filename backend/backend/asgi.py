import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from video.routing import websocket_urlpatterns
from video.ws_auth import QueryStringJWTAuthMiddlewareStack


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": QueryStringJWTAuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
