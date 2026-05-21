from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0022_directmessage_deleted_for_everyone"),
    ]

    operations = [
        migrations.CreateModel(
            name="DirectMessageDeleteForMe",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("deleted_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("message", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="delete_for_me_records", to="accounts.directmessage")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="direct_message_delete_for_me_records", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "unique_together": {("message", "user")},
            },
        ),
        migrations.AddIndex(
            model_name="directmessagedeleteforme",
            index=models.Index(fields=["user", "deleted_at"], name="accounts_di_user_id_099c0f_idx"),
        ),
    ]
