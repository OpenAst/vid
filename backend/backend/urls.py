from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from accounts.views import (
  CustomTokenObtainPairView, ProfileUpdateView, PublicProfileView, UserDetailView, home, total_users,
  csrf, LogoutView, ActivateUserView, check_email, get_avatar_url, get_voice_note_url, google_auth_redirect,
  PushSubscriptionView, PendingIncomingCallView, UserFollowAPIView, UserFollowerListAPIView,
  UserFollowingListAPIView, UserBlockAPIView, UserBlockStatusAPIView, UserReportAPIView,
  UserBlockedListAPIView,
  google_auth_start, google_auth_callback, DirectConversationListCreateAPIView,
  DirectConversationMessagesAPIView, DirectMessageReactionAPIView, UserDirectoryAPIView, NotificationListAPIView,
  CollabRequestListCreateAPIView, CollabApplicationListCreateAPIView,
  CollabApplicationStatusAPIView, BookingSlotListCreateAPIView,
  BookingRequestListCreateAPIView, BookingRequestStatusAPIView
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
    path('auth/users/me/', UserDetailView.as_view(), name="current-user"),
    path('users/<str:username>/', PublicProfileView.as_view(), name='public-profile'),
    path('auth/users/<uuid:user_id>/follow/', UserFollowAPIView.as_view(), name='user-follow'),
    path('auth/users/<uuid:user_id>/followers/', UserFollowerListAPIView.as_view(), name='user-followers'),
    path('auth/users/<uuid:user_id>/following/', UserFollowingListAPIView.as_view(), name='user-following'),
    path('auth/users/blocked/', UserBlockedListAPIView.as_view(), name='blocked-users'),
    path('auth/users/<uuid:user_id>/block/', UserBlockAPIView.as_view(), name='user-block'),
    path('auth/users/<uuid:user_id>/block/status/', UserBlockStatusAPIView.as_view(), name='user-block-status'),
    path('auth/users/<uuid:user_id>/report/', UserReportAPIView.as_view(), name='user-report'),
    path('auth/users/profile/update/', ProfileUpdateView.as_view(), name='profile-update'),
    path('users/profile/get_avatar_url/', get_avatar_url, name='get_avatar_url'),
    path('auth/messages/voice-note-url/', get_voice_note_url, name='message_voice_note_url'),
    path('auth/check_email/', check_email, name='check_email'),
    path('auth/push/subscription/', PushSubscriptionView.as_view(), name='push-subscription'),
    path('auth/calls/pending/', PendingIncomingCallView.as_view(), name='pending-call'),
    path('auth/messages/conversations/', DirectConversationListCreateAPIView.as_view(), name='message-conversations'),
    path('auth/messages/conversations/<uuid:conversation_id>/messages/', DirectConversationMessagesAPIView.as_view(), name='message-conversation-messages'),
    path('auth/messages/conversations/<uuid:conversation_id>/messages/<uuid:message_id>/reaction/', DirectMessageReactionAPIView.as_view(), name='message-reaction'),
    path('auth/messages/users/', UserDirectoryAPIView.as_view(), name='message-users'),
    path('auth/notifications/', NotificationListAPIView.as_view(), name='notifications'),
    path('auth/collabs/requests/', CollabRequestListCreateAPIView.as_view(), name='collab-requests'),
    path('auth/collabs/requests/<uuid:request_id>/applications/', CollabApplicationListCreateAPIView.as_view(), name='collab-applications'),
    path('auth/collabs/applications/<uuid:application_id>/', CollabApplicationStatusAPIView.as_view(), name='collab-application-status'),
    path('auth/bookings/slots/', BookingSlotListCreateAPIView.as_view(), name='booking-slots'),
    path('auth/bookings/slots/<uuid:slot_id>/requests/', BookingRequestListCreateAPIView.as_view(), name='booking-requests'),
    path('auth/bookings/requests/<uuid:request_id>/', BookingRequestStatusAPIView.as_view(), name='booking-request-status'),
    path('auth/', include('djoser.urls')),
    path('auth/', include('djoser.urls.jwt')),
    path('auth/', include('djoser.social.urls')),
    path('users/', total_users, name='total_users'),
    path('auth/csrf/', csrf, name='csrf'),
    path('api/', include('video.urls')),
]


if settings.DEBUG:
  urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
