import { useEffect } from "react";
import PageLayout from "../../globals/PageLayout";
import LayoutRow from "../../globals/LayoutRow";
import styles from "./UserGuidePage.module.css";
import pageTitles from "../../constants/pageTitles";

const UserGuidePage = () => {
  useEffect(() => {
    document.title = pageTitles.userGuide;
  }, []);

  return (
    <PageLayout>
      <LayoutRow
        title="User Guide"
        subtitle="Complete step-by-step instructions for using the Royal Care Scheduling System effectively."
      ></LayoutRow>
      <div className={styles.userGuideSection}>
        <div className={styles.userGuideContainer}>
          {/* Table of Contents - Left Sidebar */}
          <nav className={styles.tableOfContents}>
            <h3>Table of Contents</h3>
            <ul className={styles.tocList}>
              <li>
                <a href="#system-requirements">
                  1. System Requirements & Setup
                </a>
              </li>
              <li>
                <a href="#user-onboarding">
                  2. User Onboarding & Account Setup
                </a>
              </li>
              <li>
                <a href="#dashboard-navigation">
                  3. Dashboard Navigation & Core Features
                </a>
              </li>
              <li>
                <a href="#appointment-booking">
                  4. Appointment Booking & Management
                </a>
              </li>
              <li>
                <a href="#material-inventory">
                  5. Material & Inventory Management
                </a>
              </li>
              <li>
                <a href="#attendance-system">6. Attendance & Time Management</a>
              </li>
              <li>
                <a href="#payment-processing">
                  7. Payment Processing & Financial Tracking
                </a>
              </li>
              <li>
                <a href="#technology-specs">8. Technology Specifications</a>
              </li>
              <li>
                <a href="#troubleshooting">
                  9. Troubleshooting & Common Issues
                </a>
              </li>
              <li>
                <a href="#support-resources">
                  10. Support & Additional Resources
                </a>
              </li>
            </ul>
          </nav>

          {/* Main Content Area */}
          <div>
            <div className={styles.userGuideMainContent}>
              <section className={styles.userGuideIntro}>
                <p>
                  Welcome to the comprehensive Royal Care User Guide! This
                  manual provides detailed instructions for system setup,
                  onboarding, and practical usage. Whether you're a new user or
                  setting up the system for the first time, this guide covers
                  everything you need to know.
                </p>
              </section>

              <section className={styles.userGuideContent}>
                {/* System Requirements & Installation */}
                <div className={styles.userGuideBlock} id="system-requirements">
                  <h3>1. System Requirements & Setup</h3>

                  <div className={styles.subSection}>
                    <h4>End User Requirements</h4>
                    <ul className={styles.userGuideList}>
                      <li>
                        <strong>Browser:</strong> Chrome, Firefox, Safari, or
                        Edge (latest versions)
                      </li>
                      <li>
                        <strong>Screen Resolution:</strong> Minimum 1280×720
                        pixels
                      </li>
                      <li>
                        <strong>Internet:</strong> Stable broadband connection
                      </li>
                      <li>
                        <strong>JavaScript:</strong> Must be enabled in browser
                        settings
                      </li>
                      <li>
                        <strong>Device Support:</strong> Desktop, tablet, and
                        mobile devices
                      </li>
                    </ul>
                  </div>

                  <div className={styles.subSection}>
                    <h4>Development/Installation Requirements</h4>
                    <ul className={styles.userGuideList}>
                      <li>
                        <strong>Python:</strong> Version 3.12 or higher with pip
                      </li>
                      <li>
                        <strong>Node.js:</strong> Version 18 or higher with npm
                      </li>
                      <li>
                        <strong>Database:</strong> PostgreSQL 17.2+ (production)
                        or SQLite (development)
                      </li>
                      <li>
                        <strong>Cache:</strong> Redis (for real-time features)
                      </li>
                      <li>
                        <strong>Version Control:</strong> Git
                      </li>
                    </ul>
                  </div>

                  <div className={styles.subSection}>
                    <h4>One-Command Installation (Recommended)</h4>
                    <ol className={styles.userGuideList}>
                      <li>
                        Clone the repository:{" "}
                        <code>git clone &lt;repository-url&gt;</code>
                      </li>
                      <li>
                        Navigate to project directory:{" "}
                        <code>cd Guitara-Scheduling-System</code>
                      </li>
                      <li>
                        Run the automated setup:{" "}
                        <code>python start_development.py</code>
                      </li>
                      <li>
                        Wait for automatic installation and startup of both
                        backend and frontend
                      </li>
                      <li>
                        Access the system at <code>http://localhost:5173/</code>
                      </li>
                    </ol>
                    <p>
                      <em>
                        This command automatically sets up virtual environment,
                        installs dependencies, and starts both servers.
                      </em>
                    </p>
                  </div>

                  <div className={styles.subSection}>
                    <h4>Manual Installation Steps</h4>
                    <ol className={styles.userGuideList}>
                      <li>
                        <strong>Backend Setup:</strong>
                        <ul>
                          <li>
                            Create virtual environment:{" "}
                            <code>python -m venv venv</code>
                          </li>
                          <li>
                            Activate environment:{" "}
                            <code>venv\Scripts\activate</code> (Windows) or{" "}
                            <code>source venv/bin/activate</code> (Mac/Linux)
                          </li>
                          <li>
                            Install dependencies:{" "}
                            <code>pip install -r requirements.txt</code>
                          </li>
                          <li>
                            Navigate to backend: <code>cd guitara</code>
                          </li>
                          <li>
                            Run migrations:{" "}
                            <code>python manage.py migrate</code>
                          </li>
                          <li>
                            Start server:{" "}
                            <code>python manage.py runserver</code>
                          </li>
                        </ul>
                      </li>
                      <li>
                        <strong>Frontend Setup:</strong>
                        <ul>
                          <li>
                            Open new terminal and navigate to frontend:{" "}
                            <code>cd royal-care-frontend</code>
                          </li>
                          <li>
                            Install dependencies: <code>npm install</code>
                          </li>
                          <li>
                            Start development server: <code>npm run dev</code>
                          </li>
                        </ul>
                      </li>
                    </ol>
                  </div>

                  <div className={styles.subSection}>
                    <h4>Docker Deployment</h4>
                    <ol className={styles.userGuideList}>
                      <li>Ensure Docker and Docker Compose are installed</li>
                      <li>
                        Run: <code>docker-compose up --build</code>
                      </li>
                      <li>
                        Access the application at{" "}
                        <code>http://localhost:3000</code>
                      </li>
                      <li>
                        Use <code>docker-compose down</code> to stop services
                      </li>
                    </ol>
                  </div>
                </div>

                {/* User Onboarding */}
                <div className={styles.userGuideBlock} id="user-onboarding">
                  <h3>2. User Onboarding & Account Setup</h3>

                  <div className={styles.subSection}>
                    <h4>First-Time Login Process</h4>
                    <ol className={styles.userGuideList}>
                      <li>
                        <strong>Access the System:</strong> Navigate to the
                        Royal Care login page
                      </li>
                      <li>
                        <strong>Enter Credentials:</strong> Use the username and
                        password provided by your administrator
                      </li>
                      <li>
                        <strong>Two-Factor Authentication:</strong> Check your
                        email for verification code and enter it
                      </li>
                      <li>
                        <strong>Account Activation:</strong> Complete any
                        required profile information
                      </li>
                      <li>
                        <strong>Role Assignment:</strong> Your account will be
                        configured with appropriate role (Operator, Therapist,
                        or Driver)
                      </li>
                    </ol>
                  </div>

                  <div className={styles.subSection}>
                    <h4>Account Types & Permissions</h4>
                    <ul className={styles.userGuideList}>
                      <li>
                        <strong>Operator:</strong> Full system access - manage
                        bookings, inventory, payments, user accounts
                      </li>
                      <li>
                        <strong>Therapist:</strong> View assigned appointments,
                        confirm availability, update service status
                      </li>
                      <li>
                        <strong>Driver:</strong> View transportation requests,
                        update pickup/dropoff status
                      </li>
                    </ul>
                  </div>

                  <div className={styles.subSection}>
                    <h4>Profile Management</h4>
                    <ol className={styles.userGuideList}>
                      <li>Click your profile name in the top navigation bar</li>
                      <li>Select "Profile" from the dropdown menu</li>
                      <li>
                        Update personal information in the "Edit Profile" tab
                      </li>
                      <li>Change password in the "Change Password" tab</li>
                      <li>Save changes to apply updates</li>
                    </ol>
                  </div>
                </div>

                {/* Dashboard Navigation */}
                <div
                  className={styles.userGuideBlock}
                  id="dashboard-navigation"
                >
                  <h3>3. Dashboard Navigation & Core Features</h3>

                  <div className={styles.subSection}>
                    <h4>Dashboard Overview</h4>
                    <ol className={styles.userGuideList}>
                      <li>
                        <strong>Main Dashboard:</strong> Shows upcoming
                        appointments, notifications, and quick actions
                      </li>
                      <li>
                        <strong>Sidebar Navigation:</strong> Access all system
                        modules (Scheduling, Attendance, Inventory, etc.)
                      </li>
                      <li>
                        <strong>Header Tools:</strong> Profile settings,
                        notifications, and logout options
                      </li>
                      <li>
                        <strong>Real-time Updates:</strong> Information updates
                        automatically without page refresh
                      </li>
                    </ol>
                  </div>

                  <div className={styles.subSection}>
                    <h4>Key Navigation Areas</h4>
                    <ul className={styles.userGuideList}>
                      <li>
                        <strong>Scheduling:</strong> Create, view, and manage
                        appointments
                      </li>
                      <li>
                        <strong>Attendance:</strong> Digital check-in/out system
                        and time tracking
                      </li>
                      <li>
                        <strong>Inventory:</strong> Material management and
                        stock tracking
                      </li>
                      <li>
                        <strong>Reports:</strong> Generate sales, attendance,
                        and usage reports
                      </li>
                      <li>
                        <strong>Help:</strong> Access FAQs, User Guide, and
                        support contacts
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Appointment Booking Process */}
                <div className={styles.userGuideBlock} id="appointment-booking">
                  <h3>4. Appointment Booking & Management</h3>

                  <div className={styles.subSection}>
                    <h4>Creating New Appointments</h4>
                    <ol className={styles.userGuideList}>
                      <li>Navigate to "Scheduling" → "Book Appointment"</li>
                      <li>
                        Select client from existing list or add new client
                        details
                      </li>
                      <li>Choose service type from available options</li>
                      <li>Select preferred date and time slot</li>
                      <li>
                        Choose available therapist(s) - enable "Multiple
                        Therapists" if needed
                      </li>
                      <li>Specify required materials and quantities</li>
                      <li>Review booking details and confirm</li>
                      <li>
                        System automatically checks availability and deducts
                        materials
                      </li>
                    </ol>
                  </div>

                  <div className={styles.subSection}>
                    <h4>Appointment Workflow</h4>
                    <ol className={styles.userGuideList}>
                      <li>
                        <strong>Created:</strong> Appointment booked, awaiting
                        therapist confirmation
                      </li>
                      <li>
                        <strong>Confirmed:</strong> Therapist(s) confirmed
                        availability
                      </li>
                      <li>
                        <strong>Driver Assigned:</strong> Transportation
                        arranged (if needed)
                      </li>
                      <li>
                        <strong>In Progress:</strong> Service is being performed
                      </li>
                      <li>
                        <strong>Completed:</strong> Service finished, payment
                        processing
                      </li>
                      <li>
                        <strong>Paid:</strong> Final status with all payments
                        received
                      </li>
                    </ol>
                  </div>

                  <div className={styles.subSection}>
                    <h4>Managing Existing Appointments</h4>
                    <ul className={styles.userGuideList}>
                      <li>View all appointments in "Bookings" page</li>
                      <li>
                        Filter by status, date range, or search by client name
                      </li>
                      <li>
                        Click appointment for detailed view and status updates
                      </li>
                      <li>
                        Use status buttons to progress appointments through
                        workflow
                      </li>
                      <li>Generate reports for completed appointments</li>
                    </ul>
                  </div>
                </div>

                {/* Material & Inventory Management */}
                <div className={styles.userGuideBlock} id="material-inventory">
                  <h3>5. Material & Inventory Management</h3>

                  <div className={styles.subSection}>
                    <h4>Understanding Material Types</h4>
                    <ul className={styles.userGuideList}>
                      <li>
                        <strong>Consumables:</strong> Items used up during
                        service (oils, lotions) - measured in ml/units
                      </li>
                      <li>
                        <strong>Reusables:</strong> Equipment temporarily
                        reserved (towels, tools) - returned after use
                      </li>
                      <li>
                        <strong>Categories:</strong> Massage Oil, Supplies,
                        Equipment for organized tracking
                      </li>
                    </ul>
                  </div>

                  <div className={styles.subSection}>
                    <h4>Inventory Operations</h4>
                    <ol className={styles.userGuideList}>
                      <li>
                        <strong>View Stock:</strong> Navigate to "Inventory" to
                        see current levels
                      </li>
                      <li>
                        <strong>Add Materials:</strong> Click "Add Material" to
                        create new inventory items
                      </li>
                      <li>
                        <strong>Update Stock:</strong> Use "Add Stock" to
                        increase quantities
                      </li>
                      <li>
                        <strong>Track Usage:</strong> View automatic deductions
                        from completed appointments
                      </li>
                      <li>
                        <strong>Low Stock Alerts:</strong> Monitor items
                        approaching minimum thresholds
                      </li>
                    </ol>
                  </div>
                </div>

                {/* Attendance System */}
                <div className={styles.userGuideBlock} id="attendance-system">
                  <h3>6. Attendance & Time Management</h3>

                  <div className={styles.subSection}>
                    <h4>Digital Check-In/Out Process</h4>
                    <ol className={styles.userGuideList}>
                      <li>Navigate to "Attendance" page</li>
                      <li>Click "Check In" when arriving for work</li>
                      <li>
                        System records exact timestamp and calculates status (On
                        Time/Late)
                      </li>
                      <li>Click "Check Out" when leaving work</li>
                      <li>Total hours are automatically calculated</li>
                      <li>Operators can approve/modify attendance records</li>
                    </ol>
                  </div>

                  <div className={styles.subSection}>
                    <h4>Attendance Reporting</h4>
                    <ul className={styles.userGuideList}>
                      <li>
                        View daily, weekly, or monthly attendance summaries
                      </li>
                      <li>Filter by staff member or date range</li>
                      <li>Export reports for payroll processing</li>
                      <li>Track attendance patterns and punctuality</li>
                    </ul>
                  </div>
                </div>

                {/* Payment Processing */}
                <div className={styles.userGuideBlock} id="payment-processing">
                  <h3>7. Payment Processing & Financial Tracking</h3>

                  <div className={styles.subSection}>
                    <h4>Payment Workflow</h4>
                    <ol className={styles.userGuideList}>
                      <li>
                        After appointment completion, therapist requests payment
                      </li>
                      <li>
                        Operator verifies payment method (Cash, GCash, etc.)
                      </li>
                      <li>System generates automatic receipt</li>
                      <li>Payment status updates to "Received"</li>
                      <li>Transaction recorded in financial reports</li>
                    </ol>
                  </div>

                  <div className={styles.subSection}>
                    <h4>Financial Reports</h4>
                    <ul className={styles.userGuideList}>
                      <li>
                        Access "Reports" → "Sales Reports" for revenue tracking
                      </li>
                      <li>
                        Filter by date range, payment method, or service type
                      </li>
                      <li>Export data for accounting purposes</li>
                      <li>Monitor daily, weekly, and monthly trends</li>
                    </ul>
                  </div>
                </div>

                {/* Technology Specifications */}
                <div className={styles.userGuideBlock} id="technology-specs">
                  <h3>8. Technology Specifications</h3>

                  <div className={styles.subSection}>
                    <h4>Frontend Technology Stack</h4>
                    <ul className={styles.userGuideList}>
                      <li>
                        <strong>Framework:</strong> React 19.0 with modern hooks
                        and functional components
                      </li>
                      <li>
                        <strong>Build Tool:</strong> Vite 6.2.0 for fast
                        development and optimized builds
                      </li>
                      <li>
                        <strong>State Management:</strong> Redux Toolkit 2.6.1
                        for predictable state management
                      </li>
                      <li>
                        <strong>Routing:</strong> React Router DOM 6.22 for
                        client-side navigation
                      </li>
                      <li>
                        <strong>HTTP Client:</strong> Axios 1.6.2 for API
                        communication
                      </li>
                      <li>
                        <strong>UI Components:</strong> Custom CSS Modules with
                        React Icons
                      </li>
                    </ul>
                  </div>

                  <div className={styles.subSection}>
                    <h4>Backend Technology Stack</h4>
                    <ul className={styles.userGuideList}>
                      <li>
                        <strong>Framework:</strong> Django 5.1.4 with Django
                        REST Framework 3.14.0
                      </li>
                      <li>
                        <strong>Language:</strong> Python 3.12.8
                      </li>
                      <li>
                        <strong>Database:</strong> SQLite 3.41.2 (development) /
                        PostgreSQL 17.2 (production)
                      </li>
                      <li>
                        <strong>Authentication:</strong> Django REST Knox with
                        JWT tokens
                      </li>
                      <li>
                        <strong>Real-Time:</strong> Django Channels with
                        WebSocket support
                      </li>
                      <li>
                        <strong>Security:</strong> bcrypt password hashing, CORS
                        headers
                      </li>
                    </ul>
                  </div>

                  <div className={styles.subSection}>
                    <h4>Security Features</h4>
                    <ul className={styles.userGuideList}>
                      <li>Two-factor authentication via email verification</li>
                      <li>Role-based access control with secure permissions</li>
                      <li>Account lockout after failed login attempts</li>
                      <li>
                        Input sanitization to prevent security vulnerabilities
                      </li>
                      <li>
                        HTTPS enforcement and secure headers in production
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Troubleshooting */}
                <div className={styles.userGuideBlock} id="troubleshooting">
                  <h3>9. Troubleshooting & Common Issues</h3>

                  <div className={styles.subSection}>
                    <h4>Login Problems</h4>
                    <ul className={styles.userGuideList}>
                      <li>
                        <strong>Forgot Password:</strong> Use "Forgot Password"
                        link on login page
                      </li>
                      <li>
                        <strong>Account Locked:</strong> Wait 15 minutes or
                        contact administrator
                      </li>
                      <li>
                        <strong>Email Code Issues:</strong> Check spam folder or
                        request new code
                      </li>
                      <li>
                        <strong>Browser Issues:</strong> Clear cache/cookies or
                        try different browser
                      </li>
                    </ul>
                  </div>

                  <div className={styles.subSection}>
                    <h4>Performance Optimization</h4>
                    <ul className={styles.userGuideList}>
                      <li>Keep browser updated to latest version</li>
                      <li>
                        Ensure stable internet connection for real-time features
                      </li>
                      <li>Close unnecessary browser tabs to free memory</li>
                      <li>
                        Use recommended screen resolution (1280×720 minimum)
                      </li>
                    </ul>
                  </div>

                  <div className={styles.subSection}>
                    <h4>Data Sync Issues</h4>
                    <ul className={styles.userGuideList}>
                      <li>Refresh page if data appears outdated</li>
                      <li>Check internet connection for real-time updates</li>
                      <li>Log out and back in to reset session</li>
                      <li>Contact support if issues persist</li>
                    </ul>
                  </div>
                </div>

                {/* Support Resources */}
                <div className={styles.userGuideBlock} id="support-resources">
                  <h3>10. Support & Additional Resources</h3>

                  <div className={styles.subSection}>
                    <h4>Getting Help</h4>
                    <ul className={styles.userGuideList}>
                      <li>
                        <strong>FAQs:</strong> Quick answers to common questions
                        at <a href="/dashboard/help/faqs">FAQs page</a>
                      </li>
                      <li>
                        <strong>Email Support:</strong> Direct contact with
                        development team at{" "}
                        <a href="/dashboard/help/contact">Email Support</a>
                      </li>
                      <li>
                        <strong>System Info:</strong> Technical specifications
                        at{" "}
                        <a href="/dashboard/about/system-info">
                          System Information
                        </a>
                      </li>
                      <li>
                        <strong>Administrator:</strong> Contact your local
                        system administrator for account issues
                      </li>
                    </ul>
                  </div>

                  <div className={styles.subSection}>
                    <h4>Best Practices</h4>
                    <ul className={styles.userGuideList}>
                      <li>
                        Regularly check notifications for important updates
                      </li>
                      <li>Keep profile information current and accurate</li>
                      <li>Monitor inventory levels to prevent shortages</li>
                      <li>
                        Process payments promptly to maintain accurate records
                      </li>
                      <li>
                        Use search and filter functions for efficient navigation
                      </li>
                      <li>
                        Report technical issues early to prevent disruptions
                      </li>
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
        <footer className={styles.userGuideFooter}>
          <p>
            <strong>Need more help?</strong> Visit our{" "}
            <a href="/dashboard/help/faqs">FAQs</a> for quick answers, or
            contact <a href="/dashboard/help/contact">Email Support</a> for
            personalized assistance.
          </p>
        </footer>
      </div>
    </PageLayout>
  );
};

export default UserGuidePage;
