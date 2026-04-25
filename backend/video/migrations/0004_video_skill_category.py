from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("video", "0003_videoview"),
    ]

    operations = [
        migrations.AddField(
            model_name="video",
            name="skill_category",
            field=models.CharField(
                blank=True,
                choices=[
                    ("beginner", "Beginner"),
                    ("trades", "Skilled Trades"),
                    ("coding", "Tech Skills"),
                    ("business", "Business"),
                    ("design", "Design"),
                    ("other", "Other"),
                ],
                db_index=True,
                default="",
                max_length=32,
            ),
        ),
    ]
