import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "../LoginPage/LoginPage.module.css";

import loginSidepic from "../../assets/images/login-sidepic.jpg";
import { FormField } from "../../globals/FormField";
import FormBlueprint from "../../globals/FormBlueprint";
import pageTitles from "../../constants/pageTitles";

function ForgotPasswordPage() {
  useEffect(() => {
    document.title = pageTitles.forgotPassword;
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
        `${import.meta.env.VITE_API_BASE_URL}/auth/request-password-reset/`,
        {
          email,
        }
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

  const header = "Forgot Your Password?";
  const formFields = (
    <div className={styles.formGroup}>
      <FormField
        label="Email Address"
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        inputProps={{
          placeholder: "e.g. johndoe@email.com",
          className: "global-form-field-input",
          id: "email",
        }}
      />
    </div>
  );
  const errorMessage = error ? (
    <div className={styles.errorMessage}>
      {error === "Failed to send reset code. Please try again."
        ? "We couldn't send a reset code to that email. Please check your email address and try again."
        : error}
    </div>
  ) : null;
  const button = (
    <button type="submit" className="action-btn" disabled={loading}>
      {loading ? "Sending..." : "Send Reset Code"}
    </button>
  );
  const links = <a href="/">Back to Login</a>;

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
