from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_pushsubscription"),
    ]

    operations = [
        migrations.CreateModel(
            name="DirectConversation",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("pair_key", models.CharField(max_length=80, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("last_message_at", models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                ("user_one", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="direct_conversations_started", to=settings.AUTH_USER_MODEL)),
                ("user_two", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="direct_conversations_received", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-last_message_at", "-updated_at"],
            },
        ),
        migrations.CreateModel(
            name="DirectMessage",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("body", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("read_at", models.DateTimeField(blank=True, null=True)),
                ("conversation", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="messages", to="accounts.directconversation")),
                ("sender", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="direct_messages_sent", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["created_at"],
            },
        ),
    ]
