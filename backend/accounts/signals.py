from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import UserAccount, Profile
from django.contrib.auth import get_user_model
from django.db.models.signals import post_migrate


@receiver(post_save, sender=UserAccount)
def create_profile(sender, instance, created,  **kwargs):
  if created:
    Profile.objects.create(user=instance)

@receiver(post_save, sender=UserAccount)
def save_profile(sender, instance, **kwargs):
  instance.profile.save()    


@receiver(post_migrate)
def create_admin_user(sender, **kwargs):
    User = get_user_model()
    if not User.objects.filter(username="admin").exists():
        User.objects.create_superuser("admin", "twiterfarm@gmail.com", "Root!234")
