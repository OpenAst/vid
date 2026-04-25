from django.db import models
from django.contrib.auth import get_user_model
from django.conf import settings
from accounts.models import UserAccount
from uuid import uuid4

class Video(models.Model):
  SKILL_CATEGORIES = (
    ("beginner", "Beginner"),
    ("trades", "Skilled Trades"),
    ("coding", "Tech Skills"),
    ("business", "Business"),
    ("design", "Design"),
    ("other", "Other"),
  )

  id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
  uploader = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name="videos")
  title = models.CharField(max_length=255)
  description = models.TextField(blank=True)
  skill_category = models.CharField(max_length=32, choices=SKILL_CATEGORIES, blank=True, default="", db_index=True)
  duration_seconds = models.PositiveIntegerField(null=True, blank=True, db_index=True)
  file_url = models.URLField(max_length=1000)
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
