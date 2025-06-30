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
    empty = models.PositiveIntegerField(default=0, help_text="Number of empty units (bottles/containers)")
    in_use = models.PositiveIntegerField(default=0, help_text="Number of units currently in use during services")
    
    def __str__(self):
        return self.name
    
    def move_to_in_use(self, quantity):
        """Move items from current_stock to in_use"""
        if quantity <= self.current_stock:
            self.current_stock -= quantity
            self.in_use += quantity
            self.save()
            return True
        return False
    
    def move_to_empty(self, quantity):
        """Move items from in_use to empty"""
        if quantity <= self.in_use:
            self.in_use -= quantity
            self.empty += quantity
            self.save()
            return True
        return False
    
    def refill_from_empty(self, quantity):
        """Refill items from empty back to current_stock"""
        if quantity <= self.empty:
            self.empty -= quantity
            self.current_stock += quantity
            self.save()
            return True
        return False

class UsageLog(models.Model):
    ACTION_CHOICES = [
        ('restock', 'Restock'),
        ('usage', 'Usage'),
        ('empty', 'Marked as Empty'),
        ('returned', 'Returned to Stock'),
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
