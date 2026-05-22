import logging
import threading
from urllib.parse import urljoin

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def notify_realtime_server(event_type, payload, timeout=2):
    if not settings.REALTIME_SERVER_INTERNAL_URL or not settings.REALTIME_INTERNAL_SECRET:
        return

    endpoint = urljoin(settings.REALTIME_SERVER_INTERNAL_URL.rstrip("/") + "/", "internal/events")

    try:
        requests.post(
            endpoint,
            json={"type": event_type, **payload},
            headers={"Authorization": f"Bearer {settings.REALTIME_INTERNAL_SECRET}"},
            timeout=timeout,
        )
    except requests.RequestException:
        logger.exception("Failed to notify realtime server")


def notify_realtime_server_async(event_type, payload):
    thread = threading.Thread(
        target=notify_realtime_server,
        args=(event_type, payload),
        daemon=True,
    )
    thread.start()


def emit_notification_created(notification_id):
    from .models import Notification
    from .serializers import NotificationSerializer

    try:
        notification = (
            Notification.objects
            .select_related("actor", "actor__profile", "recipient")
            .get(pk=notification_id)
        )
    except Notification.DoesNotExist:
        return

    unread_count = Notification.objects.filter(
        recipient=notification.recipient,
        is_read=False,
    ).count()

    notify_realtime_server_async(
        "notifications:new",
        {
            "recipientId": str(notification.recipient_id),
            "unreadCount": unread_count,
            "notification": NotificationSerializer(notification).data,
        },
    )


def emit_notifications_read(user_id, unread_count):
    notify_realtime_server_async(
        "notifications:read",
        {
            "recipientId": str(user_id),
            "unreadCount": unread_count,
        },
    )
