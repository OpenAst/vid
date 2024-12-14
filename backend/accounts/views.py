from django.shortcuts import render
from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from .permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.db import models
from django.conf import settings
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer

User = get_user_model()

@api_view(['POST'])
@permission_classes([AllowAny])
def check_email_exists(request):
    if not request.data.get('email'):
        return Response({'error': 'Bad_request'}, status=status.HTTP_400_BAD_REQUEST)

    email = request.data.get('email')
    try:
        User.objects.get(email=email)
        return Response({'email_exists': True}, status=status.HTTP_200_OK)

    except User.DoesNotExist:
        return Response({'email_exists': False}, status=status.HTTP_404_NOT_FOUND)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        try:
            user = User.objects.get(email=request.data.get('email'))
            if not user.is_active:
                return Response({'detail': 'Account not activated'}, status=status.HTTP_401_UNAUTHORIZED)
            if user.is_deactivated:
                return Response({'detail': 'Account deactivated'}, status=status.HTTP_401_UNAUTHORIZED)
        except User.DoesNotExist:
            return Response({'error': 'Invalid email or password'}, status=status.HTTP_400_BAD_REQUEST)

        return super().post(request, *args, **kwargs)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def home(request):
    return Response({'detail': 'Welcome home'}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def total_users(request):
    """
        Returns total number of users with IDs and emails
    """
    users = User.objects.filter(is_active=True).values('id', 'email')
    total_count = users.count()

    return Response({
        "total_users": total_count,
        "user_details": list(users)
    })

# # Video model
# class Video(models.Model):
#     user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='videos')
#     title = models.CharField(max_length=255)
#     description = models.TextField(blank=True)
#     video_file = models.FileField(upload_to='videos/')
#     uploaded_at = models.DateTimeField(auto_now_add=True)

#     def __str__(self):
#         return self.title

