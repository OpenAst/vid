from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
        ('token_blacklist', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL(
            sql='''
                ALTER TABLE token_blacklist_outstandingtoken 
                ALTER COLUMN user_id TYPE uuid USING user_id::text::uuid;
            ''',
            reverse_sql='''
                ALTER TABLE token_blacklist_outstandingtoken 
                ALTER COLUMN user_id TYPE bigint USING user_id::text::bigint;
            '''
        ),
    ]
