import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from video.routing import websocket_urlpatterns
from video.ws_auth import QueryStringJWTAuthMiddlewareStack

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": QueryStringJWTAuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})

