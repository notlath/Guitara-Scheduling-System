import { useEffect } from "react";
import { supabase } from "./services/supabaseClient";

const TestConnection = () => {
  useEffect(() => {
    const testConnection = async () => {
      const { data, error } = await supabase
        .from("core_customuser")
        .select("*")
        .limit(1);
      if (error) {
        console.error("Supabase connection error:", error);
      } else {
        console.log("Supabase connected! Sample data:", data);
      }
    };
    testConnection();
  }, []);

  return <div>Testing Supabase Connection...</div>;
};

export default TestConnection;
