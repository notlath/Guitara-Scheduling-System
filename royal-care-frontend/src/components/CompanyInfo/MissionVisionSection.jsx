const MissionVisionSection = () => {
  return (
    <section className="info-section">
      <h2>Mission, Vision, and Values</h2>

      <div className="mission-vision-grid">
        <div className="mission-card">
          <h3>Our Mission</h3>
          <p>
            To provide exceptional home-based massage and wellness services that
            promote healing, relaxation, and overall well-being, while
            maintaining the highest standards of professionalism, safety, and
            customer satisfaction. We strive to make quality wellness care
            accessible and convenient for every client in the comfort of their
            own space.
          </p>
        </div>

        <div className="vision-card">
          <h3>Our Vision</h3>
          <p>
            To be the leading provider of premium home-based wellness services
            in Metro Manila and beyond, recognized for our commitment to
            excellence, innovation, and transforming the way people experience
            therapeutic care. We envision a future where wellness is not just a
            luxury, but an accessible part of everyone's lifestyle.
          </p>
        </div>
      </div>

      <div className="values-section">
        <h3>Our Core Values</h3>
        <div className="values-grid">
          <div className="value-item">
            <h4>Excellence</h4>
            <p>
              We maintain the highest standards in service delivery, therapist
              training, and customer care.
            </p>
          </div>
          <div className="value-item">
            <h4>Trust & Integrity</h4>
            <p>
              We build lasting relationships through honesty, reliability, and
              transparent business practices.
            </p>
          </div>
          <div className="value-item">
            <h4>Professionalism</h4>
            <p>
              Our team upholds the highest levels of professional conduct,
              skill, and ethical standards.
            </p>
          </div>
          <div className="value-item">
            <h4>Innovation</h4>
            <p>
              We continuously improve our services and embrace technology to
              enhance the client experience.
            </p>
          </div>
          <div className="value-item">
            <h4>Compassion</h4>
            <p>
              We approach every client with empathy, understanding their unique
              wellness needs and goals.
            </p>
          </div>
          <div className="value-item">
            <h4>Family Spirit</h4>
            <p>
              As a family-founded business, we extend that same care and warmth
              to our clients and team members.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MissionVisionSection;
