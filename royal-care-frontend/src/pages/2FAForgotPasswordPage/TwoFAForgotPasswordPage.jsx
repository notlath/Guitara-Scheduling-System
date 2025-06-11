import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./TwoFAForgotPasswordPage.module.css";

import loginSidepic from "../../assets/images/login-sidepic.jpg";

function TwoFAForgotPasswordPage() {
  useEffect(() => {
    document.title = "2FA Forgot Password | Royal Care";
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  // Get email from location.state
  const email = location.state?.email;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!code) {
      setError("Please enter the verification code.");
      return;
    }
    if (!email) {
      setError("Missing email. Please restart the reset process.");
      return;
    }
    // Optionally, you could verify the code with the backend here before proceeding
    navigate("/enter-new-password", { state: { email, code } });
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.imageSide}>
        <img src={loginSidepic} alt="Background" />
      </div>

      <div className={styles.formSide}>
        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <h2 className={styles.formHeading}>
              Check your email for a verification code
            </h2>
            <label htmlFor="verificationCode" className={styles.formLabel}>
              Code
            </label>
            <input
              type="number"
              id="verificationCode"
              placeholder="Enter verification code"
              className={styles.formInput}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {error && <div className={styles.errorText}>{error}</div>}
          </div>

          <button type="submit" className={styles.formButton}>
            Verify
          </button>
        </form>
      </div>
    </div>
  );
}

export default TwoFAForgotPasswordPage;
