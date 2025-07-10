"""
Database routers for core app.
"""

class SystemLogRouter:
    """
    A router to control all database operations on the SystemLog model.
    Ensures all SystemLog operations go directly to Supabase.
    """

    def db_for_read(self, model, **hints):
        """
        Attempts to read SystemLog models go to Supabase.
        """
        if model._meta.app_label == 'core' and model.__name__ == 'SystemLog':
            return 'default'  # Supabase connection
        return None

    def db_for_write(self, model, **hints):
        """
        Attempts to write SystemLog models go to Supabase.
        """
        if model._meta.app_label == 'core' and model.__name__ == 'SystemLog':
            return 'default'  # Supabase connection
        return None

    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations if both objects are SystemLog model.
        """
        if obj1._meta.app_label == 'core' and obj2._meta.app_label == 'core':
            return True
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Make sure the SystemLog model gets migrations applied to Supabase.
        """
        if app_label == 'core' and model_name == 'systemlog':
            return db == 'default'
        return None
