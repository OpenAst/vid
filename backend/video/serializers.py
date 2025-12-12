from rest_framework import serializers
from .models import Video, Comment, VideoVote, CommentVote
from django.conf import settings
from accounts.models import UserAccount
from accounts.serializers import UserDetailSerializer
from urllib.parse import quote


class UserPublicSerializer(serializers.ModelSerializer):
  class Meta:
    model = UserAccount
    fields = ['id', 'email', 'username', 'first_name', 'last_name']

class VideoSerializer(serializers.ModelSerializer):
  uploader = UserPublicSerializer(read_only=True)
  timestamp = serializers.SerializerMethodField()
  likes = serializers.SerializerMethodField(read_only=True)
  dislikes = serializers.SerializerMethodField()
  user_vote = serializers.SerializerMethodField()
  thumbnail_url = serializers.SerializerMethodField()

  class Meta:
    model = Video
    fields = [
      'id', 'title', 'description', 'thumbnail_url',
       'timestamp', 'file_url',  'uploader', "likes", "dislikes", "user_vote"
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

  def get_likes(self, obj):
    return obj.votes.filter(value=1).count()

  def get_dislikes(self, obj):
    return obj.votes.filter(value=-1).count()
  
  def get_timestamp(self, obj):
    return obj.created_at.strftime('%b %d, %Y')
  
    
  def get_user_vote(self, obj):
    request = self.context.get("request")
    if request and request.user.is_authenticated:
      vote = obj.votes.filter(user=request.user).first()
      return vote.value if vote else 0
    return 0
  
class CommentSerializer(serializers.ModelSerializer):
  user = UserDetailSerializer(read_only=True)
  likes = serializers.SerializerMethodField()
  dislikes = serializers.SerializerMethodField()
  user_vote = serializers.SerializerMethodField()

  class Meta:
    model = Comment
    fields = ['id', 'video', 'user', 'content', 
      'likes', 'dislikes', 'parent', 'user_vote', 'created_at'
    ]
    read_only_fields = ['user', 'created_at']

  def get_likes(self, obj):
    return obj.votes.filter(value=1).count()
  
  def get_dislikes(self, obj):
    return obj.votes.filter(value=-1).count()

  def get_user_vote(self, obj):
    request = self.context.get("request")
    if request and request.user.is_authenticated:
      vote = obj.votes.filter(user=request.user).first()
      return vote.value if vote else 0
    return 0


class VideoVoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoVote
        fields = ['id', 'video', 'user']
        read_only_fields = ['user']

class CommentVoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommentVote
        fields = ['id', 'comment', 'user']
        read_only_fields = ['user']
