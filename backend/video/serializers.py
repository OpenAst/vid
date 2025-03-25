from rest_framework import serializers
from .models import Video
from django.conf import settings

class VideoSerializer(serializers.ModelSerializer):
  uploader = serializers.CharField(source='user.username', read_only=True)
  timestamp = serializers.SerializerMethodField()
  file_url = serializers.SerializerMethodField()

  def get_file_url(self, obj):
    return settings.MEDIA_URL + str(obj.file)
  
  class Meta:
    model = Video
    fields = '__all__'
    read_only_fields = ['id', 'views', 'timestamp', 'uploader']
  
  def get_timestamp(self, obj):
    return obj.created_at.strftime('%b %d, %Y')
  
  def create(self, validated_data):
    validated_data['uploader'] = self.context["request"].user
    return super().create(validated_data)