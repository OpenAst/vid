import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

app = Celery("backend")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.beat_schedule = {
    "cleanup-multipart-uploads-every-5-hours": {
        "task": "backend.tasks.cleanup_multipart_uploads",
        "schedule": crontab(minute=0, hour="*/5"),
    },
}

@app.on_after_configure.connect
def run_cleanup_after_startup(sender, **kwargs):
    sender.send_task("backend.tasks.cleanup_multipart_uploads")
