from django.db import models
from accounts.models import UserAccount
from django.contrib.auth import get_user_model



class Video(models.Model):
  uploader = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name="videos")
  title = models.CharField(max_length=255)
  description = models.TextField(blank=True)
  file = models.FileField(upload_to='videos/')
  thumbnail = models.ImageField(upload_to='thumbnails/', blank=True, null=True)
  created_at = models.DateTimeField(auto_now_add=True)
  views = models.IntegerField(default=0)

  def __str__(self):
    return self.title
  
  def get_timestamp(self):
    return self.created_at.strftime("%b %d, %Y")
  
  def to_dict(self):
    return {
      "id": self.id,
      "title": self.title,
      'fiel': self.file,
      "description": self.description,
      "thumbnail": self.thumbnail.url,
      "uploader": self.uploader.username,
      "views": self.views,
      "timestamp": self.get_timestamp(),
    }