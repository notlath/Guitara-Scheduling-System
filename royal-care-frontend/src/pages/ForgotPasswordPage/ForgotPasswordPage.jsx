import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./ForgotPasswordPage.module.css";

import loginSidepic from "../../assets/images/login-sidepic.jpg";

function ForgotPasswordPage() {
  useEffect(() => {
    document.title = "Forgot Password | Royal Care";
  }, []);

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await axios.post(
        "/api/auth/request-password-reset/",
        { email }
      );
      if (response.data.message) {
        navigate("/2fa-forgot-password", { state: { email } });
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to send reset code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.imageSide}>
        <img src={loginSidepic} alt="Background" />
      </div>

      <div className={styles.formSide}>
        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <h2 className={styles.formHeading}>Reset your password</h2>
            <label htmlFor="email" className={styles.formLabel}>
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email"
              className={styles.formInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && <div className={styles.errorText}>{error}</div>}
          <button type="submit" className="action-btn" disabled={loading}>
            {loading ? "Sending..." : "Reset password"}
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
