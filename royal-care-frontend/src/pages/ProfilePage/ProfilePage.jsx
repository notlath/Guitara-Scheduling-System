import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import ProfilePhotoUpload from "../../components/ProfilePhotoUpload/ProfilePhotoUpload";
import pageTitles from "../../constants/pageTitles";
import { logout } from "../../features/auth/authSlice";
import styles from "./ProfilePage.module.css";

const ProfilePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [userData, setUserData] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);

  useEffect(() => {
    document.title = pageTitles.profile;

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

  const handlePhotoUpdate = (photoUrl) => {
    setProfilePhoto(photoUrl);
    // TODO: Update user profile with new photo URL
    console.log("Photo updated:", photoUrl);
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
      admin: "Administrator",
      therapist: "Therapist",
      operator: "Operator",
      driver: "Driver",
      manager: "Manager",
      staff: "Staff Member",
    };

    return (
      roleMap[role.toLowerCase()] ||
      role.charAt(0).toUpperCase() + role.slice(1)
    );
  };

  if (!userData) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
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
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>My Profile</h1>
          <p className={styles.pageSubtitle}>
            View your account information and settings
          </p>
        </div>

        {/* User Profile Header with Photo */}
        <div className={styles.userProfileHeader}>
          <div className={styles.profilePhotoSection}>
            <ProfilePhotoUpload
              currentPhoto={profilePhoto}
              onPhotoUpdate={handlePhotoUpdate}
              size="large"
            />
          </div>
          <div className={styles.userInfoSection}>
            <h2 className={styles.fullName}>
              {userData.full_name ||
                (userData.first_name && userData.last_name
                  ? `${userData.first_name} ${userData.last_name}`
                  : "User Profile")}
            </h2>
            <p className={styles.username}>
              @{userData.username || "username"}
            </p>
            <p className={styles.userRole}>
              {getRoleDisplayName(userData.role || userData.user_type)}
            </p>
          </div>
        </div>

        {/* Profile Information Section */}
        <div className={styles.profileSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Account Information</h3>
            <p className={styles.sectionDescription}>
              Your personal details and account status
            </p>
          </div>

          <div className={styles.infoGrid}>
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

        {/* Actions Section */}
        <div className={styles.profileSection}>
          <div className={styles.actionsSection}>
            <h3 className={styles.sectionTitle}>Account Actions</h3>
            <button className={styles.actionButton} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
