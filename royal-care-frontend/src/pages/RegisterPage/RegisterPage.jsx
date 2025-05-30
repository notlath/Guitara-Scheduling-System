import { useEffect } from "react";
import Register from "../../components/auth/Register";
import "../../styles/theme.css";

function RegisterPage() {
  useEffect(() => {
    document.title = "Royal Care - Registration";
  }, []);

  return <Register />;
}

export default RegisterPage;
