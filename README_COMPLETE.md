# Royal Care Home Service Massage Scheduling System

## 🏠 Complete Service Flow Implementation

A comprehensive real-time scheduling management system for home service massage therapy with multi-therapist coordination, driver assignment, and complete workflow management.

## ✨ Features

### 🔄 Complete Service Workflow

- **Booking Creation**: Single and multi-therapist appointments
- **Acceptance Phase**: Therapist and driver coordination
- **Confirmation**: Readiness verification from all parties
- **Journey Management**: Real-time transport coordination
- **Session Execution**: Live session tracking and payment handling
- **Pickup Coordination**: Normal and urgent pickup requests

### 👥 Multi-Role Dashboard System

- **Operator Dashboard**: Complete workflow oversight and driver coordination
- **Therapist Dashboard**: Session management and team coordination
- **Driver Dashboard**: Transport and pickup management

### 🚗 Advanced Transport Features

- **Carpooling Logic**: Efficient multi-therapist transport
- **Proximity-Based Assignment**: Zone-based driver coordination
- **Urgent Pickup Requests**: Priority handling for time-sensitive situations
- **Real-time Status Updates**: Live workflow progress tracking

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

### 1. Clone and Setup

```bash
git clone <repository-url>
cd Guitara-Scheduling-System
```

### 2. Backend Setup

