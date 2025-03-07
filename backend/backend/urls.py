from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from accounts.views import (
  CustomTokenObtainPairView, ProfileUpdateView, home, total_users,
    )

urlpatterns = [
    path('admin/', admin.site.urls),
    path('auth/jwt/create/', CustomTokenObtainPairView.as_view(), 
         name='custom_jwt_create'),
    path('auth/', include('djoser.urls')),
    path('auth/', include('djoser.urls.jwt')),
    path('auth/', include('djoser.social.urls')),
    path('profile/update/', ProfileUpdateView.as_view(), name='profile-update'),
    path('home/', home, name='home'),
    path('users/', total_users, name='total_users'),
    path('posts/', include('post.urls'))
] 

if settings.DEBUG:
  urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)