from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('registration', '0007_merge_20250531_1330'),
    ]

    operations = [
        # We'll use raw SQL to safely add columns only if they don't exist
        migrations.RunSQL(
            """
            DO $$
            BEGIN
                -- Add auto_deduct column if it doesn't exist
                IF NOT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'registration_material' AND column_name = 'auto_deduct'
                ) THEN
                    ALTER TABLE registration_material ADD COLUMN auto_deduct boolean NOT NULL DEFAULT false;
                END IF;
                
                -- Add category column if it doesn't exist
                IF NOT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'registration_material' AND column_name = 'category'
                ) THEN
                    ALTER TABLE registration_material ADD COLUMN category varchar(50) NOT NULL DEFAULT 'Other';
                END IF;
                
                -- Add description column if it doesn't exist - this was causing the error
                IF NOT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'registration_material' AND column_name = 'description'
                ) THEN
                    ALTER TABLE registration_material ADD COLUMN description varchar(255) NOT NULL DEFAULT 'Material for massage service';
                END IF;
                
                -- Add name column if it doesn't exist
                IF NOT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'registration_material' AND column_name = 'name'
                ) THEN
                    ALTER TABLE registration_material ADD COLUMN name varchar(100) NOT NULL DEFAULT 'Unnamed Material';
                END IF;
                
                -- Add reusable column if it doesn't exist
                IF NOT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'registration_material' AND column_name = 'reusable'
                ) THEN
                    ALTER TABLE registration_material ADD COLUMN reusable boolean NOT NULL DEFAULT false;
                END IF;
                
                -- Add stock_quantity column if it doesn't exist
                IF NOT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'registration_material' AND column_name = 'stock_quantity'
                ) THEN
                    ALTER TABLE registration_material ADD COLUMN stock_quantity integer NOT NULL DEFAULT 0;
                END IF;
                
                -- Add unit_of_measure column if it doesn't exist
                IF NOT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'registration_material' AND column_name = 'unit_of_measure'
                ) THEN
                    ALTER TABLE registration_material ADD COLUMN unit_of_measure varchar(50) NOT NULL DEFAULT 'Unit';
                END IF;
            END $$;
            """,
            # No reverse SQL - this is a data fix
            ""
        ),
    ]
