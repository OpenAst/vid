from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0014_directmessage_voice_note"),
    ]

    operations = [
        migrations.AddField(
            model_name="directmessage",
            name="reply_to",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="replies",
                to="accounts.directmessage",
            ),
        ),
    ]
