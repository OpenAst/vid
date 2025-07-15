from django.db import models
from accounts.models import UserAccount
from django.contrib.auth import get_user_model
from django.conf import settings
from accounts.models import UserAccount
from typing import TYPE_CHECKING


class Video(models.Model):
  uploader = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name="videos")
  title = models.CharField(max_length=255)
  description = models.TextField(blank=True)
  file_key = models.CharField(max_length=255)
  thumbnail_key = models.CharField(max_lenth=255, blank=True, null=True)
  created_at = models.DateTimeField(auto_now_add=True)
  views = models.PositiveIntegerField(default=0)

  def __str__(self):
    return self.title
  
  def get_timestamp(self):
    return self.created_at.strftime("%b %d, %Y")
  
  def to_dict(self):
    return {
      "id": self.id,
      "title": self.title,
      'file': self.file_url,
      "description": self.description,
      "thumbnail": self.thumbnail_url,
      "uploader": self.uploader.username,
      "views": self.views,
      "timestamp": self.get_timestamp(),
    }
  @property
  def thumbnail_url(self):
    if self.thumbnail_key:
      return f"{settings.MEDIA_URL}{self.thumbnail_key}"
    return None
  
  @property
  def file_url(self):
    return f"{settings.MEDIA_URL}{self.file_key}"

  @property
  def comment_count(self):
    return self.comments.count()
  

if TYPE_CHECKING:
   from .models import Video

class Comment(models.Model):
  video = models.ForeignKey('Video', related_name='comments', on_delete=models.CASCADE)
  user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
  content = models.TextField()
  created_at = models.DateTimeField(auto_now_add=True)

  def __str__(self):
    return f"Comment by {self.user} on {self.video}"

class VideoLike(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name="likes")
    user = models.ForeignKey(UserAccount, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('video', 'user')

class CommentLike(models.Model):
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name="likes")
    user = models.ForeignKey(UserAccount, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('comment', 'user')