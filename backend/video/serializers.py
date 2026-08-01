from rest_framework import serializers
from .models import Video, Comment, VideoVote, CommentVote, Call, SavedVideo, VideoWatchProgress
from django.conf import settings
from accounts.models import UserAccount
from accounts.serializers import UserDetailSerializer
from urllib.parse import quote


class UserPublicSerializer(serializers.ModelSerializer):
  class Meta:
    model = UserAccount
    fields = ['id', 'email', 'username', 'first_name', 'last_name']


class CallSerializer(serializers.ModelSerializer):
  caller = UserPublicSerializer(read_only=True)
  callee = UserPublicSerializer(read_only=True)

  class Meta:
    model = Call
    fields = ['id', 'caller', 'callee', 'call_type', 'status', 'started_at', 'ended_at', 'created_at']
    read_only_fields = ['id', 'caller', 'callee', 'status', 'started_at', 'ended_at', 'created_at']

class VideoSerializer(serializers.ModelSerializer):
  uploader = UserPublicSerializer(read_only=True)
  timestamp = serializers.SerializerMethodField()
  likes = serializers.SerializerMethodField(read_only=True)
  dislikes = serializers.SerializerMethodField()
  comments_count = serializers.SerializerMethodField()
  user_vote = serializers.SerializerMethodField()
  thumbnail_url = serializers.SerializerMethodField()
  is_saved = serializers.SerializerMethodField()
  watch_progress = serializers.SerializerMethodField()

  class Meta:
    model = Video
    fields = [
      'id', 'title', 'description', 'skill_category', 'media_type', 'thumbnail_url',
       'timestamp', 'file_url', 'hls_url', 'music_url', 'processing_status', 'uploader',
       "likes", "dislikes", "comments_count", "user_vote", "is_saved", "watch_progress", "views", "created_at"
    ]
    read_only_fields = ['id', 'views', 'timestamp', 'uploader', 'created_at', 'processing_status', 'is_saved', 'watch_progress']
  
  def validate_file_url(self, value):
    parsed = value.split('/')
    if parsed:
      parsed[-1] = quote(parsed[-1])
    return '/'.join(parsed)

  def get_thumbnail_url(self, obj):
    request = self.context.get('request')
    if obj.thumbnail:
      if obj.thumbnail.startswith(('http://', 'https://')):
        return obj.thumbnail
      return request.build_absolute_uri(obj.thumbnail)
    return None

  def get_likes(self, obj):
    return obj.votes.filter(value=1).count()

  def get_dislikes(self, obj):
    return obj.votes.filter(value=-1).count()

  def get_comments_count(self, obj):
    annotated_count = getattr(obj, "comment_count_value", None)
    if annotated_count is not None:
      return annotated_count
    return obj.comments.count()
  
  def get_timestamp(self, obj):
    return obj.created_at.strftime('%b %d, %Y')
  
    
  def get_user_vote(self, obj):
    request = self.context.get("request")
    if request and request.user.is_authenticated:
      vote = obj.votes.filter(user=request.user).first()
      return vote.value if vote else 0
    return 0

  def get_is_saved(self, obj):
    request = self.context.get("request")
    if request and request.user.is_authenticated:
      return SavedVideo.objects.filter(user=request.user, video=obj).exists()
    return False

  def get_watch_progress(self, obj):
    request = self.context.get("request")
    if request and request.user.is_authenticated:
      progress = VideoWatchProgress.objects.filter(user=request.user, video=obj).first()
      if progress:
        return {
          "progress_seconds": progress.progress_seconds,
          "duration_seconds": progress.duration_seconds,
          "completed": progress.completed,
          "updated_at": progress.updated_at.isoformat(),
        }
    return None
  
class CommentSerializer(serializers.ModelSerializer):
  user = UserDetailSerializer(read_only=True)
  likes = serializers.SerializerMethodField()
  dislikes = serializers.SerializerMethodField()
  user_vote = serializers.SerializerMethodField()

  class Meta:
    model = Comment
    fields = ['id', 'video', 'user', 'content', 
      'likes', 'dislikes', 'parent', 'user_vote', 'created_at', 'is_pinned'
    ]
    read_only_fields = ['user', 'created_at', 'is_pinned']

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
