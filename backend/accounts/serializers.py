from rest_framework import serializers
from .models import UserAccount

class UserCreateSerializer(serializers.ModelSerializer):
  class Meta:
    model = UserAccount
    fields = ('id', 'first_name', 'last_name', 'username', 'email', 'password')
    extra_kwargs = { 'password': {'write_only': True}}
    
  
    
class UserDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAccount
        fields = ('id', 'username', 'email', 'first_name', 'last_name')
    
class UserDeleteSerializer(serializers.ModelSerializer):
  class Meta:
    model = UserAccount
    fields = ['id']
    
  def delete(self, validated_data):
    user = UserAccount.objects.get(id=validated_data['id'])
    user.delete()
    return user
      