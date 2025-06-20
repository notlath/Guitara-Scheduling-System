import { useEffect } from "react";
import { MdLocationOn } from "react-icons/md";
import pageTitles from "../../constants/pageTitles";
import "../../styles/CompanyInfo.css";

const CompanyInfoPage = () => {
  useEffect(() => {
    document.title = pageTitles.companyInfo;
  }, []);

  return (
    <div className="company-info-container">
      <div className="company-info-content">
        <div className="company-info-header">
          <h1>Royal Care</h1>
          <p>Premium Home-based Massage Service Since 2010</p>
        </div>

        <div className="company-info-body">
          <section className="info-section">
            <h2>History and Background</h2>
            <p>
              Royal Care was established in 2010 as a family-run business,
              inspired by the founder, <strong>Jose Mc Rosval Basalatan</strong>
              . Drawing from his own positive experiences with home-service
              massage therapy, Jose recognized the unique convenience it offered
              clients and the untapped potential in the market. Motivated by a
              vision to make wellness more accessible, he began by recruiting
              trusted acquaintances as the first massage therapists, ensuring a
              personal touch and high standards from the very start.
            </p>
            <p>
              What began as a modest venture relying on word-of-mouth and
              traditional advertising (tarpaulins) quickly evolved as the
              business embraced digital marketing, particularly through
              Facebook. This strategic pivot became a key milestone in the
              company's growth.
            </p>
            <p>
              Today, Royal Care operates from its Pasig location with a team of
              28 therapists, 7 drivers, and 3 operators, continuing to deliver
              premium massage services to clients who prefer the comfort of
              their own homes.
            </p>

            <div className="highlight-box">
              Royal Care focuses exclusively on home-based massage therapy,
              bringing relaxation and wellness directly to clients' doorsteps.
            </div>
          </section>

          <section className="info-section">
            <h2>Mission, Vision, and Values</h2>
            <p className="missing-info">
              Royal Care is currently developing formal mission, vision, and
              values statements to better communicate our purpose and guiding
              principles to our clients and team members.
            </p>
          </section>

          <section className="info-section">
            <h2>Key Management Team</h2>
            <div className="team-grid">
              <div className="team-member">
                <h3>Operations Head</h3>
                <p>
                  <strong>Mary Grace R. Basalatan</strong>
                </p>
                <p>
                  Founder's wife who oversees daily operations, financial
                  reconciliation, and staff management.
                </p>
              </div>

              <div className="team-member">
                <h3>Marketing Manager</h3>
                <p>
                  <strong>Samantha R. Basalatan</strong>
                </p>
                <p>
                  Handles client acquisition, digital marketing strategy, and
                  system modernization efforts.
                </p>
              </div>

              <div className="team-member">
                <h3>Finance Manager</h3>
                <p>
                  <strong>Denise R. Basalatan</strong>
                </p>
                <p>
                  Manages payment remittances, commission tracking, and
                  financial operations.
                </p>
              </div>
            </div>
          </section>

          <section className="info-section">
            <h2>Service Locations and Facilities</h2>
            <p>
              Royal Care currently provides services primarily in Pasig City and
              nearby areas within practical driving distance to optimize
              operational efficiency.
            </p>

            <div className="location-details">
              <div className="location-card">
                <h3>Main Office</h3>
                <p>
                  <strong>Address:</strong>{" "}
                  <a
                    href="https://maps.app.goo.gl/fGx7X7CgDGsN76Ms9"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="address-link"
                  >
                    38 Kalinangan St., Caniogan, Pasig{" "}
                    <MdLocationOn className="map-icon" />
                  </a>
                </p>
                <p>
                  Our office includes a 3rd-floor operator center (not
                  client-accessible) and a ground-floor waiting area for
                  therapists and drivers.
                </p>
              </div>
            </div>

            <h3>Services and Equipment</h3>
            <ul className="info-list">
              <li>
                <strong>Massage Kits:</strong> Professional portable sets
                including oils, towels, ventosa cups, and hot stones
              </li>
              <li>
                <strong>Transport:</strong> Company car for multi-therapist
                bookings and drivers' personal motorcycles for individual
                appointments
              </li>
            </ul>
          </section>

          <section className="info-section">
            <h2>Corporate Social Responsibility</h2>
            <p className="missing-info">
              Information about Royal Care's community initiatives and social
              responsibility programs will be available soon.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CompanyInfoPage;
