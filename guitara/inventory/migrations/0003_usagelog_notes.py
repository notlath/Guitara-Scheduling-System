from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ("inventory", "0002_usagelog_action_type"),
    ]
    operations = [
        migrations.AddField(
            model_name="usagelog",
            name="notes",
            field=models.TextField(blank=True, null=True),
        ),
    ]
