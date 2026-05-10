from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0013_bookingslot_bookingrequest"),
    ]

    operations = [
        migrations.AlterField(
            model_name="directmessage",
            name="body",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="directmessage",
            name="message_type",
            field=models.CharField(
                choices=[("text", "Text"), ("voice", "Voice note")],
                default="text",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="directmessage",
            name="audio_url",
            field=models.URLField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="directmessage",
            name="audio_duration_ms",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
