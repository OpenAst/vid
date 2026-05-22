from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0023_directmessagedeleteforme"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="directmessage",
            index=models.Index(fields=["conversation", "-created_at"], name="dm_conv_created_desc_idx"),
        ),
        migrations.AddIndex(
            model_name="directmessage",
            index=models.Index(fields=["conversation", "read_at"], name="dm_conv_read_idx"),
        ),
        migrations.AddIndex(
            model_name="directmessage",
            index=models.Index(fields=["sender", "read_at"], name="dm_sender_read_idx"),
        ),
    ]
