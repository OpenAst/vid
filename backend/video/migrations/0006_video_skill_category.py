from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("video", "0005_call"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                        ALTER TABLE video_video
                        ADD COLUMN IF NOT EXISTS skill_category varchar(100);

                        ALTER TABLE video_video
                        ALTER COLUMN skill_category SET DEFAULT 'general';

                        UPDATE video_video
                        SET skill_category = 'general'
                        WHERE skill_category IS NULL;

                        ALTER TABLE video_video
                        ALTER COLUMN skill_category SET NOT NULL;
                    """,
                    reverse_sql="""
                        ALTER TABLE video_video
                        DROP COLUMN IF EXISTS skill_category;
                    """,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="video",
                    name="skill_category",
                    field=models.CharField(default="general", max_length=100),
                ),
            ],
        ),
    ]
