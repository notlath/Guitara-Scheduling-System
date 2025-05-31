# Royal Care Frontend

This is the frontend for the Royal Care Scheduling System, built with **React** and **Vite**. It connects to a Django backend and provides a modern, responsive interface for operators, therapists, and drivers to manage home-service massage bookings.

## Features

- **Modern Tech Stack**: React v19 with Vite for fast development and optimized builds
- **State Management**: Redux Toolkit for predictable state management
- **Authentication**: Complete authentication flow with JWT tokens and two-factor authentication
- **Role-based Access**: Custom dashboards for operators, therapists, and drivers
- **Real-time Updates**: WebSocket integration for live booking notifications
- **Business Modules**:
  - Scheduling and booking management
  - Attendance tracking
  - Inventory management
  - Sales reporting and analytics
- **Responsive Design**: Mobile-friendly interface for field staff
- **API Integration**: Seamless connection with Django backend and Supabase services

## Project Structure

```
royal-care-frontend/
├── public/           # Static assets
├── src/
│   ├── assets/       # Images and icons
│   │   └── images/   # Application images including logos
│   ├── components/   # Reusable UI components
│   │   ├── MainLayout.jsx     # Main application layout with navigation
│   │   ├── DriverDashboard.jsx # Dashboard for driver role
│   │   ├── OperatorDashboard.jsx # Dashboard for operator role
│   │   └── TherapistDashboard.jsx # Dashboard for therapist role
│   ├── features/     # Redux slices and feature logic
│   │   ├── auth/     # Authentication state management
│   │   └── websocket/ # WebSocket connection handling
│   ├── pages/        # Route-based pages
│   │   ├── AboutPages/   # Company and system information
│   │   ├── AttendancePage/ # Attendance tracking interface
│   │   ├── BookingsPage/  # Booking management interface
│   │   ├── HelpPages/    # Help documentation and support
│   │   ├── InventoryPage/ # Inventory management interface
│   │   ├── LoginPage/    # Authentication screens
│   │   ├── ProfilePage/  # User profile management
│   │   └── SalesReportsPage/ # Sales reporting and analytics
│   ├── services/     # API and utility services
│   ├── styles/       # CSS and theming
│   │   ├── MainLayout.css  # Layout styling
│   │   ├── CompanyInfo.css # Company information styling
│   │   ├── Placeholders.css # Placeholder content styling
│   │   └── theme.css    # Global theme variables
│   ├── App.jsx       # Main app component and routing
│   ├── main.jsx      # Entry point
│   └── store.js      # Redux store configuration
├── package.json      # Project metadata and scripts
├── vite.config.js    # Vite configuration
└── README.md         # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm (comes with Node.js)

### Installation

1. Open a terminal in the `royal-care-frontend` directory.
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Start the development server:
   ```powershell
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

### Linting

To check code style and find issues:

```powershell
npm run lint
```

### Building for Production

```powershell
npm run build
```

### Environment Variables

Create a `.env` file in the root of `royal-care-frontend` with the following variables:

```
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Key Components

#### User Authentication

The application implements a complete authentication flow including:

- Login with email/password
- Two-factor authentication
- Password reset flow
- JWT token management
- Role-based access control

#### WebSocket Integration

Real-time updates for:

- New bookings notifications
- Appointment status changes
- Service assignment alerts
- System announcements

#### Role-Based Dashboards

- **Operators**: Manage bookings, therapists, and overall operations
- **Therapists**: View assigned appointments and manage their schedule
- **Drivers**: Track transport assignments and delivery status

## Connecting to the Backend

This frontend connects to the Django backend located in the `/guitara` directory. Make sure the backend server is running before starting the frontend application.

## Useful Links

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [Supabase Documentation](https://supabase.com/docs)
- [React Router Documentation](https://reactrouter.com/)

## Contributing

1. Follow the project's coding standards and file organization
2. Update CSS in the appropriate files in the `src/styles` directory
3. Add new components in the appropriate directories based on their function
4. Test features across different roles before submitting changes

---

For backend setup and API documentation, see the `guitara/` directory and its `README.md`.
