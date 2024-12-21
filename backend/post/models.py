from django.db import models
from accounts.models import UserAccount

class Post(models.Model):
  user = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name='posts')
  content = models.TextField()
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)
  is_public = models.BooleanField(default=True)
  likes_count = models.PositiveBigIntegerField(default=0)
  comments_count = models.PositiveBigIntegerField(default=0)

  def __str__(self):
    return f'{self.user.first_name}: {self.created_at}'
