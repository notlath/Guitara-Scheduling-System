import { useNavigate } from "react-router-dom";
import styles from "./ForgotPasswordConfirmationPage.module.css";

import loginSidepic from "../../assets/images/login-sidepic.jpg";

function ForgotPasswordConfirmationPage() {
  const navigate = useNavigate();
  const handleButtonClick = () => {
    navigate("/");
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.imageSide}>
        <img src={loginSidepic} alt="Background" />
      </div>

      <div className={styles.formSide}>
        <form className={styles.loginForm}>
          <div className={styles.formGroup}>
            <h2 className={styles.formHeading}>Password reset successfully</h2>
          </div>

          <button
            type="submit"
            onClick={handleButtonClick}
            className={styles.formButton}
          >
            Back to login
          </button>
        </form>
      </div>
    </div>
  );
}

export default ForgotPasswordConfirmationPage;
