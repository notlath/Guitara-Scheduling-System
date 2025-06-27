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
              <FaUsers style={{ marginRight: "0.5rem" }} />
              Development Team
            </h2>
            <p>
              The Royal Care Scheduling System is developed and maintained by a
              dedicated team of software engineers committed to delivering
              high-quality healthcare scheduling solutions.
            </p>
            <div className="tech-stack">
              <div className="stack-group">
                <h3>Jhervince Rada</h3>
                <p>
                  <strong>Role:</strong> Developer
                </p>
                <p>
                  Full-stack developer specializing in React frontend
                  development and Django backend architecture. Focused on user
                  experience design and API development.
                </p>
              </div>
              <div className="stack-group">
                <h3>Lathrell Pagsuguiron</h3>
                <p>
                  <strong>Role:</strong> Developer
                </p>
                <p>
                  Backend specialist with expertise in Django REST Framework,
                  database optimization, and system architecture. Handles
                  authentication and security implementations.
                </p>
              </div>
              <div className="stack-group">
                <h3>Jon Gleur Tan</h3>
                <p>
                  <strong>Role:</strong> Developer
                </p>
                <p>
                  Frontend developer with focus on React component development,
                  state management with Redux, and responsive web design for
                  optimal user interfaces.
                </p>
              </div>
            </div>
          </section>

          <section className="info-section">
            <h2>
              <FaGithub style={{ marginRight: "0.5rem" }} />
              Source Code & Repository
            </h2>
            <p>
              The Royal Care Scheduling System is an open-source project hosted
              on GitHub. The repository contains the complete source code,
              documentation, and development history.
            </p>
            <div className="version-info">
              <a
                href="https://github.com/notlath/Guitara-Scheduling-System"
                target="_blank"
                rel="noopener noreferrer"
                className="address-link"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: "1.1rem",
                  fontWeight: "600",
                  textDecoration: "none",
                }}
              >
                <FaGithub style={{ marginRight: "0.5rem" }} />
                Guitara-Scheduling-System Repository
                <FaExternalLinkAlt className="map-icon" />
              </a>
              <p style={{ marginTop: "1rem" }}>
                Feel free to explore the codebase, report issues, or contribute
                to the project's development.
              </p>
            </div>
          </section>

          <section className="info-section">
            <h2>
              <FaCode style={{ marginRight: "0.5rem" }} />
              Development Approach
            </h2>
            <p>
              Our development methodology focuses on creating maintainable,
              scalable, and secure software solutions for healthcare scheduling
              needs.
            </p>
            <div className="architecture">
              <div className="architecture-item">
                <h4>Agile Development</h4>
                <p>
                  We follow agile development practices with iterative
                  development cycles, continuous integration, and regular code
                  reviews to ensure quality.
                </p>
              </div>
              <div className="architecture-item">
                <h4>Code Quality</h4>
                <p>
                  Emphasis on clean code principles, comprehensive testing,
                  proper documentation, and adherence to industry best practices
                  and coding standards.
                </p>
              </div>
              <div className="architecture-item">
                <h4>User-Centered Design</h4>
                <p>
                  Focus on creating intuitive user interfaces and smooth user
                  experiences tailored specifically for healthcare scheduling
                  workflows.
                </p>
              </div>
            </div>
          </section>

          <section className="info-section">
            <h2>
              <FaBook style={{ marginRight: "0.5rem" }} />
              Technical Implementation
            </h2>
            <p>
              The system is built using modern web technologies and follows
              industry best practices for security, performance, and
              maintainability.
            </p>
            <ul className="tech-list">
              <li>
                <strong>Frontend Architecture:</strong> Component-based React
                application with Redux for state management
              </li>
              <li>
                <strong>Backend API:</strong> RESTful API built with Django REST
                Framework
              </li>
              <li>
                <strong>Database Design:</strong> Relational database schema
                optimized for scheduling operations
              </li>
              <li>
                <strong>Authentication:</strong> Secure token-based
                authentication with role-based access control
              </li>
              <li>
                <strong>Real-time Features:</strong> WebSocket implementation
                for live updates and notifications
              </li>
              <li>
                <strong>Security:</strong> Input validation, CORS protection,
                and secure data handling
              </li>
            </ul>
          </section>

          <section className="info-section">
            <h2>Development Principles</h2>
            <p>
              Our team is committed to following established software
              development principles and healthcare industry standards.
            </p>
            <ul className="feature-list">
              <li>
                Maintainable and readable code with comprehensive documentation
              </li>
              <li>Secure handling of sensitive healthcare scheduling data</li>
              <li>Responsive design for desktop and mobile accessibility</li>
              <li>Performance optimization for smooth user experience</li>
              <li>Scalable architecture to support growing user bases</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Continuous integration and deployment practices</li>
            </ul>
          </section>

          <section className="info-section">
            <h2>Contributing & Support</h2>
            <p>
              We welcome contributions from the developer community and provide
              support for implementation and customization needs.
            </p>
            <div className="requirements">
              <div className="requirements-group">
                <h4>How to Contribute</h4>
                <ul>
                  <li>Fork the repository on GitHub</li>
                  <li>Create a feature branch for your changes</li>
                  <li>Follow the coding standards and guidelines</li>
                  <li>Submit a pull request with detailed description</li>
                  <li>Participate in code review process</li>
                </ul>
              </div>
              <div className="requirements-group">
                <h4>Getting Support</h4>
                <ul>
                  <li>Review documentation and README files</li>
                  <li>Check existing GitHub issues for solutions</li>
                  <li>Create new issues for bugs or feature requests</li>
                  <li>Follow the issue template guidelines</li>
                  <li>Engage with the development community</li>
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
