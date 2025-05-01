import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from "./LoginPage.module.css";
import "../../styles/login-defaults.css";

import loginSidepic from "../../assets/images/login-sidepic.jpg";
import rcLogo from "../../assets/images/rc_logo.jpg";

function LoginPage() {
  // State variables to manage username and password input
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Event handlers to update state on input changes
  const handleUsernameChange = (event) => {
    setUsername(event.target.value);
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };

  const [error, setError] = useState("");
  const navigate = useNavigate(); // To redirect after login

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/login/", {
        email: username,
        password,
      });

      // Assuming backend returns a token
      localStorage.setItem("token", response.data.token);
      navigate("/dashboard"); // Redirect after login
    } catch (err) {
      setError("Invalid email or password");
    }
  };

  const bypassAuth = true;

  const handleLoginClick = () => {
    if (bypassAuth) {
      // Navigate to 2FA page without authentication
      navigate("/2fa");
    } else {
      // Perform actual authentication
      // ...
    }
  };

  return (
    <div className="loginContainer">
      <div className="imageSide">
        <img src={loginSidepic} alt="Background" />
      </div>

      <div className="formSide">
        <form onSubmit={handleLoginClick} className={styles.loginForm}>
          <div className={styles.formGroup}>
            <div className={styles.logo}>
              <img src={rcLogo} alt="Royal Care Logo" />
            </div>
            <h2 className={styles.welcomeHeading}>Welcome</h2>
            <label htmlFor="username" className={styles.formLabel}>
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={handleUsernameChange}
              className={styles.formInput}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={handlePasswordChange}
              className={styles.formInput}
            />
          </div>

          <div className={styles.forgotPassword}>
            <a href="/forgot-password" className={styles.forgotPasswordLink}>
              Forgot password?
            </a>
          </div>

          <button type="submit" className={styles.loginButton}>
            Login
          </button>

          <div className={styles.registerLink}>
            Is this your first login?{" "}
            <a href="/register" className={styles.registerLinkAnchor}>
              Complete your registration
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
