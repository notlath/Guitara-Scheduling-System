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

**Prerequisites:** Python 3.12+, Node.js 18+, PostgreSQL 17.2

**Backend (Windows):**

```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate

# Navigate to backend directory
cd guitara

# Install dependencies
pip install -r requirements.txt

# Apply migrations
python manage.py migrate

# Start the development server
python manage.py runserver
```

**Frontend:**

```bash
# Navigate to frontend directory
cd royal-care-frontend

# Install dependencies
npm install

# Start the frontend development server
npm run dev
```

---

## ⚙️ Configuration

- **Backend:** Update `guitara/settings.py` for database and email settings.
- **Frontend:** Update API base URL in `royal-care-frontend/.env`.

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
