from rest_framework import serializers
from .models import UserAccount
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import ValidationError
from django.contrib.auth import get_user_model
from .models import Profile
import logging

logger = logging.getLogger(__name__)

user = get_user_model()

class UserCreateSerializer(serializers.ModelSerializer):
  class Meta:
    model = UserAccount
    fields = ('id', 'first_name', 'last_name', 'email', 'username',
              'password', 'is_active', 'date_joined')
    extra_kwargs = { 'password': {'write_only': True}}
  
  def create(self, validated_data):
    return UserAccount.objects.create_user(**validated_data)
  
    
class UserDetailSerializer(serializers.ModelSerializer):
  avatar = serializers.URLField(source="profile.avatar", read_only=True, allow_blank=True)
  bio = serializers.CharField(source="profile.bio", read_only=True, allow_blank=True)
  birth_date = serializers.DateField(source="profile.birth_date", read_only=True)
  followers = serializers.IntegerField(source="profile.followers", read_only=True)

  class Meta:
      model = UserAccount
      fields = ('id', 'email', 
                'first_name', 'last_name', 'username',
                'is_active', 'is_deactivated', 'date_joined',
                'avatar', 'bio', 'birth_date', 'followers')
                
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


class UserProfileUpdateSerializer(serializers.ModelSerializer):
  bio = serializers.CharField(source="profile.bio", required=False, allow_blank=True)
  avatar = serializers.URLField(source="profile.avatar", required=False, allow_blank=True)

  class Meta:
    model = UserAccount
    fields = ["first_name", "last_name", "username", "bio", "avatar"]

  def update(self, instance, validated_data):
    print("Incoming validated_data:", validated_data)
    logger.debug("Incoming validated_data: %s", validated_data)

    profile_data = validated_data.pop("profile", {})

    instance.first_name = validated_data.get("first_name", instance.first_name)
    instance.last_name = validated_data.get("last_name", instance.last_name)
    instance.username = validated_data.get("username", instance.username)
    instance.save()

    if profile_data:
      profile = instance.profile
      profile.bio = profile_data.get("bio", profile.bio)
      profile.avatar = profile_data.get("avatar", profile.avatar)
      profile.save()

    response_data = UserProfileUpdateSerializer(instance).data
    
    print("Updated UserProfile response:", response_data)

    logger.debug("Updated UserProfile response: %s", response_data)

    return instance


class PublicProfileSerializer(serializers.ModelSerializer):
  first_name = serializers.CharField(source="user.first_name")
  last_name = serializers.CharField(source="user.last_name")
  username = serializers.CharField(source="user.username")

  class Meta:
    model = user
    fields = ("id", "username", "first_name", "last_name", "avatar", "bio", 'followers')
  
class UserDeleteSerializer(serializers.ModelSerializer):
  class Meta:
    model = UserAccount
    fields = ['id']
    
  def delete(self, validated_data):
    user = UserAccount.objects.get(id=validated_data['id'])
    user.delete()
    return user
      