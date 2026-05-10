from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0015_directmessage_reply_to"),
    ]

    operations = [
        migrations.AddField(
            model_name="directmessage",
            name="audio_transcript",
            field=models.TextField(blank=True, default=""),
        ),
    ]
