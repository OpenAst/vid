from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0020_useraccount_activation_email_sent_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="directmessage",
            name="deleted_for",
            field=models.ManyToManyField(blank=True, related_name="hidden_direct_messages", to=settings.AUTH_USER_MODEL),
        ),
    ]
