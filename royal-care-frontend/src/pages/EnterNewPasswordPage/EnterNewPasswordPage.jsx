import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./EnterNewPasswordPage.module.css";
import axios from "axios";
import loginSidepic from "../../assets/images/login-sidepic.jpg";
import pageTitles from "../../constants/pageTitles";

function EnterNewPasswordPage() {
  useEffect(() => {
    document.title = pageTitles.enterNewPassword;
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Get email and code from location.state
  const email = location.state?.email;
  const code = location.state?.code;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!newPassword || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!email || !code) {
      setError("Missing email or code. Please restart the reset process.");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/set-new-password/`, {
        email,
        code,
        new_password: newPassword,
      });
      if (response.data.message) {
        navigate("/forgot-password-confirmation");
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to reset password. Please try again."
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
            <label className={styles.formLabel}>New password</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              placeholder="Enter your new password"
              className={styles.formInput}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <label className={styles.formLabel}>Re-enter new password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Re-enter your new password"
              className={styles.formInput}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {error && <div className={styles.errorText}>{error}</div>}
          </div>

          <button type="submit" className="action-btn" disabled={loading}>
            {loading ? "Submitting..." : "Submit"}
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
