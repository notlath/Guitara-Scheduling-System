from django.core.management.base import BaseCommand
from django.db import connection
from django.core.management import call_command
import time


class Command(BaseCommand):
    help = (
        "Apply all performance optimizations including migrations and database tuning"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-migrations",
            action="store_true",
            help="Skip running migrations and only apply database optimizations",
        )
        parser.add_argument(
            "--analyze-only",
            action="store_true",
            help="Only run ANALYZE on tables, skip other optimizations",
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS(
                "Starting Guitara Scheduling System Performance Optimization..."
            )
        )

        if not options["skip_migrations"]:
            self.run_performance_migrations()

        if not options["analyze_only"]:
            self.apply_database_optimizations()

        self.analyze_tables()
        self.show_performance_tips()

        self.stdout.write(
            self.style.SUCCESS("Performance optimization completed successfully!")
        )

    def run_performance_migrations(self):
        """Run all performance-related migrations"""
        self.stdout.write("Running performance migrations...")

        try:
            # Run migrations for all apps
            call_command("migrate", "core", verbosity=1)
            call_command("migrate", "scheduling", verbosity=1)
            call_command("migrate", "attendance", verbosity=1)
            call_command("migrate", "authentication", verbosity=1)
            call_command("migrate", "inventory", verbosity=1)
            call_command("migrate", "registration", verbosity=1)

            self.stdout.write(self.style.SUCCESS("✓ Performance migrations completed"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Migration error: {str(e)}"))

    def apply_database_optimizations(self):
        """Apply database-level optimizations"""
        self.stdout.write("Applying database optimizations...")

        with connection.cursor() as cursor:
            try:
                # Improve query planner statistics
                optimization_queries = [
                    "ALTER TABLE scheduling_appointment ALTER COLUMN status SET STATISTICS 1000;",
                    "ALTER TABLE scheduling_appointment ALTER COLUMN date SET STATISTICS 1000;",
                    "ALTER TABLE scheduling_appointment ALTER COLUMN therapist_id SET STATISTICS 1000;",
                    "ALTER TABLE scheduling_appointment ALTER COLUMN driver_id SET STATISTICS 1000;",
                    "ALTER TABLE scheduling_availability ALTER COLUMN date SET STATISTICS 1000;",
                    "ALTER TABLE scheduling_availability ALTER COLUMN user_id SET STATISTICS 1000;",
                    "ALTER TABLE scheduling_availability ALTER COLUMN is_available SET STATISTICS 1000;",
                    "ALTER TABLE core_customuser ALTER COLUMN role SET STATISTICS 1000;",
                    "ALTER TABLE core_customuser ALTER COLUMN is_active SET STATISTICS 1000;",
                    "ALTER TABLE scheduling_notification ALTER COLUMN user_id SET STATISTICS 1000;",
                    "ALTER TABLE scheduling_notification ALTER COLUMN is_read SET STATISTICS 1000;",
                ]

                for query in optimization_queries:
                    cursor.execute(query)
                    self.stdout.write(f"  ✓ Applied: {query[:50]}...")

                self.stdout.write(
                    self.style.SUCCESS("✓ Database optimizations applied")
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"✗ Database optimization error: {str(e)}")
                )

    def analyze_tables(self):
        """Update table statistics"""
        self.stdout.write("Updating table statistics...")

        tables_to_analyze = [
            "scheduling_appointment",
            "scheduling_availability",
            "scheduling_notification",
            "scheduling_client",
            "core_customuser",
            "attendance_attendancerecord",
            "attendance_attendancesummary",
            "authentication_twofactorcode",
            "authentication_passwordresetcode",
            "inventory_inventoryitem",
            "inventory_usagelog",
            "registration_service",
            "registration_material",
        ]

        with connection.cursor() as cursor:
            try:
                for table in tables_to_analyze:
                    cursor.execute(f"ANALYZE {table};")
                    self.stdout.write(f"  ✓ Analyzed: {table}")
                    time.sleep(0.1)  # Brief pause between operations

                self.stdout.write(self.style.SUCCESS("✓ Table statistics updated"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"✗ Table analysis error: {str(e)}"))

    def show_performance_tips(self):
        """Display performance monitoring tips"""
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("PERFORMANCE MONITORING TIPS"))
        self.stdout.write("=" * 60)

        tips = [
            "1. Monitor slow queries with: SELECT * FROM pg_stat_statements WHERE mean_time > 100;",
            "2. Check index usage with: SELECT * FROM pg_stat_user_indexes ORDER BY idx_tup_read DESC;",
            "3. Monitor table bloat with: SELECT * FROM pg_stat_user_tables ORDER BY n_dead_tup DESC;",
            "4. Run VACUUM ANALYZE periodically on high-traffic tables",
            "5. Consider connection pooling (PgBouncer) for production",
            "6. Monitor PostgreSQL logs for slow queries (log_min_duration_statement = 100)",
            "7. Review and tune postgresql.conf settings based on your server specs",
        ]

        for tip in tips:
            self.stdout.write(f"  {tip}")

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("Performance optimization files created:")
        self.stdout.write("  - database_optimization.sql (PostgreSQL settings)")
        self.stdout.write("  - Multiple migration files with indexes")
        self.stdout.write("=" * 60)

    def check_database_type(self):
        """Check if we're using PostgreSQL"""
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()[0]

            if "PostgreSQL" not in version:
                self.stdout.write(
                    self.style.WARNING(
                        f"Warning: This optimization is designed for PostgreSQL. "
                        f"Current database: {version}"
                    )
                )
                return False
            return True
