from django.db import models

class Therapist(models.Model):
    first_name = models.CharField(max_length=100, null=True, blank=True)
    last_name = models.CharField(max_length=100, null=True, blank=True)
    username = models.CharField(max_length=100, unique=True, null=True, blank=True)
    email = models.EmailField(unique=True, null=True, blank=True)
    specialization = models.CharField(max_length=100, null=True, blank=True)
    pressure = models.CharField(max_length=20, null=True, blank=True)

class Driver(models.Model):
    first_name = models.CharField(max_length=100, null=True, blank=True)
    last_name = models.CharField(max_length=100, null=True, blank=True)
    username = models.CharField(max_length=100, unique=True, null=True, blank=True)
    email = models.EmailField(unique=True, null=True, blank=True)

class Operator(models.Model):
    first_name = models.CharField(max_length=100, null=True, blank=True)
    last_name = models.CharField(max_length=100, null=True, blank=True)
    username = models.CharField(max_length=100, unique=True, null=True, blank=True)
    email = models.EmailField(unique=True, null=True, blank=True)

class Service(models.Model):
    name = models.CharField(max_length=100, default="New Service")
    description = models.CharField(max_length=255, default="Service description")
    duration = models.IntegerField(help_text="Duration in minutes", default=60)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    oil = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.name} - {self.duration} min - ₱{self.price}"

class Material(models.Model):
    CATEGORY_CHOICES = [
        ('Massage Oil', 'Massage Oil'),
        ('Massage Supplies', 'Massage Supplies'),
        ('Hygiene Supplies', 'Hygiene Supplies'),
        ('Ventosa Supplies', 'Ventosa Supplies'),
        ('Equipment', 'Equipment'),
        ('Other', 'Other'),    ]
    
    UNIT_CHOICES = [
        ('Bottle', 'Bottle'),
        ('Tub', 'Tub'),
        ('Spray Bottle', 'Spray Bottle'),
        ('Unit', 'Unit'),
        ('Set', 'Set'),
        ('Pack', 'Pack'),
        ('Other', 'Other'),
    ]
    
    name = models.CharField(max_length=100, default="Unnamed Material")  # Added default value
    description = models.CharField(max_length=255, default="Material for massage service") # Added default value
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='Other')
    unit_of_measure = models.CharField(max_length=50, choices=UNIT_CHOICES, default='Unit')
    service = models.ForeignKey(Service, related_name="materials", on_delete=models.CASCADE, blank=True, null=True)
    stock_quantity = models.IntegerField(default=0)
    auto_deduct = models.BooleanField(default=False, help_text="Automatically deduct from inventory when booking is created")
    reusable = models.BooleanField(default=False, help_text="Whether this material can be reused")
    
    def __str__(self):
        return f"{self.name} - {self.category}"