```bash
cd guitara
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 3. Frontend Setup

```bash
cd royal-care-frontend
npm install
npm run dev
```

### 4. Quick Status Check

```bash
python check_system_status.py
```

### 5. Run Complete Test

```bash
python test_complete_workflow.py
```

## 📋 System Status Check

Use the built-in status checker to verify your setup:

```bash
python check_system_status.py
```

This will check:

- ✅ Implementation files
- ✅ Backend server (http://127.0.0.1:8000)
- ✅ Frontend server (http://127.0.0.1:5173)
- ✅ Database connectivity

## 🧪 Testing

### Automated Testing

Run the complete workflow test:

```bash
python test_complete_workflow.py
```

This tests:

- User authentication for all roles
- Appointment creation and acceptance
- Complete workflow progression
- Status transitions and updates
- Pickup request handling

### Manual Testing

1. Open http://127.0.0.1:5173
2. Login as different roles:
   - Operator: Create and manage appointments
   - Therapist: Accept appointments and manage sessions
   - Driver: Handle transport and pickups
3. Test the complete service flow

## 🏗️ Architecture

### Backend (Django)

- **Enhanced Models**: Multi-therapist support, workflow status tracking
- **API Endpoints**: 8+ new endpoints for workflow management
- **Database**: Comprehensive appointment and coordination data

### Frontend (React/Redux)

- **State Management**: Optimized Redux store with real-time updates
- **Component Architecture**: Modular dashboard components
- **UI/UX**: Intuitive interfaces for all user roles

### Key Workflows

#### Service Flow States

```
pending → confirmed → therapist_confirmed → driver_confirmed
→ journey_started → arrived → session_started → payment_requested
→ payment_completed → completed → pickup_requested
```

#### User Role Actions

- **Operators**: Appointment creation, driver assignment, workflow monitoring
- **Therapists**: Acceptance, confirmation, session management, pickup requests
- **Drivers**: Transport confirmation, journey management, pickup coordination

## 📱 Dashboard Features

### Operator Dashboard

- **Workflow Overview**: Complete appointment progression tracking
- **Driver Coordination**: Manual and automatic assignment
- **Pickup Management**: Urgent and normal pickup request handling
- **Real-time Monitoring**: Active session and transport tracking

### Therapist Dashboard

- **Team Coordination**: Multi-therapist appointment management
- **Session Control**: Start, payment, and completion handling
- **Pickup Requests**: Normal and urgent pickup options
- **Status Tracking**: Real-time appointment progress

### Driver Dashboard

- **Transport Management**: Journey and pickup coordination
- **Multi-therapist Support**: Group transport handling
- **Proximity Features**: Zone-based assignment optimization
- **Status Updates**: Real-time location and availability tracking

## 🔧 Configuration

### Environment Setup

1. **Database**: SQLite (default) or PostgreSQL for production
2. **Authentication**: Token-based with role management
3. **Real-time Updates**: WebSocket-ready with fallback polling

### Customization Options

- **Zones**: Configure delivery zones in `DriverDashboard.jsx`
- **Polling Intervals**: Adjust update frequencies in sync service
- **UI Themes**: Customize styles in component CSS files

## 📚 API Documentation

### New Workflow Endpoints

- `POST /api/appointments/{id}/therapist_confirm/` - Therapist confirms readiness
- `POST /api/appointments/{id}/driver_confirm/` - Driver confirms availability
- `POST /api/appointments/{id}/start_journey/` - Start transport journey
- `POST /api/appointments/{id}/mark_arrived/` - Mark arrival at location
- `POST /api/appointments/{id}/start_session/` - Begin therapy session
- `POST /api/appointments/{id}/request_payment/` - Request payment
- `POST /api/appointments/{id}/complete_appointment/` - Complete session
- `POST /api/appointments/{id}/request_pickup/` - Request pickup

### Authentication

All endpoints require token authentication:

```bash
Authorization: Token <your-token-here>
```

## 🛠️ Development

### File Structure

```
guitara/                    # Django backend
├── scheduling/
│   ├── models.py          # Enhanced appointment model
│   ├── views.py           # Workflow endpoints
│   └── migrations/        # Database migrations
royal-care-frontend/        # React frontend
├── src/
│   ├── components/        # Dashboard components
│   ├── features/          # Redux store
│   └── styles/            # Component styles
```

### Key Files Modified

- `guitara/scheduling/models.py` - Enhanced Appointment model
- `guitara/scheduling/views.py` - New workflow endpoints
- `royal-care-frontend/src/components/OperatorDashboard.jsx` - Enhanced operator interface
- `royal-care-frontend/src/components/TherapistDashboard.jsx` - Enhanced therapist interface
- `royal-care-frontend/src/components/DriverDashboard.jsx` - Enhanced driver interface
- `royal-care-frontend/src/features/scheduling/schedulingSlice.js` - Redux actions

### Development Scripts

- `python check_system_status.py` - System health check
- `python test_complete_workflow.py` - End-to-end testing
- `python start_development.py` - Development server startup

## 📊 Monitoring

### Real-time Features

- **Status Updates**: Live appointment progression
- **Notification System**: WebSocket-ready infrastructure
- **Error Handling**: Comprehensive error management
- **Performance Optimization**: Adaptive polling and selective updates

### Analytics Ready

- Session completion rates
- Average response times
- Driver utilization metrics
- Customer satisfaction tracking

## 🔐 Security

### Authentication & Authorization

- **Role-based Access**: Operator, Therapist, Driver permissions
- **Token Security**: Secure token-based authentication
- **Input Validation**: Comprehensive data validation
- **Error Handling**: Secure error messages

### Data Protection

- Sensitive data encryption
- Audit trail logging
- GDPR compliance ready
- Secure communication protocols

## 🚀 Production Deployment

### Environment Variables

```bash
DEBUG=False
SECRET_KEY=<your-secret-key>
DATABASE_URL=<your-database-url>
ALLOWED_HOSTS=<your-domain>
```

### Performance Optimization

- **Database Indexing**: Optimized queries for large datasets
- **Caching**: Redis-ready caching infrastructure
- **CDN Ready**: Static asset optimization
- **Load Balancing**: Horizontal scaling support

## 📈 Future Enhancements

### Planned Features

- **GPS Integration**: Real-time location tracking
- **Mobile Apps**: Native iOS/Android applications
- **Payment Gateway**: Integrated payment processing
- **Analytics Dashboard**: Business intelligence and reporting
- **Notification System**: Email/SMS notifications
- **Calendar Integration**: External calendar synchronization

### Technical Roadmap

- **WebSocket Implementation**: Full real-time communication
- **Microservices Architecture**: Service decomposition
- **Container Deployment**: Docker and Kubernetes support
- **API Versioning**: Backward compatibility management

## 📞 Support

### Documentation

- [Complete Implementation Summary](COMPLETE_IMPLEMENTATION_FINAL.md)
- [Driver Assignment Analysis](DRIVER_ASSIGNMENT_COMPLETE_ANALYSIS.md)
- [Operator Dashboard Guide](OPERATOR_DRIVER_ASSIGNMENT_ANALYSIS.md)

### Testing

- Run system status check: `python check_system_status.py`
- Execute full workflow test: `python test_complete_workflow.py`
- Manual testing guide in documentation

### Issues

For technical issues:

1. Check system status
2. Review error logs
3. Verify database migrations
4. Test individual components

## 📄 License

Copyright (c) 2024 Royal Care Home Service. All rights reserved.

---

**🏠 Royal Care Scheduling System** - Complete service flow implementation for professional home massage therapy coordination.
