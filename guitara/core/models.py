from django.contrib.auth.models import AbstractUser
from django.db import models
import bcrypt

class CustomUser(AbstractUser):
    ROLES = (
        ('operator', 'Operator'),
        ('therapist', 'Therapist'),
        ('driver', 'Driver'),
    )
    
    role = models.CharField(max_length=20, choices=ROLES)
    specialization = models.CharField(max_length=100, blank=True, null=True)
    massage_pressure = models.CharField(max_length=20, blank=True, null=True)
    license_number = models.CharField(max_length=50, blank=True, null=True)
    motorcycle_plate = models.CharField(max_length=20, blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)  # Allow null values default="")  # Add a default value
    failed_login_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    
    def set_password(self, raw_password):
        salt = bcrypt.gensalt()
        self.password = bcrypt.hashpw(raw_password.encode(), salt).decode()
        
    def check_password(self, raw_password):
        return bcrypt.checkpw(raw_password.encode(), self.password.encode())