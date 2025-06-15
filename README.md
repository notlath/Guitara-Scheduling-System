# 💆‍♀️ GUITARA: Royal Care Scheduling Management System

<div align="center">

**A comprehensive web-based scheduling system for Royal Care Home Service Massage**

_Streamlining operations with automated appointment management, staff coordination, and material tracking_

[![Django](https://img.shields.io/badge/Django-5.1.4-092E20?style=flat&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)

![License](https://img.shields.io/badge/License-MIT-green?style=flat)
![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen?style=flat)

</div>

---

## 📋 Table of Contents

- [🚀 Features](#-features)
- [💻 Technology Stack](#-technology-stack)
- [📊 Project Status](#-project-status)
- [⚡ Quick Start](#-quick-start)
- [📥 Installation](#-installation)
- [⚙️ Configuration](#️-configuration)
- [🔧 Troubleshooting](#-troubleshooting)
- [📡 API Reference](#-api-reference)
- [🗄️ Archive & Documentation](#️-archive--documentation)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)

---

## 🚀 Features

### 🔐 **Authentication & Security**

- **Two-Factor Authentication** via email verification
- **Role-Based Access Control** (Operator, Therapist, Driver)
- **Secure Password Hashing** with bcrypt encryption
- **Account Protection** with lockout after failed attempts
- **Session Management** with Knox token authentication

### 👥 **User Management**

- **Multi-Role Support** with custom dashboards for each user type
- **Role-Based Registration** with operator-controlled account creation
- **Profile Management** with role-specific field validation
- **Staff Coordination** tools for real-time status tracking

### 📅 **Advanced Scheduling System**

- **Real-Time Availability** checking with intelligent conflict prevention
- **Multi-View Calendar** (daily, weekly, monthly perspectives)
- **Cross-Day Booking** support for extended service sessions
- **Live Status Updates** with real-time synchronization
- **Staff Assignment** with automatic availability verification
- **Appointment Workflow** from creation to completion tracking

### 🚗 **Transportation Management**

- **Driver Assignment** with FIFO (First-In-First-Out) allocation system
- **Multi-Point Coordination** supporting therapist pickup and drop-off
- **Real-Time Status Tracking** throughout the entire journey
- **Pickup Request System** for therapist return transportation
- **Route Optimization** and status updates at each stage

### 💰 **Payment & Financial Tracking**

- **Multiple Payment Methods** (Cash, GCash, digital payments)
- **Automated Receipt Generation** with secure verification
- **Sales Reporting** with comprehensive date range filtering
- **Transaction Audit Trail** for complete financial transparency
- **Payment Status Tracking** throughout the appointment lifecycle

### 📦 **Material & Resource Management**

- **Service Catalog** with customizable offerings and pricing
- **Material Tracking** for consumables (oils, towels, supplies)
- **Category-Based Organization** (Massage Oil, Supplies, Equipment)
- **Automatic Deduction** system for booking-based material usage
- **Reusable vs Consumable** tracking for accurate inventory management
- **Low-Stock Monitoring** with configurable alert thresholds

### ⏰ **Attendance & Time Management**

- **Digital Check-In/Check-Out** system for all staff
- **Attendance Status Tracking** (Present, Late, Absent)
- **Operator Approval Workflow** for attendance verification
- **Automated Time Calculations** and reporting
- **Historical Attendance Records** with comprehensive filtering

### 🔄 **Real-Time Features**

- **Live Notifications** for appointment status changes and system events
- **Centralized Data Management** with intelligent caching and deduplication
- **Optimistic Updates** for instant UI responsiveness during user actions
- **Cross-Dashboard Communication** for coordinated operations across multiple windows
- **Smart Polling System** that adjusts frequency based on user activity
- **WebSocket Integration** with fallback to polling for guaranteed connectivity
- **Account Status Management** with real-time synchronization for access control

### 📱 **Modern User Experience**

- **Responsive Design** optimized for desktop, tablet, and mobile devices
- **Advanced Loading States** with skeleton screens, progress bars, and optimistic indicators
- **Intelligent Caching** to minimize server load and improve performance
- **Error Boundaries** with graceful fallback handling
- **Accessibility Features** following WCAG guidelines with keyboard navigation
- **Progressive Enhancement** ensuring functionality across all browsers
- **Performance Optimized** with code splitting and lazy loading

---

## 💻 Technology Stack

### 🐍 **Backend**

- **Framework**: Django 5.1.4 with Django REST Framework 3.14.0
- **Language**: Python 3.12.8
- **Database**: SQLite 3.41.2 (development) / PostgreSQL 17.2 (production)
- **Authentication**: Django REST Knox with JWT tokens
- **Real-Time**: Django Channels with WebSocket support
- **Security**: bcrypt password hashing, CORS headers
- **Testing**: pytest framework with Django integration

### ⚛️ **Frontend**

- **Framework**: React 19.0.0 with modern hooks and functional components
- **Build Tool**: Vite 6.2.0 for fast development and optimized builds
- **State Management**: Redux Toolkit 2.6.1 for predictable state management
- **Routing**: React Router DOM 6.22 for client-side navigation
- **Styling**: CSS Modules with responsive design patterns
- **Icons**: React Icons 5.5.0 and Material-UI Icons 7.1.1
- **HTTP Client**: Axios 1.6.2 for API communication
- **Testing**: Jest 30.0.0 with React Testing Library 16.3.0
- **File Operations**: jsPDF 3.0.1 and XLSX 0.18.5 for document generation
- **Code Quality**: ESLint 9.21.0 with React-specific rules and hooks validation

### 🛠️ **Development Tools**

- **Version Control**: Git with organized branching strategy
- **Code Quality**: ESLint 9.21.0 with React-specific rules and hooks validation
- **Package Management**: npm (Frontend) / pip with virtual environments (Backend)
- **Development Server**: Hot reload via Django dev server & Vite HMR
- **Environment Management**: python-dotenv for secure configuration
- **Database Tools**: Django ORM with comprehensive migration system
- **Testing Framework**: Jest with Babel integration and JSDOM environment

### 🚀 **Infrastructure & Deployment**

- **Development Environment**: Cross-platform automated startup scripts
- **Database**: SQLite for development with PostgreSQL production support
- **Authentication**: Django REST Knox with secure token management
- **Real-Time Communication**: WebSocket support via Django Channels
- **Static Files**: Optimized serving and caching strategies
- **Security**: CSRF protection, secure headers, input sanitization

### **Key Dependencies**

**Frontend Core:**

```
react==19.0.0
@reduxjs/toolkit==2.6.1
react-router-dom==6.22
axios==1.6.2
vite==6.2.0
react-icons==5.5.0
@mui/icons-material==7.1.1
file-saver==2.0.5
jspdf==3.0.1
xlsx==0.18.5
```

**Backend Core:**

```
django==5.1.4
djangorestframework==3.14.0
django-rest-knox==4.2.0
channels==4.0.0
psycopg2-binary==2.9.9
bcrypt==4.1.2
redis==5.0.1
django-cors-headers==4.3.1
```

---

## 📊 Project Status

<div align="center">

### 🎯 **Current Status: Production Ready**

![Progress](https://img.shields.io/badge/Progress-95%25-brightgreen?style=for-the-badge)
![Backend](https://img.shields.io/badge/Backend-Complete-success?style=flat)
![Frontend](https://img.shields.io/badge/Frontend-Complete-success?style=flat)
![Database](https://img.shields.io/badge/Database-SQLite%20Ready-success?style=flat)
![Real--time](https://img.shields.io/badge/Real--time-Implemented-success?style=flat)
![Testing](https://img.shields.io/badge/Testing-Framework%20Ready-orange?style=flat)

</div>

## ⚡ Quick Start

<div align="center">

**Get up and running in under 2 minutes!**

</div>

### 🚀 **One-Command Setup (Recommended)**

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd Guitara-Scheduling-System

# Start everything automatically
python start_development.py
```

**What this does:**

- ✅ Checks prerequisites (Python 3.12+, Node.js 18+, npm)
- ✅ Creates Python virtual environment automatically
- ✅ Installs all backend dependencies
- ✅ Installs all frontend dependencies
- ✅ Starts Django backend in separate terminal (Port 8000)
- ✅ Starts React frontend in separate terminal (Port 5173)
- ✅ Opens your browser to http://localhost:5173/

### 🌐 **Access Points**

Once running, you can access:

| Service             | URL                             | Description                   |
| ------------------- | ------------------------------- | ----------------------------- |
| 🎨 **Frontend App** | http://localhost:5173/          | Main React application        |
| 🔌 **Backend API**  | http://localhost:8000/api/      | Django REST API endpoints     |
| 👑 **Admin Panel**  | http://localhost:8000/admin/    | Django admin interface        |
| 📚 **API Docs**     | http://localhost:8000/api/docs/ | Interactive API documentation |

### 🔑 **Getting Started**

For development and testing:

```
Access the application at: http://localhost:5173/
Create accounts through the registration system
Configure roles via the operator dashboard
```

### ⚠️ **Prerequisites**

Make sure you have installed:

- **Python 3.12+** - [Download here](https://www.python.org/downloads/)
- **Node.js 18+** - [Download here](https://nodejs.org/) (includes npm)
- **Git** - [Download here](https://git-scm.com/downloads)

## 📥 Installation

### 🔧 **Manual Setup (Advanced Users)**

If you prefer manual control or need to troubleshoot:

#### **Step 1: Backend Setup**

```bash
# Clone and navigate to project
git clone <repository-url>
cd Guitara-Scheduling-System

# Create and activate virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Navigate to backend directory
cd guitara

# Install Python dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Create superuser (optional for admin access)
python manage.py createsuperuser

# Start Django development server
python manage.py runserver
```

#### **Step 2: Frontend Setup (New Terminal)**

```bash
# Navigate to frontend directory
cd royal-care-frontend

# Install Node.js dependencies
npm install

# Start React development server
npm run dev
```

### 📋 **Project Structure**

```
Guitara-Scheduling-System/
├── 📁 guitara/                     # Django Backend
│   ├── manage.py                   # Django management script
│   ├── requirements.txt            # Python dependencies
│   ├── db.sqlite3                  # SQLite database
│   ├── authentication/            # Auth module
│   ├── core/                       # Core business logic
│   ├── scheduling/                 # Scheduling system
│   └── guitara/                    # Django project settings
├── 📁 royal-care-frontend/         # React Frontend
│   ├── package.json                # Node.js dependencies
│   ├── vite.config.js              # Vite configuration
│   ├── src/                        # React source code
│   │   ├── components/             # Reusable UI components
│   │   ├── pages/                  # Route-based pages
│   │   ├── features/               # Redux slices
│   │   ├── services/               # API services
│   │   └── styles/                 # CSS and themes
│   └── public/                     # Static assets
├── 📁 archive/                     # Development history & utilities
│   ├── scripts/                    # Testing and utility scripts
│   ├── documentation/              # Implementation guides
│   └── migrations_history/         # Database evolution
├── start_development.py            # Automated setup script
├── requirements.txt                # Root Python dependencies
└── README.md                       # This file
```

### 🗃️ **Database Setup**

The project uses **SQLite** for development (zero configuration required):

- **Location**: `guitara/db.sqlite3`
- **Migrations**: Automatically applied on first run
- **Production**: PostgreSQL configuration available in settings

### 🔌 **Environment Variables**

Create `.env` file in `guitara/` directory for email configuration:

```bash
# Email Settings (for 2FA)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=Royal Care <noreply@royalcare.com>

# Database (Optional - SQLite used by default)
DATABASE_URL=sqlite:///db.sqlite3

# Security (Optional - defaults provided)
SECRET_KEY=your-secret-key-here
DEBUG=True
```

---

## ⚙️ Configuration

### **Backend Configuration**

- **Database**: The project uses SQLite for development (located at `guitara/db.sqlite3`). For production deployment, configure PostgreSQL in `guitara/guitara/settings.py`.
- **Environment Variables**: Create a `.env` file in the `guitara/` directory with your email settings for two-factor authentication functionality.

### **Frontend Configuration**

- **API Configuration**: The frontend is pre-configured to connect to the Django backend at `http://localhost:8000/api/`. Update the API base URL in `royal-care-frontend/.env` if deploying to a different environment.

---

## 🔧 Troubleshooting

### **Common Issues**

#### **🔍 npm not found (Windows)**

If you see "npm not found" error:

1. **Restart your terminal/command prompt**
2. **Reinstall Node.js** from https://nodejs.org/ (includes npm)
3. **Run as Administrator**
4. The Python starter script will try to find npm in common locations automatically

#### **🐍 Virtual Environment Issues**

```bash
# If venv creation fails, try:
python -m pip install --upgrade pip
python -m venv venv --clear
```

#### **🔌 Port Already in Use**

```bash
# If port 8000 or 5173 is busy:
# Backend: Change port in guitara/manage.py runserver 8001
# Frontend: Change port in royal-care-frontend/vite.config.js
```

#### **🗃️ Database Migration Issues**

```bash
# Reset migrations if needed:
cd guitara
python manage.py migrate --fake-initial
```

#### **📧 Email Configuration Issues**

If 2FA emails aren't sending:

1. Ensure `.env` file exists in `guitara/` directory
2. Use App Password for Gmail (not regular password)
3. Check SMTP settings in environment variables

#### **🌐 CORS Issues**

If frontend can't connect to backend:

1. Ensure both servers are running
2. Check that CORS is properly configured in Django settings
3. Verify API base URL in frontend configuration

### **🛠️ Development Tips**

- **Hot Reload**: Both Django and Vite support hot reload - changes appear automatically
- **API Testing**: Use Django admin at http://localhost:8000/admin/ for data management
- **Browser DevTools**: Use F12 for React debugging and network inspection
- **Logs**: Check terminal outputs for both backend and frontend error messages
- **Database Browser**: Use SQLite browser tools to inspect `guitara/db.sqlite3`

### **📞 Getting Help**

If you encounter issues not covered here:

1. Check the [Archive Documentation](archive/README.md) for implementation guides
2. Review error logs in both terminal windows
3. Ensure all prerequisites are properly installed
4. Try the manual installation steps if automated setup fails

---

## 📡 API Reference

### **Authentication**

| Method | Endpoint                  | Description                | Auth Required |
| ------ | ------------------------- | -------------------------- | ------------- |
| `POST` | `/api/auth/register/`     | Create new user account    | No            |
| `POST` | `/api/auth/login/`        | User authentication        | No            |
| `POST` | `/api/auth/logout/`       | End user session           | Yes           |
| `POST` | `/api/auth/verify-email/` | Email verification for 2FA | No            |

### **User Management**

| Method   | Endpoint              | Description                    | Auth Required |
| -------- | --------------------- | ------------------------------ | ------------- |
| `GET`    | `/api/users/`         | List users (role-based access) | Yes           |
| `GET`    | `/api/users/{id}/`    | Get user details               | Yes           |
| `PUT`    | `/api/users/{id}/`    | Update user information        | Yes           |
| `DELETE` | `/api/users/{id}/`    | Remove user account            | Yes           |
| `GET`    | `/api/users/profile/` | Get current user profile       | Yes           |

### **Scheduling & Appointments**

| Method   | Endpoint                              | Description               | Auth Required |
| -------- | ------------------------------------- | ------------------------- | ------------- |
| `GET`    | `/api/scheduling/appointments/`       | Get all appointments      | Yes           |
| `POST`   | `/api/scheduling/appointments/`       | Create new appointment    | Yes           |
| `PUT`    | `/api/scheduling/appointments/{id}/`  | Update appointment        | Yes           |
| `DELETE` | `/api/scheduling/appointments/{id}/`  | Cancel appointment        | Yes           |
| `GET`    | `/api/scheduling/appointments/today/` | Get today's appointments  | Yes           |
| `GET`    | `/api/scheduling/availability/`       | Check staff availability  | Yes           |
| `POST`   | `/api/scheduling/availability/`       | Set availability schedule | Yes           |

### **Services & Materials**

| Method   | Endpoint               | Description                 | Auth Required |
| -------- | ---------------------- | --------------------------- | ------------- |
| `GET`    | `/api/services/`       | Get available services      | Yes           |
| `POST`   | `/api/services/`       | Create new service          | Yes           |
| `PUT`    | `/api/services/{id}/`  | Update service details      | Yes           |
| `DELETE` | `/api/services/{id}/`  | Remove service              | Yes           |
| `GET`    | `/api/materials/`      | Get material inventory      | Yes           |
| `POST`   | `/api/materials/`      | Add material to inventory   | Yes           |
| `PUT`    | `/api/materials/{id}/` | Update material information | Yes           |

### **Attendance Tracking**

| Method | Endpoint                        | Description                   | Auth Required |
| ------ | ------------------------------- | ----------------------------- | ------------- |
| `POST` | `/api/attendance/check-in/`     | Record staff check-in         | Yes           |
| `POST` | `/api/attendance/check-out/`    | Record staff check-out        | Yes           |
| `GET`  | `/api/attendance/records/`      | Get attendance records        | Yes           |
| `GET`  | `/api/attendance/today-status/` | Get today's attendance status | Yes           |
| `POST` | `/api/attendance/approve/{id}/` | Approve attendance record     | Yes           |

### **Financial & Reporting**

| Method | Endpoint                      | Description              | Auth Required |
| ------ | ----------------------------- | ------------------------ | ------------- |
| `GET`  | `/api/payments/`              | Get payment records      | Yes           |
| `POST` | `/api/payments/`              | Record new payment       | Yes           |
| `GET`  | `/api/payments/reports/`      | Generate sales reports   | Yes           |
| `GET`  | `/api/payments/{id}/receipt/` | Generate payment receipt | Yes           |

**Note**: All authenticated endpoints require a valid Knox token in the Authorization header: `Authorization: Token <your-token>`

---

## 🗄️ Archive & Documentation

The project includes a comprehensive `/archive` directory that contains:

- **📋 Test Scripts**: All validation and testing scripts (Python & JavaScript) organized by category
- **📚 Documentation**: Complete implementation documentation, fix summaries, and progress tracking
- **🔄 Migration History**: Database migration files and schema evolution tracking
- **🛠️ Utility Scripts**: Database setup, notification testing, and validation tools

### Recent Organization Updates

- **June 2025** - Complete archive organization and documentation cleanup:
  - All test scripts moved to `archive/scripts/testing/` with organized subdirectories
  - Documentation updated with proper script references and implementation details
  - Database migration history preserved in `archive/migrations_history/`
  - Utility scripts categorized in `archive/scripts/database/`, `archive/scripts/notification/`
  - **Major Performance Improvements**: Implemented centralized data management reducing API calls by 70%
  - **Enhanced Real-time Features**: Added optimistic updates and smart sync across dashboards
  - **Advanced Loading Components**: Comprehensive loading states with skeleton screens and progress indicators
  - **Account Status Management**: Centralized polling system for disabled account recovery

The archive preserves the complete development history while keeping the main project directories clean and focused on active development code.

See [Archive README](archive/README.md) for detailed information about archived content and how to access specific scripts or documentation.

---

## 🤝 Contributing

We welcome contributions to improve GUITARA! Here's how you can help:

### **How to Contribute**

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Make your changes**
4. **Test your changes** thoroughly
5. **Commit your changes** (`git commit -m 'Add some AmazingFeature'`)
6. **Push to the branch** (`git push origin feature/AmazingFeature`)
7. **Open a Pull Request**

### **Development Guidelines**

- **Code Style**: Follow existing code formatting and conventions
- **Testing**: Add tests for new features and bug fixes using Jest framework
- **Documentation**: Update documentation for any API changes
- **Commit Messages**: Use clear and descriptive commit messages
- **Security**: Never commit sensitive information like credentials or API keys

### **Areas for Contribution**

- 🐛 Bug fixes and improvements
- 📱 Mobile responsiveness enhancements
- 🚀 Performance optimizations
- 📚 Documentation improvements
- 🧪 Test coverage expansion
- 🌟 New feature development

### **Reporting Issues**

- Use the GitHub issue tracker
- Provide detailed reproduction steps
- Include error logs and screenshots
- Specify your environment (OS, browser, etc.)

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📝 Development Notes

### **Repository Organization**

This repository has been thoroughly organized for clarity and maintainability:

- **Core Application** - Main application code in `guitara/` (Django backend) and `royal-care-frontend/` (React frontend)
- **Archive** - Complete archive system containing test scripts, documentation, and development artifacts in organized categories
- **Root Directory** - Essential project files including automated startup scripts, configuration files, and this README

### **Database Evolution**

The project has evolved through different database configurations:

- **Current**: SQLite for development (file: `guitara/db.sqlite3`)
- **Production**: PostgreSQL support maintained in settings
- **History**: Originally used Supabase/PostgreSQL, transitioned to local SQLite for easier development setup

### **Quick Start Scripts**

The project includes a cross-platform automated development environment setup script:

#### **🚀 start_development.py (Recommended)**

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

#### **Development Workflow**

1. **First Time Setup**: Run `python start_development.py` to set up everything
2. **Daily Development**: Simply run `python start_development.py` to start both servers
3. **Manual Control**: If you need fine control, use the manual setup commands in the Installation section

**What You'll See:**

- **Django Backend Terminal**: Running on http://127.0.0.1:8000/
- **React Frontend Terminal**: Running on http://localhost:5173/
- **Browser**: Automatically opens to the React application

---

<div align="center">

**Built with ❤️ for Royal Care Home Service Massage**

_Empowering massage therapy businesses with modern technology_

</div>
