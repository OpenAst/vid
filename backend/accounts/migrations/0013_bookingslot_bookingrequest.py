from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0012_collabapplication"),
    ]

    operations = [
        migrations.CreateModel(
            name="BookingSlot",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("starts_at", models.DateTimeField(db_index=True)),
                ("duration_minutes", models.PositiveIntegerField(default=30)),
                ("purpose", models.CharField(choices=[("collab", "Collab call"), ("mentor", "Mentorship"), ("consult", "Consult")], default="collab", max_length=24)),
                ("note", models.CharField(blank=True, default="", max_length=160)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("creator", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="booking_slots", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["starts_at"]},
        ),
        migrations.CreateModel(
            name="BookingRequest",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("message", models.TextField(blank=True, default="")),
                ("status", models.CharField(choices=[("pending", "Pending"), ("accepted", "Accepted"), ("declined", "Declined")], db_index=True, default="pending", max_length=24)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("requester", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="booking_requests", to=settings.AUTH_USER_MODEL)),
                ("slot", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="booking_requests", to="accounts.bookingslot")),
            ],
            options={"ordering": ["-created_at"], "unique_together": {("slot", "requester")}},
        ),
    ]
