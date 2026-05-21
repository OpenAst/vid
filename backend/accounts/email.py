from urllib.parse import urlparse
import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone
from djoser.email import ActivationEmail

from backend.tasks import send_rendered_email

logger = logging.getLogger(__name__)

class CustomActivationEmail(ActivationEmail):
  def get_context_data(self):
    context = super().get_context_data()
    parsed_frontend = urlparse(settings.PRIMARY_FRONTEND_URL)
    context["domain"] = parsed_frontend.netloc or parsed_frontend.path
    context["protocol"] = parsed_frontend.scheme or "https"
    context["site_name"] = settings.DJOSER.get("SITE_NAME", "OneClyq")
    return context

  def send(self, to, fail_silently=False, **kwargs):
    self.render()

    from_email = kwargs.pop("from_email", settings.DEFAULT_FROM_EMAIL)
    alternatives = list(getattr(self, "alternatives", []))

    user = self.context.get("user") if hasattr(self, "context") else None
    if user and getattr(user, "pk", None):
      type(user).objects.filter(pk=user.pk).update(activation_email_sent_at=timezone.now())

    recipients = [to] if isinstance(to, str) else list(to)

    try:
      send_rendered_email.delay(
        self.subject,
        self.body,
        from_email,
        recipients,
        alternatives,
      )
      return
    except Exception:
      logger.exception("Unable to queue activation email task")

    if not getattr(settings, "EMAIL_SYNC_FALLBACK_ENABLED", False):
      return

    try:
      message = EmailMultiAlternatives(
        subject=self.subject,
        body=self.body,
        from_email=from_email,
        to=recipients,
      )
      for content, mimetype in alternatives:
        message.attach_alternative(content, mimetype)
      message.send(fail_silently=fail_silently)
    except Exception:
      logger.exception("Unable to send activation email synchronously")
      if not fail_silently:
        raise
  
