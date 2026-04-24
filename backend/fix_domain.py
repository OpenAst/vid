import os
import django
from urllib.parse import urlparse

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.sites.models import Site
from django.conf import settings

parsed = urlparse(settings.PRIMARY_FRONTEND_URL)
domain = parsed.netloc or parsed.path
name = 'OneClyq Local' if settings.ENV == 'development' else 'OneClyq'

site = Site.objects.get(pk=1)
site.domain = domain
site.name = name
site.save()

print(f"Updated Site ID 1 to: {site.domain} ({site.name})")
