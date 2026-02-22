import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.sites.models import Site
from django.conf import settings

# Determine expected domain based on environment
if settings.ENV == 'development':
    domain = 'localhost:3000'
    name = 'OneClyq Local'
else:
    domain = 'www.oneclyq.com'
    name = 'OneClyq'

site = Site.objects.get(pk=1)
site.domain = domain
site.name = name
site.save()

print(f"Updated Site ID 1 to: {site.domain} ({site.name})")
