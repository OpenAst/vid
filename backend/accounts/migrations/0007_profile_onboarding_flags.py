from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0006_profile_skill_tags_availability_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="onboarding_completed",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="profile",
            name="skipped_profile_setup",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="profile",
            name="skipped_interests",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="profile",
            name="skipped_follow_suggestions",
            field=models.BooleanField(default=False),
        ),
    ]
