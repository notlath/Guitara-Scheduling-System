# 🗂️ File Cleanup Guide for Production

## 🚀 **ESSENTIAL PRODUCTION FILES** (Keep & Push to GitHub)

### Core Application Files:
- `guitara/` - Django backend application
- `royal-care-frontend/` - React frontend application
- `requirements.txt` - Python dependencies
- `package.json` - Node.js dependencies
- `README.md` - Project documentation
- `docker-compose.yml` - Docker configuration
- `Dockerfile` - Docker build configuration
- `Procfile` - For deployment (Railway/Heroku)
- `railway.json` - Railway deployment config
- `nixpacks.toml` - Build configuration

### Development Configuration:
- `dev_config.json` - Development settings
- `.env` files (if they exist)
- `pre-commit-config.yaml` - Code quality hooks

## ⚠️ **TEMPORARY/TESTING FILES** (Safe to Delete)

### Test Scripts (Created During Debugging):
- `check_clients.py`
- `check_inventory_data.py` 
- `debug_materials.py`
- `debug_notifications.py`
- `remove_test_items.py`
- `start_development.py`
- `start_realtime_dev.py`
- `test_*.py` (all test files we created)
- `cleanup_test_data.py`
- `debug_material_inventory_mismatch.py`
- `fix_*.py` (all fix scripts)
- `toggle_page_size.py`
- `verify_pagination_implementation.py`

### Log Files:
- `debug.log`
- `dev_server.log`
- `*.log` files

### Batch Files (Windows specific):
- `*.bat` files (docker-launch.bat, start_backend.bat, etc.)

### Cache/Compiled Files:
- `__pycache__/` directories
- `*.pyc` files

## 📋 **DOCUMENTATION FILES** (Keep or Archive)

These are helpful for reference but not essential for production:
- `CACHE_SYNC_FIX_COMPLETE.md`
- `CLIENT_SELECTION_DEBUGGING_GUIDE.md`
- `DEVELOPMENT_SERVER_ENHANCEMENTS.md`
- `FINAL_CORRECTED_IMPLEMENTATION.md`
- `INSTANT_UPDATES_IMPLEMENTATION_GUIDE.md`
- `INVENTORY_COMPLETE_FINAL.md`
- All other `.md` documentation files

## 🧹 **RECOMMENDED CLEANUP ACTIONS:**

1. **Delete test scripts** (all `test_*.py`, `debug_*.py`, `fix_*.py`)
2. **Delete log files** (`*.log`)
3. **Delete Windows batch files** (`*.bat`) 
4. **Move documentation** to a `/docs` folder or archive
5. **Clean up cache** (`__pycache__/`, `*.pyc`)
6. **Keep core application code** and configuration

## 🎯 **Essential Files for Production Deployment:**

```
Guitara-Scheduling-System/
├── guitara/                    # ✅ Django backend
├── royal-care-frontend/        # ✅ React frontend  
├── requirements.txt           # ✅ Python deps
├── package.json              # ✅ Node deps
├── docker-compose.yml        # ✅ Docker config
├── Dockerfile               # ✅ Docker build
├── Procfile                 # ✅ Deployment
├── railway.json             # ✅ Railway config
├── nixpacks.toml           # ✅ Build config
├── README.md               # ✅ Documentation
└── .gitignore              # ✅ Git ignore rules
```

## 🗃️ **Git Ignore Recommendations:**

Add to `.gitignore`:
```
# Test files
test_*.py
debug_*.py
fix_*.py
cleanup_*.py

# Log files  
*.log
debug.log

# Cache
__pycache__/
*.pyc
*.pyo

# Environment
.env.local
.env.development

# Windows batch files
*.bat

# Documentation (optional)
*_COMPLETE.md
*_GUIDE.md
*_IMPLEMENTATION*.md
```
