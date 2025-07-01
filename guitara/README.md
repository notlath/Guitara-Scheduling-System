# Royal Care Backend System

This directory contains the Django 5.1.4 backend service for the Royal Care home-service massage therapy management system, built with Python 3.12.8.

## Project Structure

```
guitara/
├── manage.py                # Django command-line utility for administrative tasks
├── requirements.txt         # Python dependencies for the backend
├── db.sqlite3              # SQLite 3.45.3 database (only used for development)
├── settings.py             # Project settings file
│
├── authentication/         # User authentication and authorization
│   ├── views.py           # Login, registration, and token management
│   ├── serializers.py     # Data serialization for API responses
│   ├── urls.py            # URL routing for auth endpoints
│   └── ...
│
├── core/                   # Core functionality and models
│   ├── models.py          # CustomUser model and base data models
│   ├── middleware/        # Request/response processing middleware
│   ├── utils/             # Utility functions and helpers
│   └── ...
│
├── registration/           # Service and facility registration
│   ├── models.py          # Models for services, materials, etc.
│   ├── views.py           # API endpoints for registration
│   └── ...
│
├── scheduling/             # Booking and calendar management
│   ├── models.py          # Booking, availability, and calendar models
│   ├── consumers.py       # WebSocket consumers for real-time updates
│   ├── services/          # Business logic for scheduling operations
│   └── ...
│
└── guitara/               # Project configuration
    ├── settings.py        # Main Django settings
    ├── urls.py            # Main URL routing configuration
    ├── asgi.py            # ASGI configuration for WebSocket support
    └── wsgi.py            # WSGI configuration for HTTP requests
```

## Setup Instructions

### Prerequisites

- Python 3.12.8
- PostgreSQL 15.8+ (with Supabase for production)
- Redis (for WebSocket and async tasks)

### Environment Configuration

1. Create a `.env` file in the project root with the following variables:

```
# Database configuration
SUPABASE_DB_NAME=your_db_name
SUPABASE_DB_USER=your_db_user
SUPABASE_DB_PASSWORD=your_db_password
SUPABASE_DB_HOST=your_db_host

# Email configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_email@example.com
EMAIL_HOST_PASSWORD=your_app_password
DEFAULT_FROM_EMAIL=Royal Care <noreply@royalcare.com>
```

### Installation

1. Install dependencies:

   ```
   pip install -r requirements.txt
   ```

2. Apply migrations:

   ```
   python manage.py migrate
   ```

3. Create a superuser:

   ```
   python manage.py createsuperuser
   ```

4. Run the development server:
   ```
   python manage.py runserver
   ```

## API Documentation

The backend provides a REST API with the following main endpoints:

- **Authentication**

  - `/api/auth/register/` - Create new user accounts
  - `/api/auth/login/` - Obtain authentication tokens
  - `/api/auth/logout/` - Invalidate authentication tokens

- **User Management**

  - `/api/users/` - List and manage user accounts
  - `/api/users/profile/` - Update user profile information

- **Services**

  - `/api/services/` - Manage available massage services
  - `/api/materials/` - Manage service materials and inventory

- **Scheduling**

  - `/api/bookings/` - Create and manage client bookings
  - `/api/availability/` - Check therapist availability
  - `/api/calendar/` - View scheduling calendar

- **WebSocket Endpoints**
  - `/ws/scheduling/` - Real-time booking updates

## Authentication

The API uses Knox token authentication. Include the token in the `Authorization` header:

```
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b
```

## Security Measures

- CORS protection with whitelisted origins
- XSS prevention through content security policies
- Input sanitization middleware
- HTTPS enforcement in production
- Secure password hashing with BCrypt

## Development Guidelines

- Run tests before committing: `python manage.py test`
- Follow PEP 8 style guidelines
- Use Django's ORM for database operations
- Document all API endpoints and parameters
