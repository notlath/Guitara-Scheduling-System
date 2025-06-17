from rest_framework.routers import DefaultRouter
from .views import InventoryItemViewSet, UsageLogViewSet

router = DefaultRouter()
router.register(r'usage-log', UsageLogViewSet)
router.register(r'', InventoryItemViewSet)  # Register at root for /api/inventory/

urlpatterns = router.urls
