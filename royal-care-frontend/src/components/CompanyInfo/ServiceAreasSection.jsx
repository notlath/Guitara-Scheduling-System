import { MdLocationOn } from "react-icons/md";

const ServiceAreasSection = () => {
  return (
    <section className="info-section">
      <h2>Service Areas and Facilities</h2>
      <p>
        Royal Care strategically provides services throughout Metro Manila, with
        primary coverage in Pasig City and neighboring areas. Our service radius
        is carefully planned to ensure optimal response times and operational
        efficiency while maintaining service quality.
      </p>

      <div className="location-details">
        <div className="location-card">
          <h3>Headquarters & Operations Center</h3>
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
            Our multi-level facility includes a dedicated 3rd-floor operations
            center for administrative functions, scheduling, and client
            management, plus a ground-floor staging area where therapists and
            drivers prepare for appointments and coordinate logistics.
          </p>
        </div>

        <div className="coverage-area">
          <h3>Primary Service Coverage</h3>
          <div className="coverage-grid">
            <div className="coverage-zone">
              <h4>Zone 1 - Primary Areas</h4>
              <ul>
                <li>Pasig City (All Barangays)</li>
                <li>Mandaluyong City</li>
                <li>San Juan City</li>
                <li>Marikina City</li>
              </ul>
            </div>
            <div className="coverage-zone">
              <h4>Zone 2 - Extended Coverage</h4>
              <ul>
                <li>Quezon City (Selected Areas)</li>
                <li>Makati City (CBD & Residential)</li>
                <li>Taguig City (BGC & Surroundings)</li>
                <li>Antipolo City (Lower Areas)</li>
              </ul>
            </div>
          </div>
          <p className="coverage-note">
            <em>
              Service availability in extended coverage areas may vary based on
              scheduling and logistics. Contact us to confirm service to your
              location.
            </em>
          </p>
        </div>
      </div>

      <h3>Professional Equipment & Standards</h3>
      <div className="equipment-grid">
        <div className="equipment-category">
          <h4>Massage & Therapy Equipment</h4>
          <ul className="info-list">
            <li>
              <strong>Premium Massage Oils:</strong> Therapeutic-grade oils for
              different massage types
            </li>
            <li>
              <strong>Professional Linens:</strong> Fresh, high-quality towels
              and sheets for each session
            </li>
            <li>
              <strong>Ventosa Cups:</strong> Traditional cupping therapy
              equipment
            </li>
            <li>
              <strong>Hot Stone Sets:</strong> Heated stones for therapeutic
              treatments
            </li>
            <li>
              <strong>Portable Massage Tables:</strong> Professional-grade,
              adjustable tables
            </li>
            <li>
              <strong>Aromatherapy Supplies:</strong> Essential oils and
              diffusers for enhanced relaxation
            </li>
          </ul>
        </div>

        <div className="equipment-category">
          <h4>Transportation & Logistics</h4>
          <ul className="info-list">
            <li>
              <strong>Company Vehicle:</strong> Multi-therapist transport for
              group bookings
            </li>
            <li>
              <strong>Professional Motorcycles:</strong> Individual therapist
              transportation
            </li>
            <li>
              <strong>GPS Tracking:</strong> Real-time location monitoring for
              safety and efficiency
            </li>
            <li>
              <strong>Communication Systems:</strong> Coordinated dispatch and
              client communication
            </li>
            <li>
              <strong>Safety Equipment:</strong> First aid kits and emergency
              protocols
            </li>
          </ul>
        </div>
      </div>

      <div className="quality-standards">
        <h3>Quality & Safety Standards</h3>
        <ul className="info-list">
          <li>
            <strong>Therapist Certification:</strong> All therapists hold valid
            licenses and certifications
          </li>
          <li>
            <strong>Background Checks:</strong> Comprehensive screening for all
            staff members
          </li>
          <li>
            <strong>Hygiene Protocols:</strong> Strict sanitation and
            cleanliness standards
          </li>
          <li>
            <strong>Equipment Maintenance:</strong> Regular inspection and
            replacement of all equipment
          </li>
          <li>
            <strong>Insurance Coverage:</strong> Comprehensive liability and
            professional insurance
          </li>
          <li>
            <strong>Continuous Training:</strong> Ongoing education and skill
            development programs
          </li>
        </ul>
      </div>
    </section>
  );
};

export default ServiceAreasSection;
