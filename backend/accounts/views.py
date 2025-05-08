from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from django.db import models
from .models import UserAccount, Profile
from django.conf import settings
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from .serializers import CustomTokenObtainPairSerializer, ProfileUpdateSerializer 
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils.http import urlsafe_base64_decode
from .tokens import OneDayActivationTokenGenerator



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
            return Response({'error': 'Invalid email or password'}, status=status.HTTP_400_BAD_REQUEST)

        response = super().post(request, *args, **kwargs)
        return response
        
class ProfileUpdateView(generics.UpdateAPIView):
    serializer_class = ProfileUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, created = Profile.objects.get_or_create(user=self.request.user)
        return profile
    
    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            print("Update error", str(e))
            return Response({
                "error": "Profile update failed"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
def get_csrf_token(request):
    return JsonResponse({ "csrftoken": get_token(request)})

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