import { useEffect } from "react";
import pageTitles from "../../constants/pageTitles";
import "../../globals/theme.css";
import "../../styles/SystemInfo.css";

const SystemInfoPage = () => {
  useEffect(() => {
    document.title = pageTitles.systemInfo;
  }, []);

  return (
    <div className="system-info-container">
      <div className="system-info-content">
        <div className="system-info-header">
          <h1>System Information</h1>
          <p>Technical details and specifications of the Royal Care platform</p>
        </div>

        <div className="system-info-body">
          <section className="info-section">
            <h2>Current Version</h2>
            <div className="version-info">
              <span className="version-badge">Pre-release</span>
              <p>
                The Royal Care Scheduling System is currently in development
                phase. This version includes core scheduling functionality,
                authentication, and user role management.
              </p>
            </div>
          </section>

          <section className="info-section">
            <h2>Technology Stack</h2>
            <div className="tech-stack">
              <div className="stack-group">
                <h3>Frontend</h3>
                <ul>
                  <li>
                    <span className="tech-label">Library:</span> React 19.0
                  </li>
                  <li>
                    <span className="tech-label">Build Tool:</span> Vite 6.2.0
                  </li>
                  <li>
                    <span className="tech-label">State Management:</span> Redux
                    Toolkit
                  </li>
                  <li>
                    <span className="tech-label">Routing:</span> React Router
                    6.22
                  </li>
                  <li>
                    <span className="tech-label">API Client:</span> Axios
                  </li>
                  <li>
                    <span className="tech-label">UI Components:</span> Custom
                    CSS with React Icons
                  </li>
                </ul>
              </div>
              <div className="stack-group">
                <h3>Backend</h3>
                <ul>
                  <li>
                    <span className="tech-label">Framework:</span> Django 5.1.4
                  </li>
                  <li>
                    <span className="tech-label">API:</span> Django REST
                    Framework
                  </li>
                  <li>
                    <span className="tech-label">Database:</span> PostgreSQL
                    17.2
                  </li>
                  <li>
                    <span className="tech-label">Authentication:</span> Django
                    REST Knox
                  </li>
                  <li>
                    <span className="tech-label">Real-time:</span> WebSockets
                    (Django Channels)
                  </li>
                  <li>
                    <span className="tech-label">Cloud:</span> Supabase
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="info-section">
            <h2>Architecture Overview</h2>
            <p>
              The Royal Care Scheduling System uses a modern client-server
              architecture:
            </p>
            <div className="architecture">
              <div className="architecture-item">
                <h4>Frontend (Client)</h4>
                <p>
                  Single-page application with React components organized by
                  feature and functionality. Redux manages application state
                  while React Router handles navigation.
                </p>
              </div>
              <div className="architecture-item">
                <h4>Backend (Server)</h4>
                <p>
                  REST API built with Django supporting CRUD operations for all
                  business entities. Organized into modules for authentication,
                  core functionality, registration, and scheduling.
                </p>
              </div>
              <div className="architecture-item">
                <h4>Real-time Communication</h4>
                <p>
                  WebSockets for instant updates on bookings and availability
                  changes without page refreshing.
                </p>
              </div>
            </div>
          </section>

          <section className="info-section">
            <h2>Security and Data Protection</h2>
            <div className="security-info">
              <div className="security-item">
                <h4>Authentication</h4>
                <ul>
                  <li>Two-factor authentication (2FA) via email</li>
                  <li>Token-based authentication with Knox</li>
                  <li>Account lockout after 3 failed attempts</li>
                  <li>Role-based access control (Operator/Therapist/Driver)</li>
                </ul>
              </div>
              <div className="security-item">
                <h4>Data Protection</h4>
                <ul>
                  <li>Input sanitization middleware to prevent XSS attacks</li>
                  <li>CORS protection with whitelisted origins</li>
                  <li>Content security policies for XSS prevention</li>
                  <li>HTTPS enforcement in production</li>
                  <li>Secure password hashing with BCrypt</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="info-section">
            <h2>System Requirements</h2>
            <div className="requirements">
              <div className="requirements-group">
                <h4>For Development</h4>
                <ul>
                  <li>Python 3.12+ with pip</li>
                  <li>Node.js 18+ with npm</li>
                  <li>PostgreSQL 17.2+</li>
                  <li>Redis (for WebSockets)</li>
                  <li>Git version control</li>
                </ul>
              </div>
              <div className="requirements-group">
                <h4>For End Users</h4>
                <ul>
                  <li>Modern web browser (Chrome, Firefox, Safari, Edge)</li>
                  <li>JavaScript enabled</li>
                  <li>Minimum screen resolution: 1280×720</li>
                  <li>Stable internet connection</li>
                  <li>Supported on desktop and mobile devices</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="info-section">
            <h2>Future Updates</h2>
            <p>The following features are planned for upcoming releases:</p>
            <ul className="roadmap-list">
              <li>Advanced reporting and analytics dashboard</li>
              <li>Mobile application for field staff</li>
              <li>Expanded inventory management system</li>
              <li>Customer feedback and rating system</li>
              <li>Integration with accounting software</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SystemInfoPage;
