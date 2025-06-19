# Local settings override for mode configuration
# This file is imported by the main settings.py when it exists

import os
from pathlib import Path

# Try to import mode configuration if it exists
try:
    from .mode_config import *

    print(f"[MODE CONFIG] Mode configuration loaded successfully")
except ImportError:
    print(f"[MODE CONFIG] No mode configuration found, using defaults")
    pass
