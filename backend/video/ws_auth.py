from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser
from channels.auth import AuthMiddlewareStack
from channels.db import database_sync_to_async
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


@database_sync_to_async
def get_user_for_token(token):
    try:
        authenticator = JWTAuthentication()
        validated_token = authenticator.get_validated_token(token)
        return authenticator.get_user(validated_token)
    except Exception as e:
        print(f"WS Auth Error: {str(e)}")
        return AnonymousUser()


class QueryStringJWTAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query_params = parse_qs(scope.get("query_string", b"").decode())
        token = query_params.get("token", [None])[0]

        print(f"WS Connection Attempt - Path: {scope['path']}, Token present: {bool(token)}")

        if token:
            scope["user"] = await get_user_for_token(token)
        else:
            scope["user"] = AnonymousUser()

        print(f"WS Auth User: {scope['user']}")
        return await self.inner(scope, receive, send)


def QueryStringJWTAuthMiddlewareStack(inner):
    return QueryStringJWTAuthMiddleware(AuthMiddlewareStack(inner))
