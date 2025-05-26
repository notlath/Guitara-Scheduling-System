# Royal Care Frontend

This is the frontend for the Royal Care Scheduling System, built with **React** and **Vite**. It connects to a Django backend and provides a modern, responsive interface for users such as operators, therapists, and drivers.

## Features

- Modern React (v19) with Vite for fast development
- State management with Redux Toolkit
- Authentication and 2FA flows
- Role-based dashboards (Operator, Therapist, Driver)
- Scheduling, attendance, inventory, and booking management
- API integration with Django backend and Supabase
- Modular component and page structure
- Custom styles and theming

## Project Structure

```
royal-care-frontend/
├── public/           # Static assets
├── src/
│   ├── assets/       # Images and icons
│   ├── components/   # Reusable UI components
│   ├── features/     # Redux slices and feature logic
│   ├── pages/        # Route-based pages
│   ├── services/     # API and utility services
│   ├── styles/       # CSS and theming
│   ├── App.jsx       # Main app component
│   ├── main.jsx      # Entry point
│   └── store.js      # Redux store setup
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

Create a `.env` file in the root of `royal-care-frontend` for API keys and secrets (see `.env.example` if available).

## Useful Links

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [Supabase](https://supabase.com/)

---

For backend setup, see the `guitara/` directory and its `README.md`.
