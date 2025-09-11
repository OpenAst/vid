from django.core.management.base import BaseCommand
from accounts.models import UserAccount
from django.utils.text import slugify

class Command(BaseCommand):
    help = "Autofill missing usernames for users without one"

    def handle(self, *args, **kwargs):
        users = UserAccount.objects.filter(username__isnull=True) | UserAccount.objects.filter(username__exact="")
        count = 0

        for user in users:
            base_username = slugify(user.first_name or user.email.split('@')[0])
            new_username = base_username
            i = 1

            # Ensure uniqueness
            while UserAccount.objects.filter(username=new_username).exists():
                new_username = f"{base_username}{i}"
                i += 1

            user.username = new_username
            user.save()
            count += 1
            self.stdout.write(self.style.SUCCESS(f"Updated user {user.email} → {new_username}"))

        if count == 0:
            self.stdout.write(self.style.WARNING("No users needed updating."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Successfully updated {count} users."))
