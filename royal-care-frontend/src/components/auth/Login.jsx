import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { login } from "../../features/auth/authSlice";
import { api } from "../../services/api";

const Login = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [verificationCode, setVerificationCode] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false); // Track 2FA state
  const [error, setError] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();

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
      setError(err.response?.data?.error || "Invalid credentials");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {!needs2FA ? (
        <>
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
          />
        </>
      ) : (
        <input
          type="text"
          name="verificationCode"
          placeholder="Enter 6-digit code"
          value={verificationCode}
          onChange={handleChange}
        />
      )}
      <button type="submit">{needs2FA ? "Verify Code" : "Login"}</button>
      {error && <p>{error}</p>}
    </form>
  );
};

export default Login;
