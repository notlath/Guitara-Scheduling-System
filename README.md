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
- **Database**: PostgreSQL 17.2
- **Authentication**: Django REST Knox
- **Real-time**: WebSockets (Django Channels)

### **Frontend**

- **Library**: React 19.0
- **State Management**: Redux Toolkit
- **Styling**: CSS Modules
- **API Client**: Axios

### **Tools**

- **Email**: SMTP (Gmail)
- **Deployment**: Docker (TBD)
- **Testing**: pytest (TBD)

---

## 📥 Installation

### **Prerequisites**

- Python 3.12+, Node.js 18+, PostgreSQL 17.2

### **Backend Setup**

```bash
git clone https://github.com/notlath/Guitara-Scheduling-System.git
cd guitara/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Migrate database
python manage.py migrate
```
