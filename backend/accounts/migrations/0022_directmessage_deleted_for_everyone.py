from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0021_directmessage_deleted_for"),
    ]

    operations = [
        migrations.AddField(
            model_name="directmessage",
            name="is_deleted_for_everyone",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="directmessage",
            name="deleted_for_everyone_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
