from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0019_directmessage_attachments"),
    ]

    operations = [
        migrations.AddField(
            model_name="useraccount",
            name="activation_email_sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
