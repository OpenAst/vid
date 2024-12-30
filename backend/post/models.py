from django.db import models
from accounts.models import UserAccount
from django.urls import reverse
from django.utils.text import slugify

class Post(models.Model):
  user = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name='posts')
  content = models.TextField()
  title = models.CharField()
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)
  is_public = models.BooleanField(default=True)
  likes_count = models.PositiveBigIntegerField(default=0)
  comments_count = models.PositiveBigIntegerField(default=0)
  slug = models.SlugField(unique=True, blank=True)

  def __str__(self):
    return f'{self.user.first_name}: {self.created_at}'
  
  def save(self, *args, **kwargs):
    if not self.slug:
      self.slug = slugify(self.title)

      unique_slug = self.slug
      num = 1
      while Post.objects.filter(slug=unique_slug).exists():
        unique_slug = f"{self.slug}-{num}"
        num += 1
      self.slug = unique_slug
    super().save(*args, **kwargs)

  def get_absolute_url(self):
    return reverse('post-detail', kwargs={'slug: self.slug'})      