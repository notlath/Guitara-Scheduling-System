# Royal Care Frontend

This is the frontend for the Royal Care Scheduling System, built with **React 19.1.0** and **Vite 6.2.2**. It connects to a Django backend and provides a modern, responsive interface for operators, therapists, and drivers to manage home-service massage bookings.

## Features

- **Modern Tech Stack**: React v19.1.0 with Vite 6.2.2 for fast development and optimized builds
- **State Management**: Redux Toolkit 2.8.2 for predictable state management
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

1. **Use Global Components:**

   - For tabs, use `TabSwitcher` and its styles in `tabswitcher.css`.
   - For layout rows, use `LayoutRow` (`layoutrow.jsx`) and its styles in `layoutrow.css`.
   - **Do not create redundant tab or row components.**

1. **Consistency:**

   - Reuse global styles and components for a consistent look and feel.
   - Avoid duplicating logic or UI patterns that already exist in the codebase.

1. **Box Shadows & Borders:**

   - **Do NOT use `box-shadow`.**
   - If you need separation or emphasis, use a border instead (with global variables from `theme.css` or `app.css`).
   - If you need to blur or dim the background (e.g., for modals or overlays), use:
     ```css
     background: rgba(0, 0, 0, 0.6);
     backdrop-filter: blur(4px);
     -webkit-backdrop-filter: blur(4px);
     ```
   - This applies to overlays, modals, and any feature requiring background dimming or blur.

1. **Text Transformation:**

   - **Do NOT use `text-transform: uppercase`.**
   - Let text display in its natural case for better readability and user experience.
   - If uppercase styling is absolutely necessary for design purposes, handle it in the content itself rather than CSS transformation.

1. **Icons:**

   - **ONLY use Material Design icons from `react-icons/md`.**
   - Import Material Design icons like: `import { MdIconName } from "react-icons/md";`
   - Do not use icons from other libraries (FontAwesome, Heroicons, etc.) to maintain design consistency.
   - Material Design icons ensure consistent visual language throughout the application.

1. **CSS Location & Inline Styles:**

   - Place all new CSS in the appropriate file in `src/styles/` or the relevant `.module.css` file for the component or page.
   - **Avoid doing inline styles as much as possible! Use the corresponding CSS files instead.**
   - Only use inline styles if absolutely necessary and there is no better alternative.

1. **Component Placement:**

   - Add new components in the correct directory based on their function.
   - Avoid creating duplicate or redundant components.

1. **Testing:**
   - Test all features across different user roles and screen sizes before submitting changes.

## Pages Folder Structure

- The `src/pages/` directory contains a separate folder for each page in the application.
- **Example:** For the Settings Data page, there is a folder named `SettingsDataPage` (case-sensitive, match existing convention), and inside that folder are the main `.jsx` file and a corresponding `.module.css` file for styles.
- **When creating new pages:**
  - Always create a new folder inside `src/pages/` for the page.
  - Place the main component (e.g., `MyNewPage.jsx`) and its CSS module (e.g., `MyNewPage.module.css`) inside that folder.
  - This keeps code organized and makes it easy to manage page-specific logic and styles.

**When setting the page title for a new page, always use the centralized `pageTitles.js` in `src/constants/` for consistency and branding.**

## Global Components and Styles

- If you are creating a new global file (such as a layout component, tab switcher, or shared theme/styles), place it in the `src/globals/` directory.
- Examples of global files include:
  - `src/globals/LayoutRow.jsx`
  - `src/globals/LayoutRow.css`
  - `src/globals/PageLayout.jsx`
  - `src/globals/TabSwitcher.css`
  - `src/globals/theme.css`
- This keeps all shared/global components and styles organized and easy to find.

## Copywriting Tone, Style & Consistency Guidelines

> **Note:** The primary users of this system are therapists and drivers who are not highly tech-proficient and are typically in the 23–35 age range. Always prioritize clarity, simplicity, and approachability in all UI text to ensure accessibility and ease of use for this audience.

To ensure a consistent, user-friendly, and professional experience across the app, all visible text (labels, placeholders, error messages, buttons, etc.) should follow these guidelines:

### 1. Tone & Voice

- **Clear and Friendly:** Use language that is welcoming and easy to understand.
- **Professional but Approachable:** Avoid jargon, but maintain a professional, respectful tone.
- **Concise:** Keep all text as brief as possible while maintaining clarity. Remove unnecessary words and redundancy.
- **Action-Oriented:** Button and link texts should clearly state the action.
- **Helpful Error Messages:** Guide the user to resolve issues, not just state the problem.

### 2. Capitalization & Formatting

- **Title Case:**
  - Use Title Case (capitalize major words) for:
    - Page headers (e.g., `Forgot Your Password?`)
    - Section headers
    - Field labels (e.g., `Email Address`, `Create Password`)
    - Button text (e.g., `Send Reset Code`, `Complete Registration`)
