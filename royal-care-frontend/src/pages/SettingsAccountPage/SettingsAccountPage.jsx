import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import pageTitles from "../../constants/pageTitles";
import { updateUserProfile } from "../../features/auth/authSlice";
import {
  changePassword,
  getUserProfile,
  updateUserProfile as updateUserProfileAPI,
} from "../../services/api";
import "../../styles/Placeholders.css";
import "../../styles/Settings.css";
import styles from "./SettingsAccountPage.module.css";

const SettingsAccountPage = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  // Form states
  const [profileData, setProfileData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
  });

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  // UI states
  const [loading, setLoading] = useState({
    profile: false,
    password: false,
    initial: true,
  });

  const [success, setSuccess] = useState({
    profile: false,
    password: false,
  });

  const [errors, setErrors] = useState({
    profile: "",
    password: "",
  });

  const [activeSection, setActiveSection] = useState("profile");

  // Debug function to check authentication state
  const checkAuthState = useCallback(() => {
    const token = localStorage.getItem("knoxToken");
    const userData = localStorage.getItem("user");
    console.log("Auth Debug:", {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      hasUserData: !!userData,
      reduxUser: !!user,
      tokenPreview: token ? `${token.substring(0, 10)}...` : null,
    });
  }, [user]);

  useEffect(() => {
    document.title = pageTitles.accountSettings;

    // Check authentication state
    checkAuthState();

    // Check if user is logged in
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      console.warn("No authentication token found, redirecting to login");
      window.location.href = "/login";
      return;
    }

    // Check if we have user data in Redux store
    if (!user) {
      console.warn("No user data in Redux store, but token exists");
      // Try to get user data from localStorage as fallback
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          console.log("Using fallback user data from localStorage:", userData);
          setProfileData({
            first_name: userData.first_name || "",
            last_name: userData.last_name || "",
            email: userData.email || "",
            phone_number: userData.phone_number || "",
          });
          setLoading((prev) => ({ ...prev, initial: false }));
          return;
        } catch (e) {
          console.error("Failed to parse stored user data:", e);
        }
      }
    }

    const loadUserProfile = async () => {
      try {
        setLoading((prev) => ({ ...prev, initial: true }));
        const response = await getUserProfile();
        const userData = response.data;

        setProfileData({
          first_name: userData.first_name || "",
          last_name: userData.last_name || "",
          email: userData.email || "",
          phone_number: userData.phone_number || "",
        });
      } catch (error) {
        console.error("Failed to load user profile:", error);

        // Handle authentication errors
        if (error.response?.status === 401) {
          // Token is invalid or expired, redirect to login
          console.warn("Authentication token is invalid or expired");
          localStorage.removeItem("knoxToken");
          localStorage.removeItem("user");
          window.location.href = "/login";
          return;
        }

        // Fallback to Redux store data
        if (user) {
          setProfileData({
            first_name: user.first_name || "",
            last_name: user.last_name || "",
            email: user.email || "",
            phone_number: user.phone_number || "",
          });
        }
      } finally {
        setLoading((prev) => ({ ...prev, initial: false }));
      }
    };

    loadUserProfile();
  }, [user, checkAuthState]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading((prev) => ({ ...prev, profile: true }));
    setErrors((prev) => ({ ...prev, profile: "" }));
    setSuccess((prev) => ({ ...prev, profile: false }));

    try {
      const response = await updateUserProfileAPI(profileData);

      // Update Redux store
      dispatch(updateUserProfile(response.data));

      setSuccess((prev) => ({ ...prev, profile: true }));

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess((prev) => ({ ...prev, profile: false }));
      }, 3000);
    } catch (error) {
      // Handle authentication errors
      if (error.response?.status === 401) {
        console.warn(
          "Authentication token is invalid or expired during profile update"
        );
        localStorage.removeItem("knoxToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to update profile. Please try again.";
      setErrors((prev) => ({ ...prev, profile: errorMessage }));
    } finally {
      setLoading((prev) => ({ ...prev, profile: false }));
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading((prev) => ({ ...prev, password: true }));
    setErrors((prev) => ({ ...prev, password: "" }));
    setSuccess((prev) => ({ ...prev, password: false }));

    // Validate passwords match
    if (passwordData.new_password !== passwordData.confirm_password) {
      setErrors((prev) => ({
        ...prev,
        password: "New passwords do not match.",
      }));
      setLoading((prev) => ({ ...prev, password: false }));
      return;
    }

    // Validate password strength
    if (passwordData.new_password.length < 8) {
      setErrors((prev) => ({
        ...prev,
        password: "Password must be at least 8 characters long.",
      }));
      setLoading((prev) => ({ ...prev, password: false }));
      return;
    }

    try {
      await changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });

      // Clear password form
      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });

      setSuccess((prev) => ({ ...prev, password: true }));

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess((prev) => ({ ...prev, password: false }));
      }, 3000);
    } catch (error) {
      // Handle authentication errors
      if (error.response?.status === 401) {
        console.warn(
          "Authentication token is invalid or expired during password change"
        );
        localStorage.removeItem("knoxToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to change password. Please try again.";
      setErrors((prev) => ({ ...prev, password: errorMessage }));
    } finally {
      setLoading((prev) => ({ ...prev, password: false }));
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
    // Clear any existing errors when user starts typing
    if (errors.profile) {
      setErrors((prev) => ({ ...prev, profile: "" }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    // Clear any existing errors when user starts typing
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: "" }));
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case "therapist":
        return "Therapist";
      case "driver":
        return "Driver";
      case "operator":
        return "Operator";
      default:
        return role ? role.charAt(0).toUpperCase() + role.slice(1) : "User";
    }
  };

  if (loading.initial) {
    return (
      <div className="settings-container">
        <div className="settings-content">
          <h1>Account Settings</h1>
          <div className={styles.loadingContainer}>
            <div className="placeholder-loader"></div>
            <p>Loading your account information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-content">
        <h1>Account Settings</h1>

        {/* User Info Header */}
        <div className={styles.userHeader}>
          <div className={styles.userInfo}>
            <h2>
              {profileData.first_name} {profileData.last_name}
            </h2>
            <p className={styles.userRole}>{getRoleDisplayName(user?.role)}</p>
            <p className={styles.userEmail}>{profileData.email}</p>
          </div>
        </div>

        {/* Section Tabs */}
        <div className={styles.sectionTabs}>
          <button
            className={`${styles.tabButton} ${
              activeSection === "profile" ? styles.active : ""
            }`}
            onClick={() => setActiveSection("profile")}
          >
            Profile Information
          </button>
          <button
            className={`${styles.tabButton} ${
              activeSection === "password" ? styles.active : ""
            }`}
            onClick={() => setActiveSection("password")}
          >
            Change Password
          </button>
        </div>

        {/* Profile Section */}
        {activeSection === "profile" && (
          <div className={styles.section}>
            <h3>Update Profile Information</h3>
            <form onSubmit={handleProfileSubmit} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="first_name">First Name</label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={profileData.first_name}
                    onChange={handleProfileChange}
                    required
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="last_name">Last Name</label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={profileData.last_name}
                    onChange={handleProfileChange}
                    required
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="phone_number">Contact Number</label>
                <input
                  type="tel"
                  id="phone_number"
                  name="phone_number"
                  value={profileData.phone_number}
                  onChange={handleProfileChange}
                  placeholder="e.g., +63 912 345 6789"
                  className={styles.input}
                />
              </div>

              {errors.profile && (
                <div className={styles.errorMessage}>{errors.profile}</div>
              )}

              {success.profile && (
                <div className={styles.successMessage}>
                  Profile updated successfully!
                </div>
              )}

              <button
                type="submit"
                disabled={loading.profile}
                className={styles.submitButton}
              >
                {loading.profile ? "Updating..." : "Update Profile"}
              </button>
            </form>
          </div>
        )}

        {/* Password Section */}
        {activeSection === "password" && (
          <div className={styles.section}>
            <h3>Change Password</h3>
            <form onSubmit={handlePasswordSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="current_password">Current Password</label>
                <input
                  type="password"
                  id="current_password"
                  name="current_password"
                  value={passwordData.current_password}
                  onChange={handlePasswordChange}
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="new_password">New Password</label>
                <input
                  type="password"
                  id="new_password"
                  name="new_password"
                  value={passwordData.new_password}
                  onChange={handlePasswordChange}
                  required
                  minLength="8"
                  className={styles.input}
                />
                <small className={styles.helpText}>
                  Password must be at least 8 characters long
                </small>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="confirm_password">Confirm New Password</label>
                <input
                  type="password"
                  id="confirm_password"
                  name="confirm_password"
                  value={passwordData.confirm_password}
                  onChange={handlePasswordChange}
                  required
                  minLength="8"
                  className={styles.input}
                />
              </div>

              {errors.password && (
                <div className={styles.errorMessage}>{errors.password}</div>
              )}

              {success.password && (
                <div className={styles.successMessage}>
                  Password changed successfully!
                </div>
              )}

              <button
                type="submit"
                disabled={loading.password}
                className={styles.submitButton}
              >
                {loading.password ? "Changing..." : "Change Password"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsAccountPage;
