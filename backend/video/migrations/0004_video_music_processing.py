from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('video', '0003_videoview'),
    ]

    operations = [
        migrations.AddField(
            model_name='video',
            name='music_url',
            field=models.URLField(blank=True, max_length=1000, null=True),
        ),
        migrations.AddField(
            model_name='video',
            name='processing_status',
            field=models.CharField(default='ready', max_length=32),
        ),
    ]