- **Sentence case:**
  - Use sentence case (only first word and proper nouns capitalized) for:
    - Placeholders (e.g., `e.g. johndoe@email.com`, `Enter your password`)
    - Link text (e.g., `Back to login`, `Forgot your password?`)
    - Form submission error messages (e.g., `Please enter your password.`, `Login failed. Please check your credentials and try again.`)
    - Success/status messages (e.g., `Registration successful! Redirecting you to your dashboard`, `Verification code sent to your email`)
    - Instructional/helper text (e.g., `Please enter the 6-digit code below to verify your email address`, `Choose a strong password with at least 8 characters`)
    - Validation error messages (e.g., `Please enter your email address`, `Password must be at least 8 characters`)
- **Avoid Redundancy:**
  - Do not repeat the label in the placeholder (e.g., label: `Email Address`, placeholder: `e.g. johndoe@email.com`)
- **Consistent Punctuation:**
  - End form submission error messages with a period.
  - Do not use periods in labels, buttons, placeholders, success/status messages, instructional/helper text, or validation error messages.

### 3. UI Element Guidelines

- **Headers:**
  - Use Title Case.
  - Be concise and welcoming (e.g., `Welcome Back!`, `Complete Your Account Registration`).
- **Labels:**
  - Use Title Case.
  - Be specific (e.g., `Email Address`, `Mobile Number`).
- **Placeholders:**
  - Use sentence case.
  - Give an example or clarify expected input (e.g., `e.g. johndoe@email.com`, `Enter your password`).
- **Buttons:**
  - Use Title Case.
  - Be action-oriented (e.g., `Send Reset Code`, `Log In`, `Complete Registration`).
- **Links:**
  - Use sentence case.
  - Be clear and direct (e.g., `Back to login`, `Forgot your password?`, `First time here? Complete your registration.`)
- **Error/Success Messages:**
  - Use sentence case.
  - Be specific and helpful (e.g., `Please enter your password.`, `Failed to send reset code. Please check your email address and try again.`)
  - Form submission error messages should end with a period.
  - Success/status messages should not end with a period (e.g., `Verification code sent to your email`, `Registration successful! Redirecting you to your dashboard`)
  - If possible, suggest a next step.
- **Validation Error Messages:**
  - Use sentence case.
  - Be specific and helpful (e.g., `Please enter your email address`, `Password must be at least 8 characters`)
  - Do not end with a period.
- **Instructional/Helper Text:**
  - Use sentence case.
  - Be clear and concise (e.g., `Please enter the 6-digit code below to verify your email address`, `Choose a strong password with at least 8 characters`)
  - Do not end with a period.
- **Password Requirements:**
  - Use sentence case and be explicit (e.g., `Contains at least one lowercase letter (a-z)`).

### 4. Examples for Consistency

#### Registration Page

- **Header:** `Complete Your Account Registration`
- **Email Field:**
  - Label: `Email Address`
  - Placeholder: `e.g. johndoe@email.com`
- **Password Field:**
  - Label: `Create Password`
  - Placeholder: `Choose a strong password`
  - Password requirements (popup):
    - `Contains at least one lowercase letter (a-z)`
    - `Contains at least one uppercase letter (A-Z)`
    - `Contains at least one number (0-9)`
    - `Contains at least one special character (@$!%*?&)`
    - `Is at least 8 characters long`
- **Submit Button:** `Complete Registration`
- **Success Message:** `Registration successful! Redirecting you to your dashboard`
- **Error Example:** `Please enter a valid 10-digit Philippine mobile number (e.g., 9123456789).`

#### Login Page

- **Header:** `Welcome Back!`
- **Username Field:**
  - Label: `Email or Username`
  - Placeholder: `Enter your email or username`
  - Error: `Please enter your email or username.`
- **Password Field:**
  - Label: `Password`
  - Placeholder: `Enter your password`
  - Error: `Please enter your password.`
- **2FA Field:**
  - Label: `Two-Factor Authentication Code`
  - Placeholder: `Enter the 6-digit code`
  - Error: `Please enter the 6-digit verification code.`
- **Forgot Password Link:** `Forgot your password?`
- **Submit Button:** `Log In` / `Verify Code`
- **Registration Link:** `First time here? Complete your registration.`
- **Error Example:** `Login failed. Please check your credentials and try again.`

#### Forgot Password Page

- **Header:** `Forgot Your Password?`
- **Email Field:**
  - Label: `Email Address`
  - Placeholder: `e.g. johndoe@email.com`
- **Submit Button:** `Send Reset Code`
- **Error Example:** `Failed to send reset code. Please check your email address and try again.`
- **Back Link:** `Back to login`

### 5. Additional Details

- **Accessibility:**
  - Use `aria-label` or `aria-describedby` for additional context if needed.
  - Ensure all buttons and links are keyboard accessible.
- **Internationalization:**
  - Avoid idioms or slang that may not translate well.
- **Consistency:**
  - Always review new UI text against these guidelines and examples before merging or releasing.

---

**Always review new UI text against these guidelines and examples for consistency, clarity, and the best possible user experience.**

---

For backend setup and API documentation, see the `guitara/` directory and its `README.md`.
