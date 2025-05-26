import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/theme.css";
import styles from "./LoginPage.module.css";

import { useDispatch } from "react-redux";
import loginSidepic from "../../assets/images/login-sidepic.jpg";
import rcLogo from "../../assets/images/rc_logo.jpg";
import { login } from "../../features/auth/authSlice";
import { api } from "../../services/api";

function LoginPage() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [verificationCode, setVerificationCode] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false); // Track 2FA state
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Track loading state
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Login | Royal Care";
  }, []);

  // Event handlers to update state on input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (needs2FA) {
      setVerificationCode(value); // Capture 2FA code
    } else {
      setFormData({ ...formData, [name]: value }); // Capture username/password
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsLoading(true);

    try {
      if (!needs2FA) {
        // Initial login request
        const response = await api.post("/auth/login/", formData);

        if (response.data.message === "2FA code sent") {
          setNeeds2FA(true); // Show 2FA input
        } else {
          // Handle non-2FA login (if allowed)
          localStorage.setItem("knoxToken", response.data.token);
          localStorage.setItem("user", JSON.stringify(response.data.user));
          dispatch(login(response.data.user));
          navigate("/dashboard");
        }
      } else {
        // Verify 2FA code
        const response = await api.post("/auth/two-factor-verify/", {
          email: formData.username, // Assuming username is email
          code: verificationCode,
        });

        // On success
        localStorage.setItem("knoxToken", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        dispatch(login(response.data.user));
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Incorrect username or password");
    }

    setIsLoading(false);
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.imageSide}>
        <img src={loginSidepic} alt="Background" />
      </div>
      <div className={styles.formSide}>
        <div className={styles.formContainer}>
          <div className={styles.logo}>
            <img src={rcLogo} alt="Royal Care Logo" />
          </div>
          <h2 className={styles.welcomeHeading}>Good to See You!</h2>
          {error && <p className={styles.errorMessage}>{error}</p>}
          <form onSubmit={handleSubmit} className={styles.loginForm}>
            {!needs2FA ? (
              <div className={styles.inputContainer}>
                <div className={styles.formGroup}>
                  <label htmlFor="username" className={styles.formLabel}>
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    value={formData.username}
                    className={styles.formInput}
                    onChange={handleChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="password" className={styles.formLabel}>
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    className={styles.formInput}
                  />
                </div>
              </div>
            ) : (
              <div className={styles.formGroup}>
                <label htmlFor="verificationCode" className={styles.formLabel}>
                  2FA Code
                </label>
                <input
                  type="text"
                  name="verificationCode"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={handleChange}
                  className={styles.formInput}
                />
              </div>
            )}
            <div className={styles.forgotPassword}>
              <a href="/forgot-password" className={styles.forgotPasswordLink}>
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className={`${styles.loginButton} ${
                isLoading ? styles.loginButtonDisabled : ""
              }`}
            >
              {needs2FA ? "Verify Code" : "Login"}
            </button>
          </form>
          <div className={styles.registerLink}>
            Is this your first login?{" "}
            <a href="/register" className={styles.registerLinkAnchor}>
              Complete your registration
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
