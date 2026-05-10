from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("video", "0006_video_skill_category"),
    ]

    operations = [
        migrations.CreateModel(
            name="SavedVideo",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="saved_videos", to=settings.AUTH_USER_MODEL),
                ),
                (
                    "video",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="saved_by", to="video.video"),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "unique_together": {("user", "video")},
            },
        ),
    ]
