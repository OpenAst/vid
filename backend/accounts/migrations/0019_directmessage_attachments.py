from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0018_alter_profile_featured_video"),
    ]

    operations = [
        migrations.AddField(
            model_name="directmessage",
            name="attachment_name",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="directmessage",
            name="attachment_size",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="directmessage",
            name="attachment_type",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="directmessage",
            name="attachment_url",
            field=models.URLField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="directmessage",
            name="message_type",
            field=models.CharField(
                choices=[
                    ("text", "Text"),
                    ("voice", "Voice note"),
                    ("image", "Image"),
                    ("file", "File"),
                ],
                default="text",
                max_length=16,
            ),
        ),
    ]
