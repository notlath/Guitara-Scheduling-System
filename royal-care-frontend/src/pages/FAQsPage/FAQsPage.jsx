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
        subtitle="Find answers to common questions about booking appointments, managing materials, payments, and using the Royal Care system. For additional help, visit our User Guide or Email Support."
      />
      <div className={styles["placeholder-content"]}>
        <div className={styles["faq-list"]}>
          <div className={styles["faq-item"]}>
            <strong>Q: How do I book an appointment?</strong>
            <p>
              A: Navigate to the Scheduling page, select your preferred service,
              date, and time. You'll be able to choose available therapists and
              specify any required materials. The system will automatically
              check availability and deduct materials from inventory when you
              confirm your booking.
            </p>
          </div>

          <div className={styles["faq-item"]}>
            <strong>Q: How does the payment process work?</strong>
            <p>
              A: After your appointment is completed, the therapist will request
              payment through the system. Operators verify payments and mark
              them as received. You can view payment status in your booking
              details, and payment amounts are calculated automatically based on
              selected services.
            </p>
          </div>

          <div className={styles["faq-item"]}>
            <strong>Q: What materials are included with services?</strong>
            <p>
              A: Each service has specific materials assigned (oils, towels,
              equipment). When booking, you can specify quantities needed.
              Volume-based materials like massage oils are measured in ml, while
              reusable items like equipment are temporarily reserved and
              returned after completion.
            </p>
          </div>

          <div className={styles["faq-item"]}>
            <strong>Q: How do I reset my password?</strong>
            <p>
              A: Click "Forgot your password?" on the login page, enter your
              email address, and click "Send Reset Code." Check your email for
              the reset link and follow the instructions to set a new password.
            </p>
          </div>

          <div className={styles["faq-item"]}>
            <strong>Q: Can I update my profile information?</strong>
            <p>
              A: Yes! Go to your Profile page after logging in. You can edit
              your personal information in the "Edit Profile" tab and change
              your password in the "Change Password" tab. Make sure to save your
              changes.
            </p>
          </div>

          <div className={styles["faq-item"]}>
            <strong>Q: How can I track my appointment status?</strong>
            <p>
              A: Visit the Bookings page to view all your appointments with
              their current status (pending, confirmed, in progress, completed).
              You can filter by status and search by client name or service.
              Each appointment shows detailed information including assigned
              therapist and payment status.
            </p>
          </div>

          <div className={styles["faq-item"]}>
            <strong>
              Q: What should I do if I encounter technical issues?
            </strong>
            <p>
              A: First, check the{" "}
              <a href="/dashboard/help/user-guide">User Guide</a> for
              step-by-step instructions. If the issue persists, visit the
              <a href="/dashboard/help/contact"> Email Support</a> page to
              contact our development team directly.
            </p>
          </div>

          <div className={styles["faq-item"]}>
            <strong>
              Q: How do therapists and drivers confirm appointments?
            </strong>
            <p>
              A: Therapists receive appointment notifications and must confirm
              their availability. For multi-therapist appointments, all
              therapists must confirm before drivers can accept. The system
              tracks confirmation status and automatically updates appointment
              progress.
            </p>
          </div>

          <div className={styles["faq-item"]}>
            <strong>
              Q: Can I book multiple therapists for one appointment?
            </strong>
            <p>
              A: Yes! When booking, check the "Multiple Therapists" option to
              select multiple available therapists. The system will verify that
              all selected therapists are available for your chosen time slot.
            </p>
          </div>

          <div className={styles["faq-item"]}>
            <strong>Q: What browsers are supported?</strong>
            <p>
              A: The system works best on modern browsers including Chrome,
              Firefox, Safari, and Edge. For optimal performance, keep your
              browser updated to the latest version. JavaScript must be enabled.
            </p>
          </div>

          <div className={styles["faq-item"]}>
            <strong>Q: How do I check inventory and material usage?</strong>
            <p>
              A: Operators can access the Inventory page to view current stock
              levels, add new items, and track material usage. The system
              automatically deducts materials when appointments are created and
              provides detailed usage logs for each item.
            </p>
          </div>

          <div className={styles["faq-item"]}>
            <strong>Q: Where can I find more detailed help?</strong>
            <p>
              A: Visit the <a href="/dashboard/help/user-guide">User Guide</a>{" "}
              for comprehensive tutorials and best practices. You can also check
              the
              <a href="/dashboard/help/contact"> Email Support</a> page for
              direct contact with our development team.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default FAQsPage;
