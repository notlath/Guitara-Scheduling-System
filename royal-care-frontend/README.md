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
├── public/                             # Static assets
├── src/
│   ├── assets/                         # Images and icons
│   │   └── images/                     # Application images including logos
│   ├── components/                     # Reusable UI components
│   │   ├── MainLayout.jsx              # Main application layout with navigation
│   │   ├── DriverDashboard.jsx         # Dashboard for driver role
│   │   ├── OperatorDashboard.jsx       # Dashboard for operator role
│   │   └── TherapistDashboard.jsx      # Dashboard for therapist role
│   ├── features/                       # Redux slices and feature logic
│   │   ├── auth/                       # Authentication state management
│   │   └── websocket/                  # WebSocket connection handling
│   ├── pages/                          # Route-based pages
│   │   ├── AboutPages/                 # Company and system information
│   │   ├── AttendancePage/             # Attendance tracking interface
│   │   ├── BookingsPage/               # Booking management interface
│   │   ├── HelpPages/                  # Help documentation and support
│   │   ├── InventoryPage/              # Inventory management interface
│   │   ├── LoginPage/                  # Authentication screens
│   │   ├── ProfilePage/                # User profile management
│   │   └── SalesReportsPage/           # Sales reporting and analytics
│   ├── services/                       # API and utility services
│   ├── styles/                         # CSS and theming
│   │   ├── MainLayout.css              # Layout styling
│   │   ├── CompanyInfo.css             # Company information styling
│   │   ├── Placeholders.css            # Placeholder content styling
│   │   ├── theme.css                   # Global theme variables (USE THESE!)
│   │   └── app.css                     # Global app styles (USE THESE!)
│   ├── App.jsx                         # Main app component and routing
│   ├── main.jsx                        # Entry point
│   └── store.js                        # Redux store configuration
├── package.json                        # Project metadata and scripts
├── vite.config.js                      # Vite configuration
└── README.md                           # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm (comes with Node.js)

### Installation

1. Open a terminal in the `royal-care-frontend` directory.

```powershell
npm install --legacy-peer-deps
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

## Frontend Coding Rules & Guidelines

> **Please follow these rules for all frontend development!**

1. **Use Global Variables:**

   - All color, spacing, and font variables are defined in `theme.css` and `app.css`. **Always use these variables!**
   - Do not hardcode colors, spacing, or font sizes unless absolutely necessary.

2. **Use Global Components:**

   - For tabs, use `TabSwitcher` and its styles in `tabswitcher.css`.
   - For layout rows, use `LayoutRow` (`layoutrow.jsx`) and its styles in `layoutrow.css`.
   - **Do not create redundant tab or row components.**

3. **Consistency:**

   - Reuse global styles and components for a consistent look and feel.
   - Avoid duplicating logic or UI patterns that already exist in the codebase.

4. **Box Shadows & Borders:**

   - **Do NOT use `box-shadow`.**
   - If you need separation or emphasis, use a border instead (with global variables from `theme.css` or `app.css`).
   - If you need to blur or dim the background (e.g., for modals or overlays), use:
     ```css
     background: rgba(0, 0, 0, 0.6);
     backdrop-filter: blur(4px);
     -webkit-backdrop-filter: blur(4px);
     ```
   - This applies to overlays, modals, and any feature requiring background dimming or blur.

5. **CSS Location:**

   - Place all new CSS in the appropriate file in `src/styles/`.
   - Do not inline styles unless absolutely necessary.

6. **Component Placement:**

   - Add new components in the correct directory based on their function.
   - Avoid creating duplicate or redundant components.

7. **Testing:**
   - Test all features across different user roles and screen sizes before submitting changes.

## Pages Folder Structure

- The `src/pages/` directory contains a separate folder for each page in the application.
- **Example:** For the Settings Data page, there is a folder named `SettingsDataPage` (case-sensitive, match existing convention), and inside that folder are the main `.jsx` file and a corresponding `.module.css` file for styles.
- **When creating new pages:**
  - Always create a new folder inside `src/pages/` for the page.
  - Place the main component (e.g., `MyNewPage.jsx`) and its CSS module (e.g., `MyNewPage.module.css`) inside that folder.
  - This keeps code organized and makes it easy to manage page-specific logic and styles.

---

For backend setup and API documentation, see the `guitara/` directory and its `README.md`.
