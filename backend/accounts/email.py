from urllib.parse import urlparse

from django.conf import settings
from djoser.email import ActivationEmail

class CustomActivationEmail(ActivationEmail):
  def get_context_data(self):
    context = super().get_context_data()
    parsed_frontend = urlparse(settings.PRIMARY_FRONTEND_URL)
    context["domain"] = parsed_frontend.netloc or parsed_frontend.path
    context["protocol"] = parsed_frontend.scheme or "https"
    context["site_name"] = settings.DJOSER.get("SITE_NAME", "OneClyq")
    return context
  
