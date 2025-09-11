from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from accounts.views import (
  CustomTokenObtainPairView, UserDetailProfileUpdateView, PublicProfileView, home, total_users,
  csrf, LogoutView, ActivateUserView, check_email, get_avatar_url
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
    path('auth/', include('djoser.urls')),
    path('auth/users/me/', UserDetailProfileUpdateView.as_view(), name="current-user"),
    path('auth/', include('djoser.urls.jwt')),
    path('auth/', include('djoser.social.urls')),
    path('users/<str:username>/', PublicProfileView.as_view(), name='public-profile'),
    path('users/profile/get_avatar_url/', get_avatar_url, name='get_avatar_url'),
    path('auth/check_email/', check_email, name='check_email'),
    path('users/', total_users, name='total_users'),
    path('auth/csrf/', csrf, name='csrf'),
    path('api/', include('video.urls')),
] 

if settings.DEBUG:
  urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)