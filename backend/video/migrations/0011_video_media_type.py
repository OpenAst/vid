from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("video", "0010_comment_is_pinned"),
    ]

    operations = [
        migrations.AddField(
            model_name="video",
            name="media_type",
            field=models.CharField(
                choices=[("video", "Video"), ("image", "Image")],
                db_index=True,
                default="video",
                max_length=16,
            ),
        ),
    ]
