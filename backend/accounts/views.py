from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from django.db import models
from .models import UserAccount, Profile
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from .serializers import (
    CustomTokenObtainPairSerializer, UserUpdateSerializer, ProfileSerializer, 
    UserDetailSerializer, UserPublicSerializer
)
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.http import urlsafe_base64_decode
from .tokens import OneDayActivationTokenGenerator
import boto3
import time
from django.conf import settings
from django.http import JsonResponse




User = get_user_model()
token_generator = OneDayActivationTokenGenerator()


class ActivateUserView(APIView):
    def post(self, request):
        uid = request.data.get("uid")
        token = request.data.get("token")

        try: 
            uid = urlsafe_base64_decode(uid).decode()
            user = UserAccount.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"detail": "Invalid UID"}, status.HTTP_400_BAD_REQUEST)
        
        if token_generator.check_token(user, token):
            user.is_active = True
            user.save()
            return Response({"detail": "Account activated"}, status=status.HTTP_200_OK)

        return Response({"detail": "Activation link expired or invalid"}, status=status.HTTP_400_BAD_REQUEST)

        

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        try:
            user = User.objects.get(email=request.data.get('email'))

            if not user.is_active:
                return Response(
                    {'detail': 'Account not activated'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            if user.is_deactivated:
                return Response(
                    {'detail': 'Account deactivated'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
        except User.DoesNotExist:
            # Let the serializer handle invalid credentials
            pass

        response = super().post(request, *args, **kwargs)
        return response
        
class UserDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserDetailSerializer
    
    def get_object(self):
        return self.request.user

    
class ProfileUpdateView(generics.UpdateAPIView):
    """PATCH /auth/users/profile/update/"""
    serializer_class = UserUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
    
    def get_serializer_class(self):
        if self.request.method in ('PATCH', 'PUT'):
            return UserUpdateSerializer
        return UserDetailSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        instance.refresh_from_db()
        if hasattr(instance, "profile"):
            instance.profile.refresh_from_db()

        read_serializer = UserDetailSerializer(instance, context=self.get_serializer_context())
        return Response(read_serializer.data, status=status.HTTP_200_OK)

    
class ProfileView(generics.RetrieveAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user.profile

class PublicProfileView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserPublicSerializer
    permission_classes = [permissions.AllowAny]

    lookup_field = "username" #Lookup field for username

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def get_avatar_url(request):
    s3 = boto3.client(
        "s3",
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name='auto'
    )
    
    file_type = request.data.get("file_type", "image/jpeg")
    file_name = request.data.get("file_name", f"avatar_{request.user.id}")
    
    if file_type == "image/svg+xml":
        file_type = "image/png"
        file_extension = "png"
    else: 
        file_extension = file_type.split('/')[-1]

    # user Id with cache busting
    timestamp = int(time.time())
    
    key = f"avatars/{request.user.id}_{timestamp}.{file_extension}"

    presigned_url = s3.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
            "Key": key,
            "ContentType": file_type
        },
        ExpiresIn=3600,
    )

    if hasattr(settings, "AWS_S3_CUSTOM_DOMAIN"):
        public_url = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{key}"
    else:
        public_url = f"{settings.AWS_S3_ENDPOINT_URL}/{settings.AWS_STORAGE_BUCKET_NAME}/{key}"
        
    return JsonResponse({
        "upload_url": presigned_url, 
        "public_url": public_url,
        "file_name": key
    })

@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({'message': 'CSRF cookie set'})

@api_view(['GET'])  
def home(request):
    return Response({'detail': 'Welcome home !'}, status=status.HTTP_200_OK)

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

class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")

        if refresh_token is None:
            return Response({
                "error": "Refresh token is required"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response({
                "detail": "Logout successful"
            }, status=status.HTTP_205_RESET_CONTENT)
            
        except TokenError as e:
            return Response({
                "error": "Token is invalid or expired",
                "details": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)    

@api_view(['GET'])
def check_email(request):
    email = request.query_params.get('email')

    if not email:
        return Response({
            "error": "Email is required",
        }, status=status.HTTP_400_BAD_REQUEST)
    exists = User.objects.filter(email=email).exists()

    return Response({'exists': exists}, status=status.HTTP_200_OK)
    