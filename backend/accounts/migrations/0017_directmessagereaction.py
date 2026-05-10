from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0016_directmessage_audio_transcript"),
    ]

    operations = [
        migrations.CreateModel(
            name="DirectMessageReaction",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("reaction", models.CharField(choices=[("heart", "Heart"), ("laugh", "Laugh"), ("fire", "Fire"), ("clap", "Clap"), ("sad", "Sad")], max_length=16)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("message", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reactions", to="accounts.directmessage")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="direct_message_reactions", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["created_at"],
                "unique_together": {("message", "user")},
            },
        ),
    ]
