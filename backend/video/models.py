from django.db import models
from django.contrib.auth import get_user_model
from django.conf import settings
from accounts.models import UserAccount
from uuid import uuid4

class Video(models.Model):
  MEDIA_TYPES = (
    ("video", "Video"),
    ("image", "Image"),
  )

  id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
  uploader = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name="videos")
  media_type = models.CharField(max_length=16, choices=MEDIA_TYPES, default="video", db_index=True)
  title = models.CharField(max_length=255)
  description = models.TextField(blank=True)
  skill_category = models.CharField(max_length=100, default="general")
  file_url = models.URLField(max_length=1000)
  hls_url = models.URLField(max_length=1000, blank=True, null=True)
  music_url = models.URLField(max_length=1000, blank=True, null=True)
  processing_status = models.CharField(max_length=32, default="ready")
  thumbnail = models.URLField(blank=True, null=True)
  created_at = models.DateTimeField(auto_now_add=True)
  views = models.IntegerField(default=0, db_index=True)



  def __str__(self):
    return self.title
  
  def get_timestamp(self):
    return self.created_at.strftime("%b %d, %Y")
  
  @property
  def comment_count(self):
    return self.comments.count()
  
class Comment(models.Model):
  id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
  video = models.ForeignKey('Video', db_index=True, related_name='comments', on_delete=models.CASCADE)
  user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments')
  content = models.TextField()
  created_at = models.DateTimeField(auto_now_add=True)
  parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="replies")
  is_pinned = models.BooleanField(default=False, db_index=True)

  def __str__(self):
    return f"Comment by {self.user} on {self.video}"

class VideoVote(models.Model):
  VOTE_CHOICES = (
    (1, "Like"),
    (-1, "Dislike")
  )
  id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
  video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name="votes")
  user = models.ForeignKey(UserAccount, on_delete=models.CASCADE)
  value = models.SmallIntegerField(choices=VOTE_CHOICES)
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
      unique_together = ('video', 'user')

class CommentVote(models.Model):
  VOTE_CHOICES = (
    (1, "Like"),
    (-1, "Dislike"),
  )
  id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
  comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name="votes")
  value = models.SmallIntegerField(choices=VOTE_CHOICES)
  user = models.ForeignKey(UserAccount, on_delete=models.CASCADE)
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    unique_together = ('comment', 'user')

class VideoView(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name="view_logs")
    user = models.ForeignKey(UserAccount, on_delete=models.SET_NULL, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    session_key = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"View of {self.video} by {self.user or self.ip_address}"


class VideoWatchProgress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="watch_progress")
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name="watch_progress")
    progress_seconds = models.FloatField(default=0)
    duration_seconds = models.FloatField(default=0)
    completed = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "video")
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.user} watched {self.video} to {self.progress_seconds}s"


class SavedVideo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_videos")
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name="saved_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "video")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} saved {self.video}"


class SavedCollection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_collections")
    name = models.CharField(max_length=80)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "name")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} collection for {self.user}"


class SavedCollectionItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    collection = models.ForeignKey(SavedCollection, on_delete=models.CASCADE, related_name="items")
    saved_video = models.ForeignKey(SavedVideo, on_delete=models.CASCADE, related_name="collection_items")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("collection", "saved_video")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.saved_video.video} in {self.collection.name}"


class Call(models.Model):
    CALL_TYPES = (
        ("audio", "Audio"),
        ("video", "Video"),
    )
    STATUSES = (
        ("ringing", "Ringing"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
        ("missed", "Missed"),
        ("ended", "Ended"),
    )

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    caller = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name="outgoing_calls")
    callee = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name="incoming_calls")
    call_type = models.CharField(max_length=16, choices=CALL_TYPES)
    status = models.CharField(max_length=16, choices=STATUSES, default="ringing")
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.call_type} call from {self.caller} to {self.callee}"
