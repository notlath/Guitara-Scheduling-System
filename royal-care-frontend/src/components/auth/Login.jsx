import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom"; // Add this import
import { login } from "../../features/auth/authSlice"; // Import Redux action
import { api } from "../../services/api";
import TestConnection from "../../TestConnection";

const Login = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Log the payload for debugging
    console.log({ username: formData.username, password: formData.password });

    try {
      const response = await api.post("/auth/login/", formData);
      if (response.status === 200) {
        localStorage.setItem("knoxToken", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        dispatch(login(response.data.user));
        navigate("/dashboard");
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message);
      setError("Invalid credentials");
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
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
          autoComplete="current-password" // Add this attribute
        />
        <button type="submit">Login</button>
        {error && <p>{error}</p>}
      </form>
      <TestConnection /> {/* Add TestConnection here */}
    </>
  );
};

export default Login;
