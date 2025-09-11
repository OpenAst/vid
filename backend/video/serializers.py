from rest_framework import serializers
from .models import Video, Comment, VideoLike, CommentLike
from django.conf import settings
from accounts.models import UserAccount
from urllib.parse import quote


class UserPublicSerializer(serializers.ModelSerializer):
  class Meta:
    model = UserAccount
    fields = ['id', 'email', 'username', 'first_name', 'last_name']

class VideoSerializer(serializers.ModelSerializer):
  uploader = UserPublicSerializer(read_only=True)
  timestamp = serializers.SerializerMethodField()
  like_count = serializers.IntegerField(read_only=True)
  has_liked = serializers.SerializerMethodField()
  thumbnail_url = serializers.SerializerMethodField()

  class Meta:
    model = Video
    fields = [
      'id', 'title', 'description', 'thumbnail_url',
       'timestamp', 'file_url',  'uploader', "like_count", "has_liked"
    ]
    read_only_fields = ['id', 'views', 'timestamp', 'uploader', 'created_at']
  
  def validate_file_url(self, value):
    parsed = value.split('/')
    if parsed:
      parsed[-1] = quote(parsed[-1])
    return '/'.join(parsed)

  def get_thumbnail_url(self, obj):
    request = self.context.get('request')
    if obj.thumbnail:
      return request.build_absolute_uri(obj.thumbnail)
    return None

  def get_like_count(self, obj):
     return obj.likes.count()
  
  def get_timestamp(self, obj):
    return obj.created_at.strftime('%b %d, %Y')
  
    
  def get_has_liked(self, obj):
     request = self.context.get("request")
     if request and request.user.is_authenticated:
        return obj.likes.filter(id=request.user.id).exists()
     return False
  
class CommentSerializer(serializers.ModelSerializer):
  user = serializers.StringRelatedField(read_only=True)
  likes = serializers.SerializerMethodField()

  class Meta:
    model = Comment
    fields = ['id', 'video', 'user', 'content', 'likes', 'created_at']
    read_only_fields = ['user', 'created_at']

  def get_likes(self, obj):
     return obj.likes.count()

class VideoLikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoLike
        fields = ['id', 'video', 'user']
        read_only_fields = ['user']

class CommentLikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommentLike
        fields = ['id', 'comment', 'user']
        read_only_fields = ['user']
