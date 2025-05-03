import { useNavigate } from "react-router-dom";
import styles from "./ForgotPasswordPage.module.css";

import loginSidepic from "../../assets/images/login-sidepic.jpg";

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const handleButtonClick = () => {
    navigate("/2fa-forgot-password");
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
            <label htmlFor="username" className={styles.formLabel}>
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email"
              className={styles.formInput}
            />
          </div>

          <button
            type="submit"
            onClick={handleButtonClick}
            className={styles.formButton}
          >
            Reset password
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

export default ForgotPasswordPage;
