# GUITARA: Scheduling Management System for Royal Care Home Service Massage

![Project Banner](royal-care-frontend/src/assets/images/banner.png)

A web-based scheduling system designed to streamline operations for Royal Care Home Service Massage, replacing manual processes with automated solutions for appointments, staff coordination, and inventory management. Built with Django (Python) and React.

---

## 📌 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [API Endpoints](#-api-endpoints)
- [Contributing](#-contributing)
- [Archive](#-archive)
- [License](#-license)
- [Acknowledgments](#-acknowledgments)
- [Contact](#-contact)

---

## 🚀 Features

### **Core Modules**

| Module           | Key Functionality                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Security**     | 2FA via email, role-based access (Operator/Therapist/Driver), password encryption (bcrypt), account lockout after 3 attempts. |
| **Registration** | Operator-only account creation with role-specific validation (e.g., therapist license numbers).                               |
| **Scheduling**   | Real-time staff availability checks, conflict prevention, day/month calendar views.                                           |
| **Payment**      | Cash/GCash integration, SHA-256 receipt verification, automated sales reports.                                                |
| **Inventory**    | Real-time tracking of consumables (oils, towels), usage logs, low-stock alerts.                                               |

### **Frontend**

- Role-based dashboards (Operator, Therapist, Driver).
- Responsive design for mobile/desktop.
- 2FA workflow for secure logins.

---

## 💻 Tech Stack

### **Backend**

- **Language**: Python 3.12.8
- **Framework**: Django 5.1.4
- **Database**: SQLite 3.41.2 (development) / PostgreSQL 17.2 (production)
- **Authentication**: Django REST Knox
- **Real-time**: WebSockets (Django Channels)

### **Frontend**

- **Library**: React 19.0
- **State Management**: Redux Toolkit
- **Styling**: CSS Modules
- **API Client**: Axios

### **Tools & Development**

- **Version Control**: Git
- **Code Quality**: ESLint (Frontend)
- **Package Management**: pip (Backend), npm (Frontend)
- **Development**: Hot reload via Django dev server & Vite
- **Testing**: pytest framework (Test scripts archived)
- **Email**: SMTP (Gmail integration)
- **Deployment**: Docker ready (configuration pending)

---

## 📊 Project Status

### **Current Development State**

- ✅ **Core Backend**: Django REST API with authentication, scheduling, and user management
- ✅ **Frontend Interface**: React-based dashboard with role-specific views
- ✅ **Database**: SQLite development setup with PostgreSQL production support
- ✅ **Real-time Features**: WebSocket integration for live updates
- ✅ **Archive Organization**: Complete reorganization of test scripts and documentation

### **Recent Improvements (June 2025)**

- Complete archive system organization with categorized scripts and documentation
- Database transition from Supabase to local SQLite for easier development
- Improved documentation structure with implementation guides and fix summaries
- Enhanced development workflow with automated startup scripts
- Comprehensive test script preservation and organization

### **Ready for Development**

The project is fully organized and ready for continued development with:

- Clean, focused main directories for active development
- Comprehensive archive system for reference and testing
- Streamlined development environment setup
- Complete documentation of all implementations and fixes

---

## 📥 Installation & Quick Start

**Prerequisites:** Python 3.12+, Node.js 18+, SQLite (included with Python)

### **🚀 Automated Setup (Recommended)**

The easiest way to start development is using the automated starter script:

```bash
# Run the Python development starter
python start_development.py
```

This script will:

- ✅ Check prerequisites (Python, Node.js, npm)
- ✅ Create virtual environment if needed
- ✅ Install Python dependencies
- ✅ Start Django backend in a separate terminal
- ✅ Start React frontend in a separate terminal
- ✅ Automatically open http://localhost:5173/ in your browser

### **🔧 Manual Setup**

If you prefer manual setup or need to troubleshoot:

**Backend Setup:**

```bash
# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/macOS
source venv/bin/activate

# Navigate to backend directory
cd guitara

# Install dependencies
pip install -r requirements.txt

# Apply migrations (uses SQLite by default)
python manage.py migrate

# Create a superuser (optional)
python manage.py createsuperuser

# Start the development server
python manage.py runserver
```

**Frontend Setup (in a new terminal):**

```bash
# Navigate to frontend directory
cd royal-care-frontend

# Install dependencies
npm install

# Start the frontend development server
npm run dev
```

### **🌐 Accessing the Application**

- **Frontend**: http://localhost:5173/
- **Backend API**: http://localhost:8000/
- **Django Admin**: http://localhost:8000/admin/

---

## ⚙️ Configuration

### **Backend Configuration**

- **Database**: The project uses SQLite for development (located at `guitara/db.sqlite3`). For production deployment, configure PostgreSQL in `guitara/guitara/settings.py`.
- **Environment Variables**: Create a `.env` file in the `guitara/` directory with your email settings:
  ```
  EMAIL_HOST=smtp.gmail.com
  EMAIL_PORT=587
  EMAIL_USE_TLS=True
  EMAIL_HOST_USER=your-email@gmail.com
  EMAIL_HOST_PASSWORD=your-app-password
  DEFAULT_FROM_EMAIL=Royal Care <noreply@royalcare.com>
  ```

### **Frontend Configuration**

- **API Configuration**: Update API base URL in `royal-care-frontend/.env` if needed:

  ```VITE_API_BASE_URL=http://localhost:8000/api

  ```

---

## 🔧 Troubleshooting

### **Common Issues**

#### **npm not found (Windows)**

If you see "npm not found" error:

1. Restart your terminal/command prompt
2. Reinstall Node.js from https://nodejs.org/ (includes npm)
3. Run as Administrator
4. The Python starter script will try to find npm in common locations automatically

#### **Virtual Environment Issues**

```bash
# If venv creation fails, try:
python -m pip install --upgrade pip
python -m venv venv --clear
```

#### **Port Already in Use**

```bash
# If port 8000 or 5173 is busy:
# Backend: Change port in guitara/manage.py runserver 8001
# Frontend: Change port in royal-care-frontend/vite.config.js
```

#### **Database Migration Issues**

```bash
# Reset migrations if needed:
cd guitara
python manage.py migrate --fake-initial
```

### **Development Tips**

- **Hot Reload**: Both Django and Vite support hot reload - changes appear automatically
- **API Testing**: Use Django admin at http://localhost:8000/admin/ for data management
- **Browser DevTools**: Use F12 for React debugging and network inspection
- **Logs**: Check terminal outputs for both backend and frontend error messages

---

## 📡 API Endpoints

### **Authentication**

- `POST /api/auth/register/`: Operator account creation.
- `POST /api/auth/login/`: User login.
- `POST /api/auth/logout/`: User logout.

### **User Management**

- `GET /api/users/`: List all users (Operator only).
- `GET /api/users/{id}/`: Get user details.
- `PUT /api/users/{id}/`: Update user details.
- `DELETE /api/users/{id}/`: Delete a user.

### **Scheduling**

- `GET /api/schedules/`: Get all schedules.
- `POST /api/schedules/`: Create a new schedule.
- `PUT /api/schedules/{id}/`: Update a schedule.
- `DELETE /api/schedules/{id}/`: Delete a schedule.

### **Payments**

- `GET /api/payments/`: Get all payments.
- `POST /api/payments/`: Create a new payment.
- `GET /api/payments/report/`: Get sales report.

### **Inventory**

- `GET /api/inventory/`: Get inventory items.
- `POST /api/inventory/`: Add a new inventory item.
- `PUT /api/inventory/{id}/`: Update inventory item details.
- `DELETE /api/inventory/{id}/`: Delete an inventory item.

---

## 🗄️ Archive

The project includes a comprehensive `/archive` directory that contains:

- **Test Scripts**: All validation and testing scripts (Python & JavaScript) organized by category
- **Documentation**: Complete implementation documentation, fix summaries, and progress tracking
- **Migration History**: Database migration files and schema evolution tracking
- **Utility Scripts**: Database setup, notification testing, and validation tools

### Recent Organization Updates

- **June 2025** - Complete archive organization and documentation cleanup:
  - All test scripts moved to `archive/scripts/testing/` with organized subdirectories
  - Documentation updated with proper script references and implementation details
  - Database migration history preserved in `archive/migrations_history/`
  - Utility scripts categorized in `archive/scripts/database/`, `archive/scripts/notification/`

The archive preserves the complete development history while keeping the main project directories clean and focused on active development code.

See [Archive README](archive/README.md) for detailed information about archived content and how to access specific scripts or documentation.

---

## 🤝 Contributing

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/YourFeature`).
3. Make your changes.
4. Commit your changes (`git commit -m 'Add some feature'`).
5. Push to the branch (`git push origin feature/YourFeature`).
6. Open a pull request.

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📝 Development Notes

### **Repository Organization**

This repository has been thoroughly organized for clarity and maintainability:

- **Core Application** - Main application code in `guitara/` (Django backend) and `royal-care-frontend/` (React frontend)
- **Archive** - Complete archive system containing test scripts, documentation, and development artifacts in organized categories
- **Root Directory** - Essential project files including `start_all.bat`, configuration files, and this README

### **Database Evolution**

The project has evolved through different database configurations:

- **Current**: SQLite for development (file: `guitara/db.sqlite3`)
- **Production**: PostgreSQL support maintained in settings
- **History**: Originally used Supabase/PostgreSQL, transitioned to local SQLite for easier development setup

### **Quick Start Scripts**

The project includes automated development environment setup scripts:

#### **Cross-Platform: start_development.py (Recommended)**

A Python script that works on Windows, Linux, and macOS:

```bash
python start_development.py
```

**Features:**

- ✅ **Prerequisites Check**: Automatically detects Python, Node.js, and npm
- ✅ **Smart npm Detection**: Finds npm even if not in PATH (Windows)
- ✅ **Cross-Platform**: Works on all operating systems
- ✅ **Separate Terminals**: Opens backend and frontend in separate terminal windows
- ✅ **Auto Browser**: Automatically opens http://localhost:5173/
- ✅ **Error Handling**: Provides helpful troubleshooting suggestions

#### **Windows: start_all.bat**

For Windows users who prefer batch files:

```cmd
.\start_all.bat
```

#### **Development Workflow**

1. **First Time Setup**: Run `python start_development.py` to set up everything
2. **Daily Development**: Simply run `python start_development.py` to start both servers
3. **Manual Control**: If you need fine control, use the manual setup commands above

**What You'll See:**

- **Django Backend Terminal**: Running on http://127.0.0.1:8000/
- **React Frontend Terminal**: Running on http://localhost:5173/
- **Browser**: Automatically opens to the React application
