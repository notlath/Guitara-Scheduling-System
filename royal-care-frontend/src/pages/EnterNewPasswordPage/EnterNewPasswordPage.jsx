import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./EnterNewPasswordPage.module.css";
import axios from "axios";
import loginSidepic from "../../assets/images/login-sidepic.jpg";
import pageTitles from "../../constants/pageTitles";
import FormBlueprint from "../../globals/FormBlueprint";
import { FormField } from "../../globals/FormField";

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
      const response = await axios.post(
        `${import.meta.env.PROD ? 'https://charismatic-appreciation-production.up.railway.app/api' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api')}/auth/set-new-password/`,
        {
          email,
          code,
          new_password: newPassword,
        }
      );
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

  const header = "Set a New Password";
  const errorMessage = error ? (
    <div className={styles.errorText}>{error}</div>
  ) : null;

  const formFields = (
    <div className={styles.formGroup}>
      <FormField
        label="New Password"
        type="password"
        id="newPassword"
        name="newPassword"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
        inputProps={{
          placeholder: "Create a new password",
          className: styles.formInput,
        }}
      />
      <FormField
        label="Confirm New Password"
        type="password"
        id="confirmPassword"
        name="confirmPassword"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        inputProps={{
          placeholder: "Re-enter your new password",
          className: styles.formInput,
        }}
      />
    </div>
  );

  const button = (
    <button type="submit" className="action-btn" disabled={loading}>
      {loading ? "Setting Password..." : "Set Password"}
    </button>
  );

  const links = (
    <a href="/" className={styles.registerLinkAnchor}>
      Back to login
    </a>
  );

  return (
    <div className={styles.loginContainer}>
      <div className={styles.imageSide}>
        <img src={loginSidepic} alt="Background" />
      </div>
      <div className={styles.formSide}>
        <FormBlueprint
          header={header}
          errorMessage={errorMessage}
          onSubmit={handleSubmit}
          button={button}
          links={links}
          containerClass={styles.loginForm}
        >
          {formFields}
        </FormBlueprint>
      </div>
    </div>
  );
}

export default EnterNewPasswordPage;
