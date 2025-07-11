import { useEffect } from "react";
import {
  FaBook,
  FaCode,
  FaExternalLinkAlt,
  FaGithub,
  FaUsers,
} from "react-icons/fa";
import PageLayout from "../../globals/PageLayout";
import LayoutRow from "../../globals/LayoutRow";
import pageTitles from "../../constants/pageTitles";
import "../../globals/theme.css";
import "../../styles/SystemInfo.css";

const DeveloperInfoPage = () => {
  useEffect(() => {
    document.title = pageTitles.developerInfo;
  }, []);

  return (
    <PageLayout>
      <LayoutRow
        title="Developer Information"
        subtitle="Meet the team behind the Royal Care Scheduling System"
      />
      <div className="system-info-container">
        <div className="system-info-content">
          <div className="system-info-body">
            <section className="info-section">
              <h2>
                <FaUsers className="section-icon" />
                Development Team
              </h2>
              <p>
                The Royal Care Scheduling System is developed and maintained by
                a dedicated team of three software engineers with complementary
                expertise in frontend and backend development. Based on over
                1,100 commits and extensive collaboration, our team has built a
                comprehensive home-service massage scheduling solution from the
                ground up.
              </p>
              <div className="tech-stack">
                <div className="stack-group">
                  <h3>Lathrell Pagsuguiron</h3>
                  <p>
                    <strong>Role:</strong> Lead Backend Developer
                  </p>
                  <p>
                    <strong>GitHub:</strong> notlath
                  </p>
                  <p>
                    <strong>Contributions:</strong> 904+ commits (Lead
                    contributor)
                  </p>
                  <p>
                    Principal backend architect specializing in Django REST
                    Framework, database optimization, and system architecture.
                    Expert in authentication systems, security implementations,
                    WebSocket services, and API development. Responsible for
                    cache invalidation strategies, appointment management
                    systems, and real-time data synchronization. Handles complex
                    backend logic for appointment scheduling, therapist
                    dashboards, and operator management systems.
                  </p>
                </div>
                <div className="stack-group">
                  <h3>Jhervince Rada</h3>
                  <p>
                    <strong>Role:</strong> Frontend Developer & UI/UX Specialist
                  </p>
                  <p>
                    <strong>GitHub:</strong> Jar-box
                  </p>
                  <p>
                    <strong>Contributions:</strong> 216+ commits
                  </p>
                  <p>
                    Frontend specialist focused on React development, user
                    interface design, and user experience optimization. Expert
                    in responsive design, component architecture, and modern
                    styling systems. Leads the development of interactive user
                    interfaces including FAQ sections, collapsible components,
                    and dynamic form systems. Specializes in creating polished
                    user experiences with comprehensive error handling,
                    intuitive navigation flows, and consistent design patterns.
                    Responsible for styling system optimization, component
                    refactoring for improved readability, and ensuring
                    accessibility across the application.
                  </p>
                </div>
                <div className="stack-group">
                  <h3>Jon Gleur Tan</h3>
                  <p>
                    <strong>Role:</strong> Backend Developer & System
                    Integration Specialist
                  </p>
                  <p>
                    <strong>GitHub:</strong> janglerr
                  </p>
                  <p>
                    <strong>Contributions:</strong> 36+ commits
                  </p>
                  <p>
                    Backend developer specializing in system integration,
                    comprehensive logging infrastructure, and inventory
                    management solutions. Expert in Django backend development,
                    database schema design, and system monitoring tools.
                    Responsible for implementing advanced logging systems,
                    material tracking features, and diagnostic tools for system
                    performance monitoring. Focuses on connecting booking
                    workflows with inventory data, developing registration
                    material management with stock allocation, and creating
                    debugging utilities for system maintenance and
                    troubleshooting.
                  </p>
                </div>
              </div>
            </section>

            <section className="info-section">
              <h2>
                <FaGithub className="section-icon" />
                Source Code & Repository
              </h2>{" "}
              <p>
                The Royal Care Scheduling System is an active open-source
                project hosted on GitHub with over 1,100 commits representing
                months of collaborative development. The repository showcases
                the complete evolution of the system from initial concept to
                production-ready home-service massage scheduling solution.
              </p>
              <div className="version-info">
                <a
                  href="https://github.com/notlath/Guitara-Scheduling-System"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="address-link github-link"
                >
                  <FaGithub className="section-icon" />
                  Guitara-Scheduling-System Repository
                  <FaExternalLinkAlt className="map-icon" />
                </a>
                <p className="github-link-text">
                  Explore our comprehensive codebase featuring detailed commit
                  history, extensive documentation, and active development. The
                  repository demonstrates our team's commitment to clean code,
                  thorough testing, and collaborative development practices.
                </p>
              </div>
            </section>

            <section className="info-section">
              <h2>
                <FaCode className="section-icon" />
                Development Approach
              </h2>
              <p>
                Our development methodology is built on collaborative practices,
                iterative improvement, and maintaining high code quality
                standards. With over 1,100 commits across multiple contributors,
                our approach emphasizes continuous integration and specialized
                expertise in building massage therapy scheduling solutions.
              </p>
              <div className="architecture">
                <div className="architecture-item">
                  <h4>Collaborative Development</h4>
                  <p>
                    We utilize Git-based workflow with feature branches, pull
                    requests, and code reviews. Our development process includes
                    regular commits, detailed commit messages, and collaborative
                    problem-solving across frontend and backend specializations.
                  </p>
                </div>
                <div className="architecture-item">
                  <h4>Specialized Expertise</h4>
                  <p>
                    Each team member brings specialized knowledge: backend
                    architecture and API development, frontend user experience
                    and interface design, and system integration with logging
                    and inventory management. This specialization ensures deep
                    expertise in each area.
                  </p>
                </div>
                <div className="architecture-item">
                  <h4>Iterative Improvement</h4>
                  <p>
                    Our development history shows continuous refinement through
                    regular updates, bug fixes, performance optimizations, and
                    feature enhancements. We prioritize maintainable code with
                    comprehensive error handling and user feedback systems.
                  </p>
                </div>
              </div>
            </section>

            <section className="info-section">
              <h2>
                <FaBook className="section-icon" />
                Technical Implementation
              </h2>
              <p>
                The system demonstrates advanced full-stack development with
                modern web technologies, comprehensive logging systems, and
                sophisticated state management. Built through extensive
                collaboration and testing to serve the unique needs of
                home-service massage therapy businesses.
              </p>
              <ul className="tech-list">
                <li>
                  <strong>Frontend Architecture:</strong> React-based
                  single-page application with TanStack Query for state
                  management, responsive design, and comprehensive form
                  validation systems
                </li>
                <li>
                  <strong>Backend API:</strong> Django REST Framework with
                  comprehensive logging middleware, cache invalidation
                  strategies, and optimized database query patterns
                </li>
                <li>
                  <strong>Real-time Systems:</strong> WebSocket implementation
                  for live appointment updates, notification systems, and
                  real-time dashboard synchronization
                </li>
                <li>
                  <strong>Authentication & Security:</strong> Multi-factor
                  authentication with email verification, password reset
                  functionality, and role-based access control
                </li>
                <li>
                  <strong>Inventory Integration:</strong> Advanced material
                  management system with massage therapy supplies tracking,
                  usage logging, and appointment-based inventory allocation for
                  oils, towels, and therapy equipment
                </li>
                <li>
                  <strong>Monitoring & Logging:</strong> Comprehensive system
                  logging with diagnostic tools, performance monitoring, and
                  detailed audit trails for all system operations
                </li>
                <li>
                  <strong>Development Tools:</strong> Git-based version control,
                  automated testing suites, and development environment
                  optimization scripts
                </li>
              </ul>
            </section>

            <section className="info-section">
              <h2>Development Principles</h2>
              <p>
                Our development practices are demonstrated through our extensive
                commit history and collaborative approach. We maintain high
                standards for code quality, user experience, and system
                reliability tailored for massage therapy service management.
              </p>
              <ul className="feature-list">
                <li>
                  Comprehensive error handling with detailed logging and user
                  feedback systems throughout the application
                </li>
                <li>
                  Secure authentication flows with multi-factor verification,
                  email validation, and password reset functionality for
                  therapists, operators, and clients
                </li>
                <li>
                  Responsive and accessible design with consistent styling
                  systems and mobile-optimized interfaces
                </li>
                <li>
                  Performance optimization through efficient state management,
                  cache invalidation strategies, and optimized API calls
                </li>
                <li>
                  Modular architecture with reusable components, specialized
                  middleware, and clean separation of concerns
                </li>
                <li>
                  Continuous integration with regular commits, detailed commit
                  messages, and collaborative code reviews
                </li>
                <li>
                  Comprehensive system monitoring with diagnostic tools,
                  performance tracking, and detailed audit logging
                </li>
              </ul>
            </section>

            <section className="info-section">
              <h2>Contributing & Development Statistics</h2>
              <p>
                Our development process is transparent and collaborative, with
                over 1,100 commits demonstrating active development and
                continuous improvement. We welcome contributions and maintain
                comprehensive documentation.
              </p>
              <div className="requirements">
                <div className="requirements-group">
                  <h4>Development Statistics</h4>
                  <ul>
                    <li>Total commits: 1,100+ across all contributors</li>
                    <li>
                      Primary repository: notlath/Guitara-Scheduling-System
                    </li>
                    <li>
                      Active development with regular updates and improvements
                    </li>
                    <li>Comprehensive commit history with detailed messages</li>
                    <li>Multi-contributor collaborative development model</li>
                  </ul>
                </div>
                <div className="requirements-group">
                  <h4>Repository Information</h4>
                  <ul>
                    <li>Full source code available on GitHub</li>
                    <li>Detailed documentation and setup instructions</li>
                    <li>Development environment configuration included</li>
                    <li>Issue tracking and feature request management</li>
                    <li>Open-source licensing for educational purposes</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default DeveloperInfoPage;
