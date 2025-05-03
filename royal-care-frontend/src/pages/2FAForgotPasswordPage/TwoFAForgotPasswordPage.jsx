import { useNavigate } from "react-router-dom";
import styles from "./TwoFAForgotPasswordPage.module.css";

import loginSidepic from "../../assets/images/login-sidepic.jpg";

function TwoFAForgotPasswordPage() {
  const navigate = useNavigate();
  const handleButtonClick = () => {
    navigate("/enter-new-password");
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.imageSide}>
        <img src={loginSidepic} alt="Background" />
      </div>

      <div className={styles.formSide}>
        <form className={styles.loginForm}>
          <div className={styles.formGroup}>
            <h2 className={styles.formHeading}>
              Check your email for a verification code
            </h2>
            <label htmlFor="username" className={styles.formLabel}>
              Code
            </label>
            <input
              type="number"
              id="verificationCode"
              placeholder="Enter verification code"
              className={styles.formInput}
            />
          </div>

          <button
            type="submit"
            onClick={handleButtonClick}
            className={styles.formButton}
          >
            Verify
          </button>
        </form>
      </div>
    </div>
  );
}

export default TwoFAForgotPasswordPage;
