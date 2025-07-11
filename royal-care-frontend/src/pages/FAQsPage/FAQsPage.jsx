import { useEffect, useState } from "react";
import { MdKeyboardArrowDown } from "react-icons/md";
import pageTitles from "../../constants/pageTitles";
import PageLayout from "../../globals/PageLayout";
import LayoutRow from "../../globals/LayoutRow";
import styles from "./FAQsPage.module.css";

const FAQsPage = () => {
  const [expandedItems, setExpandedItems] = useState(new Set());

  useEffect(() => {
    document.title = pageTitles.faqs;
  }, []);

  const toggleFaqItem = (index) => {
    const newExpandedItems = new Set(expandedItems);
    if (newExpandedItems.has(index)) {
      newExpandedItems.delete(index);
    } else {
      newExpandedItems.add(index);
    }
    setExpandedItems(newExpandedItems);
  };

  const faqData = [
    {
      question: "Q: How do I book an appointment?",
      answer:
        "A: Navigate to the Scheduling page, select your preferred service, date, and time. You'll be able to choose available therapists and specify any required materials. The system will automatically check availability and deduct materials from inventory when you confirm your booking.",
    },
    {
      question: "Q: How does the payment process work?",
      answer:
        "A: After your appointment is completed, the therapist will request payment through the system. Operators verify payments and mark them as received. You can view payment status in your booking details, and payment amounts are calculated automatically based on selected services.",
    },
    {
      question: "Q: What materials are included with services?",
      answer:
        "A: Each service has specific materials assigned (oils, towels, equipment). When booking, you can specify quantities needed. Volume-based materials like massage oils are measured in ml, while reusable items like equipment are temporarily reserved and returned after completion.",
    },
    {
      question: "Q: How do I reset my password?",
      answer:
        'A: Click "Forgot your password?" on the login page, enter your email address, and click "Send Reset Code." Check your email for the reset link and follow the instructions to set a new password.',
    },
    {
      question: "Q: Can I update my profile information?",
      answer:
        'A: Yes! Go to your Profile page after logging in. You can edit your personal information in the "Edit Profile" tab and change your password in the "Change Password" tab. Make sure to save your changes.',
    },
    {
      question: "Q: How can I track my appointment status?",
      answer:
        "A: Visit the Bookings page to view all your appointments with their current status (pending, confirmed, in progress, completed). You can filter by status and search by client name or service. Each appointment shows detailed information including assigned therapist and payment status.",
    },
    {
      question: "Q: What should I do if I encounter technical issues?",
      answer:
        "A: First, check the User Guide for step-by-step instructions. If the issue persists, visit the Email Support page to contact our development team directly.",
    },
    {
      question: "Q: How do therapists and drivers confirm appointments?",
      answer:
        "A: Therapists receive appointment notifications and must confirm their availability. For multi-therapist appointments, all therapists must confirm before drivers can accept. The system tracks confirmation status and automatically updates appointment progress.",
    },
    {
      question: "Q: Can I book multiple therapists for one appointment?",
      answer:
        'A: Yes! When booking, check the "Multiple Therapists" option to select multiple available therapists. The system will verify that all selected therapists are available for your chosen time slot.',
    },
    {
      question: "Q: What browsers are supported?",
      answer:
        "A: The system works best on modern browsers including Chrome, Firefox, Safari, and Edge. For optimal performance, keep your browser updated to the latest version. JavaScript must be enabled.",
    },
    {
      question: "Q: How do I check inventory and material usage?",
      answer:
        "A: Operators can access the Inventory page to view current stock levels, add new items, and track material usage. The system automatically deducts materials when appointments are created and provides detailed usage logs for each item.",
    },
    {
      question: "Q: Where can I find more detailed help?",
      answer:
        "A: Visit the User Guide for comprehensive tutorials and best practices. You can also check the Email Support page for direct contact with our development team.",
    },
  ];

  return (
    <PageLayout>
      <LayoutRow
        title="Frequently Asked Questions"
        subtitle="Find answers to common questions about booking appointments, managing materials, payments, and using the Royal Care system. For additional help, visit our User Guide or Email Support."
      />
      <div className={styles["placeholder-content"]}>
        <div className={styles["faq-list"]}>
          {faqData.map((faq, index) => (
            <div key={index} className={styles["faq-item"]}>
              <button
                className={styles["faq-question"]}
                onClick={() => toggleFaqItem(index)}
                aria-expanded={expandedItems.has(index)}
              >
                <span>{faq.question}</span>
                <MdKeyboardArrowDown
                  className={`${styles["faq-arrow"]} ${
                    expandedItems.has(index) ? styles["expanded"] : ""
                  }`}
                />
              </button>
              <div
                className={`${styles["faq-answer"]} ${
                  expandedItems.has(index) ? styles["expanded"] : ""
                }`}
              >
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
};

export default FAQsPage;
