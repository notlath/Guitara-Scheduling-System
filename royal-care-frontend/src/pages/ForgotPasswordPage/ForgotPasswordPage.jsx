import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "../LoginPage/LoginPage.module.css";

import loginSidepic from "../../assets/images/login-sidepic.jpg";
import { FormField } from "../../globals/FormField";
import FormBlueprint from "../../globals/FormBlueprint";

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
      const response = await axios.post("/api/auth/request-password-reset/", {
        email,
      });
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

  const header = "Reset your password";
  const formFields = (
    <div className={styles.formGroup}>
      <FormField
        label="Email"
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        inputProps={{
          placeholder: "Enter your email",
          className: "global-form-field-input",
          id: "email",
        }}
      />
    </div>
  );
  const errorMessage = error ? (
    <div className="global-form-field-error">{error}</div>
  ) : null;
  const button = (
    <button type="submit" className="action-btn" disabled={loading}>
      {loading ? "Sending..." : "Reset password"}
    </button>
  );
  const links = <a href="/">Back to login</a>;

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
          formClass={styles.loginForm}
        >
          {formFields}
        </FormBlueprint>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
