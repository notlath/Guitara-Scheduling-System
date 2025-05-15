from django.apps import AppConfig


class SchedulingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'scheduling'
    
    def ready(self):
        import scheduling.signals  # Import signals to register them
