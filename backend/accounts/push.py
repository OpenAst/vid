import json
import logging

from django.conf import settings

from .models import PushSubscription

logger = logging.getLogger(__name__)

try:
    from pywebpush import WebPushException, webpush
except Exception:  # pragma: no cover - dependency may be unavailable in some dev shells
    webpush = None
    WebPushException = Exception


def push_notifications_enabled():
    return all(
        [
            webpush,
            settings.WEB_PUSH_VAPID_PUBLIC_KEY,
            settings.WEB_PUSH_VAPID_PRIVATE_KEY,
            settings.WEB_PUSH_VAPID_SUBJECT,
        ]
    )


def send_call_push_notification(subscription: PushSubscription, payload: dict):
    if not push_notifications_enabled():
        return False

    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh,
                    "auth": subscription.auth,
                },
            },
            data=json.dumps(payload),
            vapid_private_key=settings.WEB_PUSH_VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.WEB_PUSH_VAPID_SUBJECT},
        )
        return True
    except WebPushException as error:
        status_code = getattr(getattr(error, "response", None), "status_code", None)
        logger.warning("Push notification failed for %s: %s", subscription.user_id, error)
        if status_code in {404, 410}:
            subscription.delete()
        return False
