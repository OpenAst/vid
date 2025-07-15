from rest_framework import serializers
from .models import Video, Comment, VideoLike, CommentLike
from django.conf import settings

class VideoSerializer(serializers.ModelSerializer):
  uploader = serializers.StringRelatedField(read_only=True)
  timestamp = serializers.SerializerMethodField()
  file_url = serializers.URLField(max_length=500, required=True)
  like_count = serializers.IntegerField(read_only=True)
  has_liked = serializers.SerializerMethodField()
  thumbnail_url = serializers.URLField(max_length=500, required=False, allow_null=True)

  def get_file_url(self, obj):
    request = self.context.get('request')
    if obj.file:
      return request.build_absolute_uri(obj.file.url)
    
    return None
  
  def get_like_count(self, obj):
     return obj.likes.count()
  
  class Meta:
    model = Video
    fields = ['uploader', 'timestamp', 'file_url', 
               "like_count", 'views', 'id',
              'created_at', 'thumbnail_url', 'description', 'title', 
              "has_liked"]
    
    read_only_fields = ['id', 'views', 'timestamp', 'uploader', 'created_at']
  
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
