import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../../features/auth/authSlice";
import styles from "./ProfilePage.module.css";

const ProfilePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    document.title = "Profile | Royal Care";
    
    // Get user data from Redux store or localStorage
    if (user) {
      setUserData(user);
    } else {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUserData(parsedUser);
        } catch (error) {
          console.error("Error parsing stored user data:", error);
        }
      }
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem("knoxToken");
    localStorage.removeItem("user");
    dispatch(logout());
    navigate("/");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not available";
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  const getRoleDisplayName = (role) => {
    if (!role) return "User";
    
    const roleMap = {
      'admin': 'Administrator',
      'therapist': 'Therapist',
      'operator': 'Operator',
      'driver': 'Driver',
      'manager': 'Manager',
      'staff': 'Staff Member'
    };
    
    return roleMap[role.toLowerCase()] || role.charAt(0).toUpperCase() + role.slice(1);
  };

  if (!userData) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.profileContent}>
          <div className={styles.noDataMessage}>
            <h2>Profile information not available</h2>
            <p>Please log in again to view your profile.</p>
            <button 
              className={styles.actionButton} 
              onClick={() => navigate("/login")}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.profileContainer}>
      <div className={styles.profileContent}>
        <div className={styles.profileHeader}>
          <h1 className={styles.profileTitle}>My Profile</h1>
          <p className={styles.profileSubtitle}>
            Manage your account information and settings
          </p>
        </div>

        <div className={styles.profileBody}>
          <div className={styles.profileSection}>
            <h2 className={styles.sectionTitle}>Account Information</h2>
            
            <div className={styles.infoGrid}>
              <div className={styles.infoCard}>
                <div className={styles.infoLabel}>Full Name</div>
                <div className={styles.infoValue}>
                  {userData.full_name || 
                   (userData.first_name && userData.last_name 
                     ? `${userData.first_name} ${userData.last_name}` 
                     : userData.username || "Not provided")}
                </div>
              </div>

              <div className={styles.infoCard}>
                <div className={styles.infoLabel}>Username</div>
                <div className={styles.infoValue}>
                  {userData.username || "Not provided"}
                </div>
              </div>

              <div className={styles.infoCard}>
                <div className={styles.infoLabel}>Email Address</div>
                <div className={styles.infoValue}>
                  {userData.email || "Not provided"}
                </div>
              </div>

              <div className={styles.infoCard}>
                <div className={styles.infoLabel}>Role</div>
                <div className={styles.infoValue}>
                  <span className={styles.roleValue}>
                    {getRoleDisplayName(userData.role || userData.user_type)}
                  </span>
                </div>
              </div>

              <div className={styles.infoCard}>
                <div className={styles.infoLabel}>Member Since</div>
                <div className={styles.infoValue}>
                  {formatDate(userData.date_joined || userData.created_at)}
                </div>
              </div>

              <div className={styles.infoCard}>
                <div className={styles.infoLabel}>Account Status</div>
                <div className={styles.infoValue}>
                  {userData.is_active !== false ? "Active" : "Inactive"}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.profileSection}>
            <div className={styles.actionsSection}>
              <h2 className={styles.sectionTitle}>Account Actions</h2>
              <button 
                className={styles.actionButton} 
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
