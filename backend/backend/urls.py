from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from accounts.views import (
  CustomTokenObtainPairView, ProfileUpdateView, PublicProfileView, UserDetailView, home, total_users,
  csrf, LogoutView, ActivateUserView, check_email, get_avatar_url, google_auth_redirect,
  PushSubscriptionView, PendingIncomingCallView,
  google_auth_start, google_auth_callback, DirectConversationListCreateAPIView,
  DirectConversationMessagesAPIView, UserDirectoryAPIView
)
from video.views import (
  get_presigned_part_url, initiate_multipart_upload,
  complete_multipart_upload
)
urlpatterns = [
    path('', home, name='home'),
    path('admin/', admin.site.urls),
    path('auth/users/activation/', ActivateUserView.as_view(), name='activate'),
    path('auth/jwt/create/', CustomTokenObtainPairView.as_view(), 
         name='custom_jwt_create'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/google/redirect/', google_auth_redirect, name='google-auth-redirect'),
    path('auth/google/start/', google_auth_start, name='google-auth-start'),
    path('auth/google/callback/', google_auth_callback, name='google-auth-callback'),
    path('auth/', include('djoser.urls')),
    path('auth/users/me/', UserDetailView.as_view(), name="current-user"),
    path('auth/', include('djoser.urls.jwt')),
    path('auth/', include('djoser.social.urls')),
    path('users/<str:username>/', PublicProfileView.as_view(), name='public-profile'),
    path('auth/users/profile/update/', ProfileUpdateView.as_view(), name='profile-update'),
    path('users/profile/get_avatar_url/', get_avatar_url, name='get_avatar_url'),
    path('auth/check_email/', check_email, name='check_email'),
    path('auth/push/subscription/', PushSubscriptionView.as_view(), name='push-subscription'),
    path('auth/calls/pending/', PendingIncomingCallView.as_view(), name='pending-call'),
    path('auth/messages/conversations/', DirectConversationListCreateAPIView.as_view(), name='message-conversations'),
    path('auth/messages/conversations/<uuid:conversation_id>/messages/', DirectConversationMessagesAPIView.as_view(), name='message-conversation-messages'),
    path('auth/messages/users/', UserDirectoryAPIView.as_view(), name='message-users'),
    path('users/', total_users, name='total_users'),
    path('auth/csrf/', csrf, name='csrf'),
    path('api/', include('video.urls')),
]


if settings.DEBUG:
  urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
