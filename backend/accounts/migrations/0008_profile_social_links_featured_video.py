from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0007_profile_onboarding_flags"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="featured_video",
            field=models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, related_name='featured_in_profiles', to='video.video'),
        ),
        migrations.AddField(
            model_name="profile",
            name="website_url",
            field=models.URLField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="profile",
            name="twitter_url",
            field=models.URLField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="profile",
            name="linkedin_url",
            field=models.URLField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="profile",
            name="open_to_collab",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="profile",
            name="open_to_hire",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="profile",
            name="open_to_mentor",
            field=models.BooleanField(default=False),
        ),
    ]
