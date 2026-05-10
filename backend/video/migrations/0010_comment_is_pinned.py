from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("video", "0009_videowatchprogress"),
    ]

    operations = [
        migrations.AddField(
            model_name="comment",
            name="is_pinned",
            field=models.BooleanField(db_index=True, default=False),
        ),
    ]
