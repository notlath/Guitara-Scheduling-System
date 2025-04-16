import { useState } from "react";
import { useDispatch } from "react-redux";
import { login } from "../../features/auth/authSlice"; // Import Redux action
import { api } from "../../services/api";
import TestConnection from "../../TestConnection";

const Login = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const dispatch = useDispatch(); // Initialize Redux dispatch

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/auth/login/", formData);
      if (response.data.token) {
        localStorage.setItem("knoxToken", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user)); // Store user data
        dispatch(login(response.data.user)); // Store user data in Redux
        window.location.href = "/dashboard";
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      console.error(err); // Log the error
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
        />
        <button type="submit">Login</button>
        {error && <p>{error}</p>}
      </form>
      <TestConnection /> {/* Add TestConnection here */}
    </>
  );
};

export default Login;
