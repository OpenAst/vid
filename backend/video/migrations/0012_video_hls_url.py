from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("video", "0011_video_media_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="video",
            name="hls_url",
            field=models.URLField(blank=True, max_length=1000, null=True),
        ),
    ]
