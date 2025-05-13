from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from accounts.views import (
  CustomTokenObtainPairView, ProfileUpdateView, home, total_users,
  csrf, LogoutView, ActivateUserView
    )

urlpatterns = [
    path('', home, name='home'),
    path('admin/', admin.site.urls),
    path('auth/users/activation/', ActivateUserView.as_view(), name='activate'),
    path('auth/jwt/create/', CustomTokenObtainPairView.as_view(), 
         name='custom_jwt_create'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/', include('djoser.urls')),
    path('auth/', include('djoser.urls.jwt')),
    path('auth/', include('djoser.social.urls')),
    path('auth/csrf/', csrf, name='csrf'),
    path('users/profile/update/', ProfileUpdateView.as_view(), name='profile-update'),
    path('users/', total_users, name='total_users'),
    path('api/', include('video.urls')),
] 

if settings.DEBUG:
  urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)