from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("video", "0007_savedvideo"),
    ]

    operations = [
        migrations.CreateModel(
            name="SavedCollection",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=80)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="saved_collections", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "unique_together": {("user", "name")},
            },
        ),
        migrations.CreateModel(
            name="SavedCollectionItem",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "collection",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="video.savedcollection"),
                ),
                (
                    "saved_video",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="collection_items", to="video.savedvideo"),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "unique_together": {("collection", "saved_video")},
            },
        ),
    ]
