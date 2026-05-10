from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("video", "0008_savedcollection_savedcollectionitem"),
    ]

    operations = [
        migrations.CreateModel(
            name="VideoWatchProgress",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("progress_seconds", models.FloatField(default=0)),
                ("duration_seconds", models.FloatField(default=0)),
                ("completed", models.BooleanField(default=False)),
                ("updated_at", models.DateTimeField(auto_now=True, db_index=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="watch_progress", to=settings.AUTH_USER_MODEL),
                ),
                (
                    "video",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="watch_progress", to="video.video"),
                ),
            ],
            options={
                "ordering": ["-updated_at"],
                "unique_together": {("user", "video")},
            },
        ),
    ]
