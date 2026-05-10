from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0011_collabrequest"),
    ]

    operations = [
        migrations.CreateModel(
            name="CollabApplication",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("pitch", models.TextField(blank=True, default="")),
                ("status", models.CharField(choices=[("submitted", "Submitted"), ("shortlisted", "Shortlisted"), ("accepted", "Accepted"), ("declined", "Declined")], db_index=True, default="submitted", max_length=24)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("applicant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="collab_applications", to=settings.AUTH_USER_MODEL)),
                ("request", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="applications", to="accounts.collabrequest")),
            ],
            options={
                "ordering": ["-created_at"],
                "unique_together": {("request", "applicant")},
            },
        ),
    ]
