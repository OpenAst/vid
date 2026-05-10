from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0010_profile_membership_tiers"),
    ]

    operations = [
        migrations.CreateModel(
            name="CollabRequest",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("request_type", models.CharField(choices=[("collab", "Collaboration"), ("hire", "Paid work"), ("mentor", "Mentorship")], default="collab", max_length=24)),
                ("title", models.CharField(max_length=120)),
                ("description", models.TextField(blank=True, default="")),
                ("skills", models.CharField(blank=True, default="", max_length=255)),
                ("budget", models.CharField(blank=True, default="", max_length=80)),
                ("status", models.CharField(choices=[("open", "Open"), ("closed", "Closed")], db_index=True, default="open", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("creator", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="collab_requests", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
