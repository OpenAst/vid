from django.core.management.base import BaseCommand
from django.contrib.sites.models import Site

class Command(BaseCommand):
  help = "Create or updates the default site domain"

  def handle(self, *args, **options):
    domain = "oneclyq.com"
    name = "Prod Site"
    site, created = Site.objects.update_or_create(
      id=1,
      defaults={"domain": domain, "name": name},
    )

    if created:
      self.stdout.write(self.style.SUCCESS(f"Site created: {domain}"))
    else:
      self.stdout.write(self.style.SUCCESS(f"Site updated: {domain}"))