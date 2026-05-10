from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0009_profile_private_block_report"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="membership_tiers",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
