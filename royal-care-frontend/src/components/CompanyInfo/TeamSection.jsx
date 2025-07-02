const TeamSection = () => {
  return (
    <section className="info-section">
      <h2>Key Management Team</h2>
      <div className="team-grid">
        <div className="team-member founder">
          <h3>Founder & CEO</h3>
          <p>
            <strong>Jose Mc Rosval Basalatan</strong>
          </p>
          <p>
            Visionary founder who established Royal Care in 2010. With over 15
            years of experience in the wellness industry, Jose continues to
            guide the company's strategic direction and maintains hands-on
            involvement in quality assurance and business development.
          </p>
        </div>

        <div className="team-member">
          <h3>Operations Head</h3>
          <p>
            <strong>Mary Grace R. Basalatan</strong>
          </p>
          <p>
            Co-founder and operations leader who oversees daily operations,
            financial reconciliation, staff management, and quality control. Her
            attention to detail and operational excellence ensures smooth
            service delivery across all client touchpoints.
          </p>
        </div>

        <div className="team-member">
          <h3>Marketing & Technology Manager</h3>
          <p>
            <strong>Samantha R. Basalatan</strong>
          </p>
          <p>
            Leads client acquisition strategies, digital marketing campaigns,
            and system modernization efforts. Responsible for the implementation
            of the Royal Care Scheduling System and driving the company's
            digital transformation.
          </p>
        </div>

        <div className="team-member">
          <h3>Finance Manager</h3>
          <p>
            <strong>Denise R. Basalatan</strong>
          </p>
          <p>
            Manages payment processing, commission tracking, financial
            reporting, and remittances. Ensures accurate financial operations
            and maintains transparent accounting practices for both staff
            compensation and business analytics.
          </p>
        </div>
      </div>

      <div className="team-stats">
        <h3>Our Team by Numbers</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-number">28</span>
            <span className="stat-label">Licensed Therapists</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">7</span>
            <span className="stat-label">Professional Drivers</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">3</span>
            <span className="stat-label">Operations Staff</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">15+</span>
            <span className="stat-label">Years of Experience</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TeamSection;
