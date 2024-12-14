from rest_framework import serializers
from .models import UserAccount
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import ValidationError
from django.contrib.auth import get_user_model
from rest_framework import serializers

user = get_user_model()

class UserCreateSerializer(serializers.ModelSerializer):
  class Meta:
    model = UserAccount
    fields = ('id', 'first_name', 'last_name', 'email', 
              'password', 'is_active', 'date_joined')
    extra_kwargs = { 'password': {'write_only': True}}
    
  
    
class UserDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAccount
        fields = ('id', 'email', 
                  'first_name', 'last_name', 
                  'is_active', 'is_deactivated', 'date_joined')
    
class UserDeleteSerializer(serializers.ModelSerializer):
  class Meta:
    model = UserAccount
    fields = ['id']
    
  def delete(self, validated_data):
    user = UserAccount.objects.get(id=validated_data['id'])
    user.delete()
    return user
      
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        obj = self.user

        data.update({
            'id': obj.id,
            'first_name': obj.first_name,
            'last_name': obj.last_name, 
            'email': obj.email,
            'is_active': obj.is_active,
            'is_deactivated': obj.is_deactivated,
            'date_joined': obj.date_joined,
        })

        return data
      