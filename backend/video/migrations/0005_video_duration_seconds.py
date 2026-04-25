from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("video", "0004_video_skill_category"),
    ]

    operations = [
        migrations.AddField(
            model_name="video",
            name="duration_seconds",
            field=models.PositiveIntegerField(blank=True, db_index=True, null=True),
        ),
    ]
