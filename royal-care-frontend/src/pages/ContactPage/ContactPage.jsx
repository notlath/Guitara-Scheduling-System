import { useEffect, useState } from "react";
import styles from "./ContactPage.module.css";
import PageLayout from "../../globals/PageLayout";
import pageTitles from "../../constants/pageTitles";
import { MdError } from "react-icons/md";
import jonAvatar from "../../assets/images/jon.jpg";
import jayAvatar from "../../assets/images/jay.jpg";
import lathAvatar from "../../assets/images/lath.png";

const developers = [
  {
    name: "Lathrell Pagsuguiron",
    email: "qltpagsuguiron@tip.edu.ph",
    avatar: lathAvatar,
  },
  {
    name: "Jhervince Rada",
    email: "jhervincerada@gmail.com",
    avatar: jayAvatar,
  },
  {
    name: "Jon Gleur Tan",
    email: "qjgptan@tip.edu.ph",
    avatar: jonAvatar,
  },
  // Add more members as needed
];

const ContactPage = () => {
  const [copiedIdx, setCopiedIdx] = useState(null);

  useEffect(() => {
    document.title = pageTitles.contact;
  }, []);

  return (
    <PageLayout>
      <div className={styles.contactSupportContainer}>
        <h1 className={styles.header}>Email Support</h1>
        <div className={styles.subtitleRow}>
          <div className={styles.subtitleText}>
            <span className={styles.exclamationIcon} aria-label="Important">
              <MdError className={styles.exclamationSvg} />
            </span>
            <span>
              Make sure to read the user guide and FAQs first.
              <br />
              If the issue persists, feel free to reach out to the developers
              listed below.
            </span>
          </div>
        </div>
        <div className={styles.contactList}>
          {developers.map((dev, idx) => (
            <div
              className={styles.contactMember}
              key={idx}
              onClick={async () => {
                await navigator.clipboard.writeText(dev.email);
                setCopiedIdx(idx);
              }}
              onMouseLeave={() => setCopiedIdx(null)}
              tabIndex={0}
              role="button"
              aria-label={`Copy ${dev.name}'s email`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  navigator.clipboard.writeText(dev.email);
                  setCopiedIdx(idx);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <img
                src={dev.avatar}
                alt={dev.name + " profile"}
                className={styles.avatar}
                loading="lazy"
              />
              <strong className={styles.name}>{dev.name}</strong>
              <div className={styles.emailContainer}>
                <div className={styles.email}>{dev.email}</div>
                <div className={styles.copyHint}>
                  {copiedIdx === idx ? "Copied!" : "Click to copy email"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
};

export default ContactPage;
