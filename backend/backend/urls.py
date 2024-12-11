from django.contrib import admin
from django.urls import path, include
from accounts.views import (CustomTokenObtainPairView,
                             home, total_users)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('chat/', include('chat.urls')),
    path('auth/', include('djoser.urls')),
    path('auth/jwt/create/', CustomTokenObtainPairView.as_view(), 
         name='custom_jwt_create'),
    path('auth/', include('djoser.urls.jwt')),
    path('auth/', include('djoser.social.urls')),
    path('home/', home, name='home'),
    path('users/', total_users, name='total_users'),
] 

