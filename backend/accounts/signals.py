from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import UserAccount, Profile
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
    if not UserAccount.objects.filter(email="twiterfarm@gmail.com").exists():
        UserAccount.objects.create_superuser( email="twiterfarm@gmail.com", password="Root!234")

