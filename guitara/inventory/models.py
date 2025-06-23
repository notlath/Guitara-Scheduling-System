from django.db import models
from django.conf import settings

class InventoryItem(models.Model):
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    current_stock = models.PositiveIntegerField(default=0)
    min_stock = models.PositiveIntegerField(default=0)
    unit = models.CharField(max_length=50)
    cost_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    last_restocked = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    size_per_unit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Size per unit in ml or g, if applicable")
    
    def __str__(self):
        return self.name

class UsageLog(models.Model):
    ACTION_CHOICES = [
        ('restock', 'Restock'),
        ('usage', 'Usage'),
        # add more as needed
    ]
    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='usage_logs')
    quantity_used = models.PositiveIntegerField()
    operator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    action_type = models.CharField(max_length=20, choices=ACTION_CHOICES, default='usage')
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.item.name} {self.action_type}: {self.quantity_used} on {self.timestamp}"
