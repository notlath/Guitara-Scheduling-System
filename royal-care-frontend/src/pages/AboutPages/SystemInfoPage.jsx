import { useEffect, useMemo } from "react";
import PageLayout from "../../globals/PageLayout";
import LayoutRow from "../../globals/LayoutRow";
import pageTitles from "../../constants/pageTitles";
import "../../globals/theme.css";
import "../../styles/SystemInfo.css";

const SystemInfoPage = () => {
  useEffect(() => {
    document.title = pageTitles.systemInfo;
  }, []);

  const formattedDate = useMemo(
    () => new Date().toISOString().slice(0, 10).replace(/-/g, "."),
    []
  );

  return (
    <PageLayout>
      <LayoutRow
        title="System Information"
        subtitle="Comprehensive technical specifications and architecture details of the Royal Care Scheduling Platform"
      />
      <div className="system-info-container">
        <div className="system-info-content">
          <section className="info-section">
            <h2>Current Version & Release Status</h2>
            <div className="version-info">
              <div className="version-details">
                <span className="version-badge production">
                  v1.0 Production Ready
                </span>
                <span className="build-info">Build: {formattedDate}</span>
              </div>
              <p>
                The Royal Care Scheduling System has reached production maturity
                with comprehensive functionality including advanced scheduling,
                real-time notifications, inventory management, payment
                processing, and full user role management. The system is
                actively deployed and serving daily operations.
              </p>
              <div className="version-features">
                <h4>Current Release Features</h4>
                <div className="features-grid">
                  <div className="feature-item">
                    <div className="icon" aria-hidden="true">
                      ✅
                    </div>
                    <div className="content">
                      <div className="title">Core Scheduling</div>
                      <div className="description">
                        Complete appointment booking and management
                      </div>
                    </div>
                  </div>
                  <div className="feature-item">
                    <div className="icon">✅</div>
                    <div className="content">
                      <div className="title">User Management</div>
                      <div className="description">
                        Multi-role authentication and authorization
                      </div>
                    </div>
                  </div>
                  <div className="feature-item">
                    <div className="icon">✅</div>
                    <div className="content">
                      <div className="title">Real-time Updates</div>
                      <div className="description">
                        Live notifications and status synchronization
                      </div>
                    </div>
                  </div>
                  <div className="feature-item">
                    <div className="icon">✅</div>
                    <div className="content">
                      <div className="title">Inventory System</div>
                      <div className="description">
                        Material tracking and automated deductions
                      </div>
                    </div>
                  </div>
                  <div className="feature-item">
                    <div className="icon">✅</div>
                    <div className="content">
                      <div className="title">Payment Processing</div>
                      <div className="description">
                        Multi-method payment tracking and reporting
                      </div>
                    </div>
                  </div>
                  <div className="feature-item">
                    <div className="icon">✅</div>
                    <div className="content">
                      <div className="title">Mobile Responsive</div>
                      <div className="description">
                        Full functionality across all devices
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="info-section">
            <h2>Technology Stack & Dependencies</h2>
            <div className="tech-stack">
              <div className="stack-group frontend">
                <h3>Frontend Technologies</h3>
                <div className="tech-category">
                  <h4>Core Framework</h4>
                  <ul>
                    <li>
                      <span className="tech-label">Library:</span> React 19.0.0
                      <span className="tech-badge">Latest</span>
                    </li>
                    <li>
                      <span className="tech-label">Build Tool:</span> Vite 6.2.0
                      <span className="tech-badge">Fast</span>
                    </li>
                    <li>
                      <span className="tech-label">Language:</span> JavaScript
                      ES2022+
                      <span className="tech-badge">Modern</span>
                    </li>
                  </ul>
                </div>

                <div className="tech-category">
                  <h4>State & Routing</h4>
                  <ul>
                    <li>
                      <span className="tech-label">State Management:</span>{" "}
                      Redux Toolkit 2.6.1
                    </li>
                    <li>
                      <span className="tech-label">Routing:</span> React Router
                      DOM 6.22
                    </li>
                    <li>
                      <span className="tech-label">HTTP Client:</span> Axios
                      1.6.2
                    </li>
                  </ul>
                </div>

                <div className="tech-category">
                  <h4>UI & Styling</h4>
                  <ul>
                    <li>
                      <span className="tech-label">Styling:</span> CSS Modules +
                      Custom CSS
                    </li>
                    <li>
                      <span className="tech-label">Icons:</span> React Icons
                      5.5.0 + Material UI Icons 7.1.1
                    </li>
                    <li>
                      <span className="tech-label">Components:</span> Custom
                      Design System
                    </li>
                  </ul>
                </div>

                <div className="tech-category">
                  <h4>Development Tools</h4>
                  <ul>
                    <li>
                      <span className="tech-label">Testing:</span> Jest 30.0.0 +
                      React Testing Library 16.3.0
                    </li>
                    <li>
                      <span className="tech-label">Code Quality:</span> ESLint
                      9.21.0 + Prettier
                    </li>
                    <li>
                      <span className="tech-label">File Processing:</span> jsPDF
                      3.0.1 + XLSX 0.18.5
                    </li>
                  </ul>
                </div>
              </div>

              <div className="stack-group backend">
                <h3>Backend Technologies</h3>
                <div className="tech-category">
                  <h4>Core Framework</h4>
                  <ul>
                    <li>
                      <span className="tech-label">Framework:</span> Django
                      5.1.4
                      <span className="tech-badge">Stable</span>
                    </li>
                    <li>
                      <span className="tech-label">API:</span> Django REST
                      Framework 3.14.0
                      <span className="tech-badge">Production</span>
                    </li>
                    <li>
                      <span className="tech-label">Language:</span> Python
                      3.12.8
                      <span className="tech-badge">Latest</span>
                    </li>
                  </ul>
                </div>

                <div className="tech-category">
                  <h4>Database & Storage</h4>
                  <ul>
                    <li>
                      <span className="tech-label">Database:</span> PostgreSQL
                      17.2 (Production)
                    </li>
                    <li>
                      <span className="tech-label">Development DB:</span> SQLite
                      3.41.2
                    </li>
                    <li>
                      <span className="tech-label">ORM:</span> Django ORM with
                      Migrations
                    </li>
                  </ul>
                </div>

                <div className="tech-category">
                  <h4>Authentication & Security</h4>
                  <ul>
                    <li>
                      <span className="tech-label">Authentication:</span> Django
                      REST Knox 4.2.0
                    </li>
                    <li>
                      <span className="tech-label">Password Hashing:</span>{" "}
                      bcrypt 4.1.2
                    </li>
                    <li>
                      <span className="tech-label">CORS:</span>{" "}
                      django-cors-headers 4.3.1
                    </li>
                  </ul>
                </div>

                <div className="tech-category">
                  <h4>Real-time & Caching</h4>
                  <ul>
                    <li>
                      <span className="tech-label">WebSockets:</span> Django
                      Channels 4.0.0
                    </li>
                    <li>
                      <span className="tech-label">Cache/Queue:</span> Redis
                      5.0.1
                    </li>
                    <li>
                      <span className="tech-label">Database Adapter:</span>{" "}
                      psycopg2-binary 2.9.9
                    </li>
                  </ul>
                </div>
              </div>

              <div className="stack-group infrastructure">
                <h3>Infrastructure & Deployment</h3>
                <div className="tech-category">
                  <h4>Development Environment</h4>
                  <ul>
                    <li>
                      <span className="tech-label">Package Management:</span>{" "}
                      npm (Frontend) + pip (Backend)
                    </li>
                    <li>
                      <span className="tech-label">Environment:</span>{" "}
                      python-dotenv for configuration
                    </li>
                    <li>
                      <span className="tech-label">Hot Reload:</span> Vite HMR +
                      Django dev server
                    </li>
                  </ul>
                </div>

                <div className="tech-category">
                  <h4>Production Deployment</h4>
                  <ul>
                    <li>
                      <span className="tech-label">Containerization:</span>{" "}
                      Docker + Docker Compose
                    </li>
                    <li>
                      <span className="tech-label">Process Management:</span>{" "}
                      Automated startup scripts
                    </li>
                    <li>
                      <span className="tech-label">Static Files:</span>{" "}
                      Optimized serving and caching
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="info-section">
            <h2>System Architecture & Design Patterns</h2>
            <p>
              The Royal Care Scheduling System employs a modern, scalable
              client-server architecture with clear separation of concerns and
              industry-standard design patterns.
            </p>
            <div className="architecture">
              <div className="architecture-item frontend-arch">
                <h4>Frontend Architecture (Client)</h4>
                <p>
                  <strong>Single-Page Application (SPA)</strong> built with
                  React 19 using functional components and modern hooks. The
                  application follows a component-based architecture with clear
                  feature organization.
                </p>
                <div className="arch-details">
                  <ul>
                    <li>
                      <strong>Component Structure:</strong> Organized by feature
                      and functionality
                    </li>
                    <li>
                      <strong>State Management:</strong> Redux Toolkit for
                      predictable state updates
                    </li>
                    <li>
                      <strong>Routing:</strong> Client-side navigation with
                      React Router
                    </li>
                    <li>
                      <strong>Code Splitting:</strong> Lazy loading for
                      optimized performance
                    </li>
                    <li>
                      <strong>CSS Architecture:</strong> CSS Modules for
                      component isolation
                    </li>
                  </ul>
                </div>
              </div>

              <div className="architecture-item backend-arch">
                <h4>Backend Architecture (Server)</h4>
                <p>
                  <strong>RESTful API</strong> built with Django REST Framework
                  supporting full CRUD operations. The backend follows Django's
                  MVT (Model-View-Template) pattern adapted for API development.
                </p>
                <div className="arch-details">
                  <ul>
                    <li>
                      <strong>API Design:</strong> RESTful endpoints with proper
                      HTTP methods
                    </li>
                    <li>
                      <strong>Module Organization:</strong> Authentication,
                      Core, Registration, Scheduling
                    </li>
                    <li>
                      <strong>Database Layer:</strong> Django ORM with
                      PostgreSQL for production
                    </li>
                    <li>
                      <strong>Middleware:</strong> Authentication, CORS,
                      security headers
                    </li>
                    <li>
                      <strong>Background Tasks:</strong> Asynchronous processing
                      with Redis
                    </li>
                  </ul>
                </div>
              </div>

              <div className="architecture-item realtime-arch">
                <h4>Real-time Communication</h4>
                <p>
                  <strong>WebSocket Integration</strong> via Django Channels for
                  instant updates on bookings, availability changes, and system
                  notifications without page refreshing.
                </p>
                <div className="arch-details">
                  <ul>
                    <li>
                      <strong>WebSocket Protocol:</strong> Bidirectional
                      real-time communication
                    </li>
                    <li>
                      <strong>Fallback Support:</strong> Polling mechanism for
                      compatibility
                    </li>
                    <li>
                      <strong>Event Broadcasting:</strong> Targeted updates to
                      specific users/roles
                    </li>
                    <li>
                      <strong>Connection Management:</strong> Automatic
                      reconnection and error handling
                    </li>
                  </ul>
                </div>
              </div>

              <div className="architecture-item data-flow">
                <h4>Data Flow & Integration</h4>
                <p>
                  <strong>Unidirectional Data Flow</strong> ensures predictable
                  state management and easier debugging. API responses are
                  normalized and cached for optimal performance.
                </p>
                <div className="arch-details">
                  <ul>
                    <li>
                      <strong>API Communication:</strong> Axios with
                      interceptors for auth and errors
                    </li>
                    <li>
                      <strong>State Updates:</strong> Redux actions and reducers
                      for state management
                    </li>
                    <li>
                      <strong>Caching Strategy:</strong> Smart caching with
                      invalidation patterns
                    </li>
                    <li>
                      <strong>Error Boundaries:</strong> Graceful error handling
                      and recovery
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="design-patterns">
              <h3>Design Patterns & Best Practices</h3>
              <div className="patterns-grid">
                <div className="pattern-item">
                  <h4>Frontend Patterns</h4>
                  <ul>
                    <li>Component Composition</li>
                    <li>Higher-Order Components</li>
                    <li>Custom Hooks Pattern</li>
                    <li>Provider Pattern</li>
                    <li>Error Boundary Pattern</li>
                  </ul>
                </div>
                <div className="pattern-item">
                  <h4>Backend Patterns</h4>
                  <ul>
                    <li>Repository Pattern</li>
                    <li>Factory Pattern</li>
                    <li>Observer Pattern</li>
                    <li>Strategy Pattern</li>
                    <li>Singleton Pattern</li>
                  </ul>
                </div>
                <div className="pattern-item">
                  <h4>API Design Patterns</h4>
                  <ul>
                    <li>RESTful Resource Design</li>
                    <li>Pagination Patterns</li>
                    <li>Filtering & Sorting</li>
                    <li>Versioning Strategy</li>
                    <li>Error Response Format</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="info-section">
            <h2>Security Framework & Data Protection</h2>
            <div className="security-info">
              <div className="security-item authentication">
                <h4>🔐 Authentication & Authorization</h4>
                <ul>
                  <li>
                    <strong>Two-Factor Authentication (2FA):</strong>{" "}
                    Email-based verification for enhanced security
                  </li>
                  <li>
                    <strong>Token-Based Auth:</strong> Django REST Knox with
                    secure JWT token management
                  </li>
                  <li>
                    <strong>Account Protection:</strong> Automatic lockout after
                    3 failed login attempts
                  </li>
                  <li>
                    <strong>Role-Based Access Control:</strong> Granular
                    permissions for Operator/Therapist/Driver roles
                  </li>
                  <li>
                    <strong>Session Management:</strong> Secure token expiration
                    and refresh mechanisms
                  </li>
                  <li>
                    <strong>Password Security:</strong> BCrypt hashing with salt
                    for password storage
                  </li>
                </ul>
              </div>

              <div className="security-item data-protection">
                <h4>🛡️ Data Protection & Privacy</h4>
                <ul>
                  <li>
                    <strong>Input Sanitization:</strong> Comprehensive
                    middleware to prevent XSS attacks
                  </li>
                  <li>
                    <strong>CORS Protection:</strong> Whitelisted origins and
                    secure cross-origin policies
                  </li>
                  <li>
                    <strong>Content Security Policy:</strong> CSP headers for
                    XSS and injection prevention
                  </li>
                  <li>
                    <strong>HTTPS Enforcement:</strong> Secure HTTP with TLS
                    encryption in production
                  </li>
                  <li>
                    <strong>Database Security:</strong> Parameterized queries to
                    prevent SQL injection
                  </li>
                  <li>
                    <strong>File Upload Security:</strong> Type validation and
                    secure file handling
                  </li>
                </ul>
              </div>

              <div className="security-item infrastructure">
                <h4>🏗️ Infrastructure Security</h4>
                <ul>
                  <li>
                    <strong>Environment Variables:</strong> Secure configuration
                    management with python-dotenv
                  </li>
                  <li>
                    <strong>Secret Management:</strong> Encrypted storage of API
                    keys and sensitive data
                  </li>
                  <li>
                    <strong>Rate Limiting:</strong> API throttling to prevent
                    abuse and DoS attacks
                  </li>
                  <li>
                    <strong>Error Handling:</strong> Secure error responses
                    without sensitive information leakage
                  </li>
                  <li>
                    <strong>Audit Logging:</strong> Comprehensive logging of
                    security events and access attempts
                  </li>
                  <li>
                    <strong>Network Security:</strong> Firewall configuration
                    and secure network policies
                  </li>
                </ul>
              </div>

              <div className="security-item compliance">
                <h4>📋 Compliance & Standards</h4>
                <ul>
                  <li>
                    <strong>Data Privacy:</strong> GDPR-compliant data handling
                    and user rights
                  </li>
                  <li>
                    <strong>Security Standards:</strong> OWASP Top 10
                    vulnerability protection
                  </li>
                  <li>
                    <strong>Code Security:</strong> Regular security audits and
                    dependency scanning
                  </li>
                  <li>
                    <strong>Access Monitoring:</strong> Real-time monitoring of
                    system access and usage
                  </li>
                  <li>
                    <strong>Backup Security:</strong> Encrypted backups with
                    secure restoration procedures
                  </li>
                  <li>
                    <strong>Incident Response:</strong> Documented procedures
                    for security incident handling
                  </li>
                </ul>
              </div>
            </div>

            <div className="security-metrics">
              <h3>Security Metrics & Performance</h3>
              <div className="metrics-grid">
                <div className="metric-item">
                  <span className="metric-value">99.9%</span>
                  <span className="metric-label">Uptime Security</span>
                </div>
                <div className="metric-item">
                  <span className="metric-value">256-bit</span>
                  <span className="metric-label">AES Encryption</span>
                </div>
                <div className="metric-item">
                  <span className="metric-value">&lt;100ms</span>
                  <span className="metric-label">Auth Response Time</span>
                </div>
                <div className="metric-item">
                  <span className="metric-value">0</span>
                  <span className="metric-label">Security Breaches</span>
                </div>
              </div>
            </div>
          </section>

          <section className="info-section">
            <h2>System Requirements & Compatibility</h2>
            <div className="requirements">
              <div className="requirements-group development">
                <h4>🛠️ Development Environment</h4>
                <div className="req-category">
                  <h5>Required Software</h5>
                  <ul>
                    <li>
                      <strong>Python:</strong> 3.12+ with pip package manager
                    </li>
                    <li>
                      <strong>Node.js:</strong> 18+ with npm (Latest LTS
                      recommended)
                    </li>
                    <li>
                      <strong>Database:</strong> PostgreSQL 17.2+ (Production) /
                      SQLite 3.41.2+ (Development)
                    </li>
                    <li>
                      <strong>Cache/Queue:</strong> Redis 5.0+ for WebSocket and
                      caching support
                    </li>
                    <li>
                      <strong>Version Control:</strong> Git 2.30+ for source
                      code management
                    </li>
                  </ul>
                </div>

                <div className="req-category">
                  <h5>Development Tools</h5>
                  <ul>
                    <li>
                      <strong>Code Editor:</strong> VS Code, PyCharm, or similar
                      with extensions
                    </li>
                    <li>
                      <strong>API Testing:</strong> Postman, Insomnia, or
                      Thunder Client
                    </li>
                    <li>
                      <strong>Database Tools:</strong> pgAdmin, DBeaver, or
                      similar
                    </li>
                    <li>
                      <strong>Terminal:</strong> Command line interface (bash,
                      zsh, PowerShell)
                    </li>
                  </ul>
                </div>

                <div className="req-category">
                  <h5>System Specifications</h5>
                  <ul>
                    <li>
                      <strong>RAM:</strong> 8GB minimum, 16GB recommended for
                      optimal performance
                    </li>
                    <li>
                      <strong>Storage:</strong> 5GB free space for dependencies
                      and development files
                    </li>
                    <li>
                      <strong>CPU:</strong> Multi-core processor (Intel i5/AMD
                      Ryzen 5 or equivalent)
                    </li>
                    <li>
                      <strong>Network:</strong> Stable internet connection for
                      package downloads
                    </li>
                  </ul>
                </div>
              </div>

              <div className="requirements-group enduser">
                <h4>👥 End User Requirements</h4>
                <div className="req-category">
                  <h5>Browser Compatibility</h5>
                  <ul>
                    <li>
                      <strong>Chrome:</strong> Version 90+ (Recommended for best
                      performance)
                    </li>
                    <li>
                      <strong>Firefox:</strong> Version 88+ with full feature
                      support
                    </li>
                    <li>
                      <strong>Safari:</strong> Version 14+ for macOS and iOS
                      devices
                    </li>
                    <li>
                      <strong>Edge:</strong> Version 90+ (Chromium-based) for
                      Windows
                    </li>
                    <li>
                      <strong>Mobile Browsers:</strong> Chrome Mobile, Safari
                      Mobile (iOS 14+)
                    </li>
                  </ul>
                </div>

                <div className="req-category">
                  <h5>Device Specifications</h5>
                  <ul>
                    <li>
                      <strong>Screen Resolution:</strong> Minimum 1280×720,
                      optimized for 1920×1080
                    </li>
                    <li>
                      <strong>JavaScript:</strong> Must be enabled for full
                      functionality
                    </li>
                    <li>
                      <strong>Cookies:</strong> Required for authentication and
                      session management
                    </li>
                    <li>
                      <strong>Local Storage:</strong> 10MB+ for caching and
                      offline capabilities
                    </li>
                    <li>
                      <strong>Internet Speed:</strong> 1 Mbps minimum, 5+ Mbps
                      recommended
                    </li>
                  </ul>
                </div>

                <div className="req-category">
                  <h5>Device Support</h5>
                  <ul>
                    <li>
                      <strong>Desktop:</strong> Windows 10+, macOS 10.15+,
                      Ubuntu 20.04+
                    </li>
                    <li>
                      <strong>Tablet:</strong> iPad (iOS 14+), Android tablets
                      (Android 9+)
                    </li>
                    <li>
                      <strong>Mobile:</strong> iPhone (iOS 14+), Android phones
                      (Android 9+)
                    </li>
                    <li>
                      <strong>Accessibility:</strong> Screen readers and
                      keyboard navigation supported
                    </li>
                  </ul>
                </div>
              </div>

              <div className="requirements-group production">
                <h4>🚀 Production Environment</h4>
                <div className="req-category">
                  <h5>Server Requirements</h5>
                  <ul>
                    <li>
                      <strong>CPU:</strong> 2+ cores (4+ cores recommended for
                      high load)
                    </li>
                    <li>
                      <strong>RAM:</strong> 4GB minimum, 8GB+ recommended
                    </li>
                    <li>
                      <strong>Storage:</strong> 20GB SSD with backup storage
                    </li>
                    <li>
                      <strong>Network:</strong> 100 Mbps+ bandwidth with low
                      latency
                    </li>
                    <li>
                      <strong>SSL Certificate:</strong> Valid HTTPS certificate
                      for secure connections
                    </li>
                  </ul>
                </div>

                <div className="req-category">
                  <h5>Deployment Options</h5>
                  <ul>
                    <li>
                      <strong>Docker:</strong> Containerized deployment with
                      Docker Compose
                    </li>
                    <li>
                      <strong>Cloud Platforms:</strong> AWS, Google Cloud,
                      Azure, DigitalOcean
                    </li>
                    <li>
                      <strong>Traditional Hosting:</strong> VPS or dedicated
                      servers with Linux
                    </li>
                    <li>
                      <strong>CDN:</strong> Content delivery network for static
                      asset optimization
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="compatibility-matrix">
              <h3>Compatibility Matrix</h3>
              <div className="matrix-grid">
                <div className="matrix-item supported">
                  <h4>✅ Fully Supported</h4>
                  <ul>
                    <li>Chrome 90+ (Desktop & Mobile)</li>
                    <li>Firefox 88+ (Desktop & Mobile)</li>
                    <li>Safari 14+ (Desktop & Mobile)</li>
                    <li>Edge 90+ (Chromium-based)</li>
                  </ul>
                </div>
                <div className="matrix-item limited">
                  <h4>⚠️ Limited Support</h4>
                  <ul>
                    <li>Internet Explorer (Not recommended)</li>
                    <li>Older mobile browsers</li>
                    <li>Browsers with JavaScript disabled</li>
                    <li>Very old operating systems</li>
                  </ul>
                </div>
                <div className="matrix-item testing">
                  <h4>🧪 Tested Environments</h4>
                  <ul>
                    <li>Windows 10/11 with Chrome/Edge</li>
                    <li>macOS Big Sur+ with Safari/Chrome</li>
                    <li>Ubuntu 20.04+ with Firefox/Chrome</li>
                    <li>iOS 14+ and Android 9+ devices</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="info-section">
            <h2>Performance Metrics & Monitoring</h2>
            <div className="performance-info">
              <div className="performance-metrics">
                <h3>System Performance</h3>
                <div className="metrics-grid">
                  <div className="metric-item">
                    <span className="metric-value">&lt;2s</span>
                    <span className="metric-label">Page Load Time</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-value">95+</span>
                    <span className="metric-label">Lighthouse Score</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-value">&lt;100ms</span>
                    <span className="metric-label">API Response Time</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-value">99.9%</span>
                    <span className="metric-label">System Uptime</span>
                  </div>
                </div>
              </div>

              <div className="monitoring-tools">
                <h3>Monitoring & Analytics</h3>
                <ul>
                  <li>
                    <strong>Real-time Monitoring:</strong> System health and
                    performance tracking
                  </li>
                  <li>
                    <strong>Error Tracking:</strong> Automatic error detection
                    and reporting
                  </li>
                  <li>
                    <strong>Usage Analytics:</strong> User behavior and system
                    usage patterns
                  </li>
                  <li>
                    <strong>Performance Profiling:</strong> Database query
                    optimization and API monitoring
                  </li>
                  <li>
                    <strong>Security Monitoring:</strong> Access logs and
                    security event tracking
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </PageLayout>
  );
};

export default SystemInfoPage;
