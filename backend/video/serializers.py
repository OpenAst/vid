from rest_framework import serializers
from .models import Video, Comment
from django.conf import settings

class VideoSerializer(serializers.ModelSerializer):
  uploader = serializers.CharField(source='user.username', read_only=True)
  timestamp = serializers.SerializerMethodField()
  file_url = serializers.SerializerMethodField()

  def get_file_url(self, obj):
    request = self.context.get('request')
    if obj.file:
      return request.build_absolute_uri(obj.file.url)
    
    return None
  
  class Meta:
    model = Video
    fields = '__all__'
    read_only_fields = ['id', 'views', 'timestamp', 'uploader']
  
  def get_timestamp(self, obj):
    return obj.created_at.strftime('%b %d, %Y')
  
  def create(self, validated_data):
    validated_data['uploader'] = self.context["request"].user
    return super().create(validated_data)
  
class CommentSerializer(serializers.ModelSerializer):
  user = serializers.StringRelatedField(read_only=True)

  class Meta:
    model = Comment
    fields = ['id', 'video', 'user', 'content', 'created_at']
    read_only_fields = ['user', 'created_at']