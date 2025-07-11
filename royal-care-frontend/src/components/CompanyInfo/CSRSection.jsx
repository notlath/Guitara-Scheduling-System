const CSRSection = () => {
  return (
    <section className="info-section">
      <h2>Corporate Social Responsibility & Community Impact</h2>

      <div className="csr-content">
        <p>
          As a family-founded business deeply rooted in the community, Royal
          Care is committed to giving back and making a positive impact beyond
          our commercial services. Our corporate social responsibility
          initiatives reflect our core values and dedication to community
          wellness.
        </p>

        <div className="csr-initiatives">
          <div className="csr-category">
            <h3>Community Wellness Programs</h3>
            <ul className="info-list">
              <li>
                <strong>Senior Citizen Discounts:</strong> Special pricing for
                elderly clients to promote accessible massage therapy services
              </li>
              <li>
                <strong>Essential Worker Support:</strong> Discounted services
                for essential workers and community service professionals
              </li>
              <li>
                <strong>Wellness Education:</strong> Free workshops on stress
                management and massage therapy benefits
              </li>
              <li>
                <strong>Charity Sessions:</strong> Complimentary massage
                sessions for community events and fundraisers
              </li>
            </ul>
          </div>

          <div className="csr-category">
            <h3>Employee Welfare & Development</h3>
            <ul className="info-list">
              <li>
                <strong>Fair Compensation:</strong> Competitive rates and
                transparent commission structure
              </li>
              <li>
                <strong>Skill Enhancement:</strong> Ongoing training programs
                and certification support
              </li>
              <li>
                <strong>Health Benefits:</strong> Medical assistance and
                wellness support for staff
              </li>
              <li>
                <strong>Career Growth:</strong> Internal promotion opportunities
                and leadership development
              </li>
            </ul>
          </div>

          <div className="csr-category">
            <h3>Environmental Responsibility</h3>
            <ul className="info-list">
              <li>
                <strong>Eco-Friendly Products:</strong> Use of natural,
                biodegradable massage oils and products
              </li>
              <li>
                <strong>Sustainable Practices:</strong> Efficient route planning
                to reduce carbon footprint
              </li>
              <li>
                <strong>Waste Reduction:</strong> Minimal packaging and reusable
                equipment maintenance
              </li>
              <li>
                <strong>Digital Operations:</strong> Paperless scheduling and
                digital receipt systems
              </li>
            </ul>
          </div>

          <div className="csr-category">
            <h3>Local Economic Support</h3>
            <ul className="info-list">
              <li>
                <strong>Local Sourcing:</strong> Purchasing supplies from
                Philippine-based suppliers when possible
              </li>
              <li>
                <strong>Job Creation:</strong> Providing employment
                opportunities for local therapists and drivers
              </li>
              <li>
                <strong>Small Business Support:</strong> Collaborating with
                local wellness practitioners and suppliers
              </li>
              <li>
                <strong>Tax Compliance:</strong> Full compliance with local tax
                obligations and business requirements
              </li>
            </ul>
          </div>
        </div>

        <div className="impact-stats">
          <h3>Our Community Impact</h3>
          <div className="impact-grid">
            <div className="impact-item">
              <span className="impact-number">50,000+</span>
              <span className="impact-label">Wellness Sessions Delivered</span>
            </div>
            <div className="impact-item">
              <span className="impact-number">38</span>
              <span className="impact-label">Local Jobs Created</span>
            </div>
            <div className="impact-item">
              <span className="impact-number">500+</span>
              <span className="impact-label">Senior Citizens Served</span>
            </div>
            <div className="impact-item">
              <span className="impact-number">15</span>
              <span className="impact-label">Years of Community Service</span>
            </div>
          </div>
        </div>

        <div className="future-commitments">
          <h3>Future Commitments</h3>
          <p>
            Royal Care is continuously exploring new ways to expand our positive
            impact on the community. We are developing partnerships with local
            health organizations, planning wellness outreach programs, and
            investigating sustainable business practices that align with our
            mission of promoting wellness while caring for our environment and
            community.
          </p>
        </div>
      </div>
    </section>
  );
};

export default CSRSection;
