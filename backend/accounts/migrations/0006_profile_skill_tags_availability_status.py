from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0005_notification"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="availability_status",
            field=models.CharField(choices=[("available", "Available"), ("busy", "Busy"), ("offline", "Offline")], default="available", max_length=20),
        ),
        migrations.AddField(
            model_name="profile",
            name="skill_tags",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
