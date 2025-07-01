"""
Material Usage Service
Handles the business logic for material deduction and return based on appointment lifecycle
"""

from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from .models import AppointmentMaterial
from inventory.models import InventoryItem, UsageLog
import logging

logger = logging.getLogger(__name__)


class MaterialUsageService:
    """Service class to handle material usage logic for appointments"""
    
    # Categories that support volume-based deduction (in ml)
    VOLUME_BASED_CATEGORIES = [
        'Oils & Lotions',
        'Oils',
        'Lotions', 
        'Alcohol Spray',
        'Hygiene'
    ]
    
    # Categories that are reusable (temporary deduction)
    REUSABLE_CATEGORIES = [
        'Ventosa Kits',
        'Hot Stone Kits',
        'Equipment'
    ]
    
    @classmethod
    def deduct_materials_for_appointment(cls, appointment, material_ids):
        """
        Deduct materials when appointment is created
        
        Args:
            appointment: Appointment instance
            material_ids: List of material IDs (integers) OR list of dicts with {'material': int, 'quantity': float}
        
        Returns:
            List of AppointmentMaterial instances created
        """
        appointment_materials = []
        
        # Handle both formats: list of IDs or list of dicts
        if material_ids and isinstance(material_ids[0], dict):
            # New format: [{'material': 1, 'quantity': 2}, ...]
            materials_data = material_ids
        else:
            # Old format: [1, 2, 3, ...] - convert to new format with quantity=1
            materials_data = [{'material': mid, 'quantity': 1} for mid in material_ids]
        
        logger.info(f"Processing materials for appointment {appointment.id}: {materials_data}")
        
        with transaction.atomic():
            for material_data in materials_data:
                material_id = material_data['material']
                quantity = Decimal(str(material_data['quantity']))
                
                try:
                    # FIXED: Get the RegistrationMaterial first, then get its linked inventory item
                    from registration.models import RegistrationMaterial
                    registration_material = RegistrationMaterial.objects.get(id=material_id)
                    
                    if not registration_material.inventory_item:
                        logger.error(f"Material {material_id} has no linked inventory item")
                        raise ValueError(f"Material {material_id} has no linked inventory item")
                    
                    # Now get the correct inventory item
                    inventory_item = InventoryItem.objects.select_for_update().get(id=registration_material.inventory_item.id)
                    logger.info(f"Processing material {material_id} ({registration_material.name}) -> inventory {inventory_item.id} ({inventory_item.name})")
                    logger.info(f"Before deduction: Stock={inventory_item.current_stock}, InUse={inventory_item.in_use}, Empty={inventory_item.empty}")
                    
                    # Determine if this is reusable (for tracking purposes)
                    is_reusable = inventory_item.category in cls.REUSABLE_CATEGORIES
                    usage_type = 'reusable' if is_reusable else 'consumable'
                    
                    # Check if sufficient stock available
                    if inventory_item.current_stock < quantity:
                        raise ValueError(
                            f"Insufficient stock for {inventory_item.name}. "
                            f"Available: {inventory_item.current_stock}, Required: {quantity}"
                        )
                    
                    # Move materials from In Stock to In Use
                    if not inventory_item.move_to_in_use(int(quantity)):
                        raise ValueError(
                            f"Failed to move {quantity} units of {inventory_item.name} to in-use status"
                        )
                    
                    logger.info(f"After deduction: Stock={inventory_item.current_stock}, InUse={inventory_item.in_use}, Empty={inventory_item.empty}")
                    
                    # Create AppointmentMaterial record
                    appointment_material = AppointmentMaterial.objects.create(
                        appointment=appointment,
                        inventory_item=inventory_item,
                        quantity_used=quantity,
                        usage_type=usage_type,
                        is_reusable=is_reusable,
                        notes=f"Deducted for appointment #{appointment.id}"
                    )
                    appointment_materials.append(appointment_material)
                    
                    # Create usage log
                    UsageLog.objects.create(
                        item=inventory_item,
                        quantity_used=int(quantity),
                        action_type='usage',
                        notes=f"Used in appointment #{appointment.id} - {usage_type}"
                    )
                    
                    logger.info(
                        f"✅ Successfully deducted {quantity} {inventory_item.unit} of "
                        f"{inventory_item.name} for appointment #{appointment.id} ({usage_type})"
                    )
                    
                except (InventoryItem.DoesNotExist, RegistrationMaterial.DoesNotExist):
                    logger.error(f"Material with ID {material_id} or its linked inventory item not found")
                    raise ValueError(f"Material with ID {material_id} not found")
                except Exception as e:
                    logger.error(f"Error deducting material {material_id}: {str(e)}")
                    raise
        
        logger.info(f"✅ Successfully processed {len(appointment_materials)} materials for appointment {appointment.id}")
        return appointment_materials
    
    @classmethod
    def return_reusable_materials(cls, appointment):
        """
        Return reusable materials when appointment is completed
        
        Args:
            appointment: Appointment instance
        
        Returns:
            List of AppointmentMaterial instances that were returned
        """
        returned_materials = []
        
        with transaction.atomic():
            # Get all reusable materials for this appointment that haven't been returned
            reusable_materials = AppointmentMaterial.objects.filter(
                appointment=appointment,
                is_reusable=True,
                returned_at__isnull=True
            ).select_related('inventory_item')
            
            for appointment_material in reusable_materials:
                try:
                    inventory_item = InventoryItem.objects.select_for_update().get(
                        id=appointment_material.inventory_item.id
                    )
                    
                    # Return the quantity to inventory
                    return_quantity = appointment_material.quantity_used
                    inventory_item.current_stock += return_quantity
                    inventory_item.save()
                    
                    # Mark as returned
                    appointment_material.returned_at = timezone.now()
                    appointment_material.notes = (
                        appointment_material.notes or ""
                    ) + f" | Returned on completion at {timezone.now()}"
                    appointment_material.save()
                    
                    returned_materials.append(appointment_material)
                    
                    # Create usage log for return
                    UsageLog.objects.create(
                        item=inventory_item,
                        quantity_used=int(return_quantity),
                        action_type='restock',
                        notes=f"Returned from completed appointment #{appointment.id}"
                    )
                    
                    logger.info(
                        f"Returned {return_quantity} {inventory_item.unit} of "
                        f"{inventory_item.name} from appointment #{appointment.id}"
                    )
                    
                except Exception as e:
                    logger.error(
                        f"Error returning material {appointment_material.inventory_item.name}: {str(e)}"
                    )
                    # Continue with other materials even if one fails
                    continue
        
        return returned_materials
    
    @classmethod
    def get_appointment_material_summary(cls, appointment):
        """
        Get a summary of materials used in an appointment
        
        Args:
            appointment: Appointment instance
            
        Returns:
            Dict with material usage summary
        """
        materials = AppointmentMaterial.objects.filter(
            appointment=appointment
        ).select_related('inventory_item')
        
        summary = {
            'total_materials': materials.count(),
            'consumable_materials': [],
            'reusable_materials': [],
            'reusable_returned': 0,
            'reusable_pending': 0
        }
        
        for material in materials:
            material_info = {
                'name': material.inventory_item.name,
                'category': material.inventory_item.category,
                'quantity_used': material.quantity_used,
                'unit': material.inventory_item.unit,
                'deducted_at': material.deducted_at,
                'returned_at': material.returned_at
            }
            
            if material.is_reusable:
                summary['reusable_materials'].append(material_info)
                if material.returned_at:
                    summary['reusable_returned'] += 1
                else:
                    summary['reusable_pending'] += 1
            else:
                summary['consumable_materials'].append(material_info)
        
        return summary
