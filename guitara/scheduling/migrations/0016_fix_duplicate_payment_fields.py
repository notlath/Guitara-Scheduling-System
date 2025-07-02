# Custom migration to handle duplicate payment verification fields conflict

from django.db import migrations


class Migration(migrations.Migration):
    """
    This migration handles the conflict where payment verification fields
    were added in multiple migration branches. Since the fields already
    exist in the database, this is a no-op migration to maintain
    migration consistency.
    """

    dependencies = [
        ("scheduling", "0013_add_payment_verification_fields"),
        ("scheduling", "0013_merge_20250619_2037"),
    ]

    operations = [
        # No operations needed - payment verification fields already exist
        # This migration exists solely to resolve migration conflicts
    ]
