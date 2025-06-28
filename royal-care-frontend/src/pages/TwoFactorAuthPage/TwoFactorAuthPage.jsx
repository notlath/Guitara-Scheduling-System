import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./TwoFactorAuthPage.module.css";

import loginSidepic from "../../assets/images/login-sidepic.jpg";
import pageTitles from "../../constants/pageTitles";
import { FormField } from "../../globals/FormField";

function TwoFactorAuthPage() {
  useEffect(() => {
    document.title = pageTitles.twoFactorAuth;
  }, []);

  const navigate = useNavigate();
  const handleButtonClick = () => {
    navigate("/dashboard");
  };

  return (
    <div className="loginContainer">
      <div className="imageSide">
        <img src={loginSidepic} alt="Background" />
      </div>

      <div className="formSide">
        <form className={styles.loginForm}>
          <div className={styles.formGroup}>
            <h2 className={styles.formHeading}>
              Check your email for a verification code
            </h2>
            <FormField
              name="verificationCode"
              label="Code"
              type="number"
              inputProps={{
                placeholder: "Enter verification code",
              }}
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

export default TwoFactorAuthPage;
