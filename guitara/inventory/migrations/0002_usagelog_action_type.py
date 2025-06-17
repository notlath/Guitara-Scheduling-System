from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="usagelog",
            name="action_type",
            field=models.CharField(
                max_length=20,
                choices=[('restock', 'Restock'), ('usage', 'Usage')],
                default='usage',
            ),
        ),
    ]
