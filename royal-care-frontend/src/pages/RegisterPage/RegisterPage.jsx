import { useEffect } from "react";
import Register from "../../components/auth/Register";
import pageTitles from "../../constants/pageTitles";
import "../../globals/theme.css";

function RegisterPage() {
  useEffect(() => {
    document.title = pageTitles.registration;
  }, []);

  return <Register />;
}

export default RegisterPage;
