import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import loginSidepic from "../../assets/images/login-sidepic.jpg";
import pageTitles from "../../constants/pageTitles";
import FormBlueprint from "../../globals/FormBlueprint";
import { FormField } from "../../globals/FormField";
import { api } from "../../services/api";
import styles from "./EnterNewPasswordPage.module.css";

function EnterNewPasswordPage() {
  useEffect(() => {
    document.title = pageTitles.enterNewPassword;
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFieldErrors, setShowFieldErrors] = useState(false);

  // Get email and code from location.state
  const email = location.state?.email;
  const code = location.state?.code;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setShowFieldErrors(true);
    
    if (!newPassword || !confirmPassword) {
      setSubmitError("Please fill in both password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }
    if (!email || !code) {
      setSubmitError("Missing email or code. Please restart the reset process.");
      return;
    }
    setLoading(true);
    try {
      const response = await api.post("/auth/set-new-password/", {
        email,
        code,
        new_password: newPassword,
      });
      if (response.data.message) {
        navigate("/forgot-password-confirmation");
      }
    } catch (err) {
      setSubmitError(
        err.response?.data?.error ||
          "Failed to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const header = "Set a New Password";
  const errorMessage = submitError ? (
    <div className={styles.errorText}>{submitError}</div>
  ) : null;

  const formFields = (
    <div className={styles.formGroup}>
      <FormField
        label="New Password"
        name="newPassword"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        validate={(value, touched) => {
          if (!value || value.trim() === "") {
            return touched || showFieldErrors
              ? "Please enter a new password"
              : "";
          }
          if (value.length < 8) {
            return touched || showFieldErrors
              ? "Password must be at least 8 characters long"
              : "";
          }
          return "";
        }}
        showError={showFieldErrors}
        inputProps={{
          placeholder: "Create a new password",
        }}
      />
      <FormField
        label="Confirm New Password"
        name="confirmPassword"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        validate={(value, touched) => {
          if (!value || value.trim() === "") {
            return touched || showFieldErrors
              ? "Please confirm your new password"
              : "";
          }
          if (value !== newPassword) {
            return touched || showFieldErrors
              ? "Passwords do not match"
              : "";
          }
          return "";
        }}
        showError={showFieldErrors}
        inputProps={{
          placeholder: "Re-enter your new password",
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
