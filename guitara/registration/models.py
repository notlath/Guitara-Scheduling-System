from django.db import models

class Therapist(models.Model):
    first_name = models.CharField(max_length=100, null=False, blank=False)
    last_name = models.CharField(max_length=100, null=False, blank=False)
    username = models.CharField(max_length=100, unique=True)
    email = models.EmailField(unique=True)
    specialization = models.CharField(max_length=100, null=True, blank=True)
    massage_pressure = models.CharField(max_length=100, null=True, blank=True, default='Standard')

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

class Driver(models.Model):
    first_name = models.CharField(max_length=100, null=False, blank=False)
    last_name = models.CharField(max_length=100, null=False, blank=False)
    username = models.CharField(max_length=100, unique=True)
    email = models.EmailField(unique=True)

    def __str__(self):
        return f'{self.first_name} {self.last_name}'

class Operator(models.Model):
    first_name = models.CharField(max_length=100, null=False, blank=False)
    last_name = models.CharField(max_length=100, null=False, blank=False)
    username = models.CharField(max_length=100, unique=True)
    email = models.EmailField(unique=True)

    def __str__(self):
        return f'{self.first_name} {self.last_name}'

class Service(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    duration = models.DurationField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    materials = models.ManyToManyField('Material')

    def __str__(self):
        return self.name

class Material(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()

    def __str__(self):
        return self.name
