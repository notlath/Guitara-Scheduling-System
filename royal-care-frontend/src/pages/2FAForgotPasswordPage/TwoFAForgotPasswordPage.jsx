import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import loginSidepic from "../../assets/images/login-sidepic.jpg";
import pageTitles from "../../constants/pageTitles";
import FormBlueprint from "../../globals/FormBlueprint";
import { FormField } from "../../globals/FormField";
import styles from "./TwoFAForgotPasswordPage.module.css";

function TwoFAForgotPasswordPage() {
  useEffect(() => {
    document.title = pageTitles.twoFAForgotPassword;
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
      setError("Please enter the 6-digit verification code.");
      return;
    }
    if (!email) {
      setError(
        "We couldn't find your email. Please restart the password reset process."
      );
      return;
    }
    // Optionally, you could verify the code with the backend here before proceeding
    navigate("/enter-new-password", { state: { email, code } });
  };

  const header = "Check Your Email for a Verification Code";
  const errorMessage = error ? (
    <div className={styles.errorText}>{error}</div>
  ) : null;

  const formFields = (
    <div className={styles.formGroup}>
      <FormField
        label="Verification Code"
        name="verificationCode"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        inputProps={{
          placeholder: "Enter the 6-digit code",

          type: "number",
        }}
      />
    </div>
  );

  const button = (
    <button type="submit" className="action-btn">
      Verify Code
    </button>
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
          formClass={styles.loginForm}
        >
          {formFields}
        </FormBlueprint>
      </div>
    </div>
  );
}

export default TwoFAForgotPasswordPage;
