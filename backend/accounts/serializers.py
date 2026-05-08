from rest_framework import serializers
from .models import UserAccount, DirectConversation, DirectMessage
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import ValidationError
from django.contrib.auth import get_user_model
from .models import Profile
from djoser.serializers import UserCreateSerializer
import logging

logger = logging.getLogger(__name__)

user = get_user_model()

class UserCreateSerializer(UserCreateSerializer):
  class Meta:
    model = UserAccount
    fields = ('id', 'first_name', 'last_name', 'email', 'username',
              'password', 'is_active', 'date_joined')
    extra_kwargs = { 'password': {'write_only': True}}
  
  def create(self, validated_data):
    try:
      return UserAccount.objects.create_user(**validated_data)
    except Exception as e:
      if 'unique' in str(e):
        raise serializers.ValidationError({'username': 'This username has been taken.'})
      raise serializers.ValidationError(str(e))
  
class ProfileSerializer(serializers.ModelSerializer):
  class Meta:
    model = Profile
    fields = ['avatar', 'bio', 'birth_date', 'followers']
    read_only_fields = ["followers"]
    extra_kwargs = {
      'avatar': {'required': False, 'allow_blank': True }
    }

class PublicProfileSerializer(serializers.ModelSerializer):
  class Meta:
    model = Profile
    fields = ['avatar', 'bio', 'followers']
    read_only_fields = ['avatar', 'bio', 'followers']

class UserDetailSerializer(serializers.ModelSerializer):
  profile = ProfileSerializer(read_only=True)

  class Meta:
    model = UserAccount
    fields = ('id', 'email', 
              'first_name',
              'last_name', 'username','is_active', 
              'is_deactivated', 'date_joined', 'profile'
            )

class UserPublicSerializer(serializers.ModelSerializer):
  profile = PublicProfileSerializer(read_only=True)

  class Meta:
    model = UserAccount
    fields = ('id', 'username', 'first_name', 'last_name', 'profile')
                
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username_or_email = attrs.get("email")
        password = attrs.get("password")

        try:
           user_obj = UserAccount.objects.get(email=username_or_email)
        except UserAccount.DoesNotExist:
           raise serializers.ValidationError({"email": "No user with this email or username exists."})
        
        if not user_obj.check_password(password):
           raise serializers.ValidationError({
              "password": "Incorrect password."
           })
        
        data = super().validate(attrs)

        obj = self.user

        data.update({
            'id': obj.id,
            'first_name': obj.first_name,
            'last_name': obj.last_name, 
            'email': obj.email,
            'username': obj.username,
            'is_active': obj.is_active,
            'is_deactivated': obj.is_deactivated,
            'date_joined': obj.date_joined,
        })

        return data


class UserUpdateSerializer(serializers.ModelSerializer):
  bio = serializers.CharField(source="profile.bio", required=False, allow_blank=True)
  avatar = serializers.URLField(source="profile.avatar", required=False, allow_blank=True)

  class Meta:
    model = UserAccount
    fields = ["first_name", "last_name", "username", "bio", "avatar"]
  
  def update(self, instance, validated_data):
    # Extract profile data from source mapping
    profile_data = {}
    if "profile" in validated_data:
        profile_data = validated_data.pop("profile")

    # Update UserAccount fields
    for attr, value in validated_data.items():
      setattr(instance, attr, value)
    instance.save()

    # Update Profile fields
    profile = instance.profile
    for attr, value in profile_data.items():
      setattr(profile, attr, value)
    profile.save()

    return instance
    
class UserDeleteSerializer(serializers.ModelSerializer):
  class Meta:
    model = UserAccount
    fields = ['id']
    
  def delete(self, validated_data):
    user = UserAccount.objects.get(id=validated_data['id'])
    user.delete()
    return user


class DirectMessageSerializer(serializers.ModelSerializer):
  sender = UserPublicSerializer(read_only=True)
  is_own = serializers.SerializerMethodField()

  class Meta:
    model = DirectMessage
    fields = ["id", "sender", "body", "created_at", "read_at", "is_own"]
    read_only_fields = ["id", "sender", "created_at", "read_at", "is_own"]

  def get_is_own(self, obj):
    request = self.context.get("request")
    return bool(request and request.user.is_authenticated and obj.sender_id == request.user.id)


class DirectConversationSerializer(serializers.ModelSerializer):
  other_user = serializers.SerializerMethodField()
  last_message = serializers.SerializerMethodField()
  last_message_at = serializers.DateTimeField(read_only=True)

  class Meta:
    model = DirectConversation
    fields = ["id", "other_user", "last_message", "last_message_at", "created_at"]
    read_only_fields = ["id", "other_user", "last_message", "last_message_at", "created_at"]

  def get_other_user(self, obj):
    request = self.context.get("request")
    if not request or not request.user.is_authenticated:
      return None

    other_user = obj.user_two if obj.user_one_id == request.user.id else obj.user_one
    return UserPublicSerializer(other_user, context=self.context).data

  def get_last_message(self, obj):
    message = getattr(obj, "_prefetched_last_message", None)
    if message is None:
      message = obj.messages.select_related("sender", "sender__profile").order_by("-created_at").first()
    if not message:
      return None
    return DirectMessageSerializer(message, context=self.context).data
