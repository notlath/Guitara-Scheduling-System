import { useEffect } from "react";
import PageLayout from "../../globals/PageLayout";
import LayoutRow from "../../globals/LayoutRow";
import styles from "./UserGuidePage.module.css";
import pageTitles from "../../constants/pageTitles";

const UserGuidePage = () => {
  useEffect(() => {
    document.title = pageTitles.userGuide;
  }, []);

  return (
    <PageLayout>
      <LayoutRow
        title="User Guide"
        subtitle="Everything you need to know to get the most out of Royal Care."
      ></LayoutRow>
      <div className={styles.userGuideSection}>
        {/* <section className={styles.userGuideIntro}>
          <p>
            Welcome to the Royal Care User Guide! Here you'll find step-by-step
            instructions, video tutorials, and tips to help you navigate and
            make the most of the system.
          </p>
        </section> */}
        <section className={styles.userGuideContent}>
          <div className={styles.userGuideBlock}>
            <h3>Getting Started</h3>
            <ol className={styles.userGuideList}>
              <li>
                <strong>Sign In:</strong> Log in with your credentials to access
                your dashboard.
              </li>
              <li>
                <strong>Dashboard Overview:</strong> View your upcoming
                bookings, notifications, and quick actions.
              </li>
              <li>
                <strong>Navigation:</strong> Use the sidebar to access
                Attendance, Scheduling, Inventory, and more.
              </li>
            </ol>
          </div>

          <div className={styles.userGuideBlock}>
            <h3>Common Tasks</h3>
            <ul className={styles.userGuideList}>
              <li>Book a new appointment or class</li>
              <li>View and manage your schedule</li>
              <li>Track attendance and generate reports</li>
              <li>Manage inventory and supplies</li>
              <li>Update your profile and settings</li>
            </ul>
          </div>

          <div className={styles.userGuideBlock}>
            <h3>Video Tutorials</h3>
            <div className={styles.userGuideVideos}>
              <iframe
                width="320"
                height="180"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                title="Getting Started with Royal Care"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
              <iframe
                width="320"
                height="180"
                src="https://www.youtube.com/embed/9bZkp7q19f0"
                title="Managing Bookings"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>

          <div className={styles.userGuideBlock}>
            <h3>Tips & Best Practices</h3>
            <ul className={styles.userGuideList}>
              <li>Use keyboard shortcuts for faster navigation</li>
              <li>Regularly check notifications for important updates</li>
              <li>Keep your profile information up to date</li>
              <li>Contact support via the Help section for assistance</li>
            </ul>
          </div>
        </section>
        <footer className={styles.userGuideFooter}>
          <p>
            Need more help? Visit our <a href="contact">Email Support</a> or
            contact your administrator.
          </p>
        </footer>
      </div>
    </PageLayout>
  );
};

export default UserGuidePage;
