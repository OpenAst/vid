from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_profile_social_links_featured_video'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='is_private',
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name='UserBlock',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('blocker', models.ForeignKey(on_delete=models.CASCADE, related_name='blocks_initiated', to='accounts.useraccount')),
                ('blocked', models.ForeignKey(on_delete=models.CASCADE, related_name='blocks_received', to='accounts.useraccount')),
            ],
            options={
                'ordering': ['-created_at'],
                'unique_together': {('blocker', 'blocked')},
            },
        ),
        migrations.CreateModel(
            name='UserReport',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('report_type', models.CharField(choices=[('harassment', 'Harassment'), ('spam', 'Spam'), ('inappropriate', 'Inappropriate content'), ('other', 'Other')], default='other', max_length=32)),
                ('details', models.TextField(blank=True, null=True)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('reviewed', 'Reviewed'), ('actioned', 'Actioned')], default='pending', max_length=32)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('reported', models.ForeignKey(on_delete=models.CASCADE, related_name='reports_received', to='accounts.useraccount')),
                ('reporter', models.ForeignKey(on_delete=models.CASCADE, related_name='reports_made', to='accounts.useraccount')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
