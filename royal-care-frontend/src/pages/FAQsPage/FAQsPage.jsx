import { useEffect } from "react";
import pageTitles from "../../constants/pageTitles";
import PageLayout from "../../globals/PageLayout";
import LayoutRow from "../../globals/LayoutRow";
import styles from "./FAQsPage.module.css";

const FAQsPage = () => {
  useEffect(() => {
    document.title = pageTitles.faqs;
  }, []);

  return (
    <PageLayout>
      <LayoutRow
        title="Frequently Asked Questions"
        subtitle="Here are some common questions and answers. If you need more help, please contact support."
      />
      <div className={styles["placeholder-content"]}>
        <div className={styles["faq-list"]}>
          <div className={styles["faq-item"]}>
            <strong>Q: How do I book an appointment?</strong>
            <p>
              A: Go to the Bookings page, select your preferred date and time,
              and follow the instructions to confirm your booking.
            </p>
          </div>
          <div className={styles["faq-item"]}>
            <strong>Q: What should I do if I forget my password?</strong>
            <p>
              A: Click on the "Forgot Password" link on the login page and
              follow the instructions to reset your password via email.
            </p>
          </div>
          <div className={styles["faq-item"]}>
            <strong>Q: How can I update my account information?</strong>
            <p>
              A: Navigate to the Profile page after logging in, then click
              "Edit" to update your details.
            </p>
          </div>
          <div className={styles["faq-item"]}>
            <strong>Q: Who do I contact for technical support?</strong>
            <p>
              A: Please visit the Contact page to reach out to our support team
              or developers.
            </p>
          </div>
          <div className={styles["faq-item"]}>
            <strong>Q: What are the system requirements?</strong>
            <p>
              A: The system works best on modern browsers like Chrome, Firefox,
              or Edge. For the best experience, keep your browser updated.
            </p>
          </div>
        </div>
        <p className={styles["placeholder-coming-soon"]}>
          More FAQs coming soon...
        </p>
      </div>
    </PageLayout>
  );
};

export default FAQsPage;
