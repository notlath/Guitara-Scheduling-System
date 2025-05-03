import { useNavigate } from "react-router-dom";
import styles from "./EnterNewPasswordPage.module.css";

import loginSidepic from "../../assets/images/login-sidepic.jpg";

function EnterNewPasswordPage() {
  const navigate = useNavigate();
  const handleButtonClick = () => {
    navigate("/forgot-password-confirmation");
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.imageSide}>
        <img src={loginSidepic} alt="Background" />
      </div>

      <div className={styles.formSide}>
        <form className={styles.loginForm}>
          <div className={styles.formGroup}>
            <h2 className={styles.formHeading}>Reset your password</h2>
            <label className={styles.formLabel}>New password</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              placeholder="Enter your new password"
              className={styles.formInput}
            />
            <label className={styles.formLabel}>Re-enter new password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Re-enter your new password"
              className={styles.formInput}
            />
          </div>

          <button
            type="submit"
            onClick={handleButtonClick}
            className={styles.formButton}
          >
            Submit
          </button>

          <div className={styles.registerLink}>
            <a href="/" className={styles.registerLinkAnchor}>
              Back to login
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EnterNewPasswordPage;
