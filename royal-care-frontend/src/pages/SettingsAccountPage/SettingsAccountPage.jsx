import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ProfilePhotoUpload from "../../components/ProfilePhotoUpload/ProfilePhotoUpload";
import pageTitles from "../../constants/pageTitles";
import { updateUserProfile } from "../../features/auth/authSlice";
import {
  changePassword,
  getUserProfile,
  updateUserProfile as updateUserProfileAPI,
} from "../../services/api";
import "../../styles/Placeholders.css";
import "../../styles/Settings.css";
import { profileCache } from "../../utils/profileCache";
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

  const [profilePhoto, setProfilePhoto] = useState(null);

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

  // Memoized user data extraction to avoid repeated localStorage calls
  const cachedUserData = useMemo(() => {
    if (user) return user;

    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      console.error("Failed to parse stored user data:", e);
      return null;
    }
  }, [user]);

  useEffect(() => {
    document.title = pageTitles.accountSettings;

    // Fast authentication check - single localStorage call
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    // If we have cached user data, use it immediately to avoid API call
    if (cachedUserData) {
      const userId = cachedUserData.id || cachedUserData.email;
      const cachedProfile = profileCache.get(userId);

      if (cachedProfile) {
        // Use cached profile data
        setProfileData(cachedProfile);
        setLoading((prev) => ({ ...prev, initial: false }));
        return;
      } else {
        // Use user data from storage as immediate fallback
        setProfileData({
          first_name: cachedUserData.first_name || "",
          last_name: cachedUserData.last_name || "",
          email: cachedUserData.email || "",
          phone_number: cachedUserData.phone_number || "",
        });
        setLoading((prev) => ({ ...prev, initial: false }));
        return;
      }
    }

    // Only make API call if no cached data is available
    const loadUserProfile = async () => {
      try {
        const response = await getUserProfile();
        const userData = response.data;

        const profileData = {
          first_name: userData.first_name || "",
          last_name: userData.last_name || "",
          email: userData.email || "",
          phone_number: userData.phone_number || "",
        };

        setProfileData(profileData);

        // Cache the profile data
        const userId = userData.id || userData.email;
        if (userId) {
          profileCache.set(userId, profileData);
        }
      } catch (error) {
        console.error("Failed to load user profile:", error);

        // Handle authentication errors
        if (error.response?.status === 401) {
          localStorage.removeItem("knoxToken");
          localStorage.removeItem("user");
          window.location.href = "/login";
          return;
        }
      } finally {
        setLoading((prev) => ({ ...prev, initial: false }));
      }
    };

    loadUserProfile();
  }, [cachedUserData]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading((prev) => ({ ...prev, profile: true }));
    setErrors((prev) => ({ ...prev, profile: "" }));
    setSuccess((prev) => ({ ...prev, profile: false }));

    try {
      const response = await updateUserProfileAPI(profileData);

      // Update Redux store
      dispatch(updateUserProfile(response.data));

      // Update cache with new profile data
      const userId =
        response.data.id ||
        response.data.email ||
        cachedUserData?.id ||
        cachedUserData?.email;
      if (userId) {
        profileCache.set(userId, profileData);
      }

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

  const handleProfileChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setProfileData((prev) => ({ ...prev, [name]: value }));
      // Clear any existing errors when user starts typing
      if (errors.profile) {
        setErrors((prev) => ({ ...prev, profile: "" }));
      }
    },
    [errors.profile]
  );

  const handlePasswordChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setPasswordData((prev) => ({ ...prev, [name]: value }));
      // Clear any existing errors when user starts typing
      if (errors.password) {
        setErrors((prev) => ({ ...prev, password: "" }));
      }
    },
    [errors.password]
  );

  const handlePhotoUpdate = useCallback((photoUrl) => {
    setProfilePhoto(photoUrl);
    // TODO: Update user profile with new photo URL
    console.log("Photo updated:", photoUrl);
  }, []);

  const getRoleDisplayName = useCallback((role) => {
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
  }, []);

  // Memoize the user display data to prevent unnecessary recalculations
  const userDisplayData = useMemo(
    () => ({
      fullName:
        `${profileData.first_name} ${profileData.last_name}`.trim() || "User",
      role: getRoleDisplayName(cachedUserData?.role),
      email: profileData.email || cachedUserData?.email || "No email",
    }),
    [
      profileData.first_name,
      profileData.last_name,
      profileData.email,
      cachedUserData?.role,
      cachedUserData?.email,
      getRoleDisplayName,
    ]
  );

  if (loading.initial) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.header}>
            <h1 className={styles.pageTitle}>Account Settings</h1>
          </div>
          <div className={styles.loadingContainer}>
            <div className="placeholder-loader"></div>
            <p>Loading your account information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Account Settings</h1>
          <p className={styles.pageSubtitle}>
            Manage your account information, security, and preferences
          </p>
        </div>

        {/* User Profile Header */}
        <div className={styles.userProfileHeader}>
          <div className={styles.profilePhotoSection}>
            <ProfilePhotoUpload
              currentPhoto={profilePhoto}
              onPhotoUpdate={handlePhotoUpdate}
              size="large"
            />
          </div>
          <div className={styles.userInfoSection}>
            <h2 className={styles.fullName}>{userDisplayData.fullName}</h2>
            <p className={styles.userRole}>{userDisplayData.role}</p>
            <p className={styles.userEmail}>{userDisplayData.email}</p>
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
            <div className={styles.sectionHeader}>
              <h3>Profile Information</h3>
              <p className={styles.sectionDescription}>
                Update your personal information and contact details
              </p>
            </div>
            <form onSubmit={handleProfileSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="first_name" className={styles.label}>
                    First Name
                  </label>
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
                  <label htmlFor="last_name" className={styles.label}>
                    Last Name
                  </label>
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
                <label htmlFor="email" className={styles.label}>
                  Email Address
                </label>
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
                <label htmlFor="phone_number" className={styles.label}>
                  Contact Number
                </label>
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

              <div className={styles.formActions}>
                <button
                  type="submit"
                  disabled={loading.profile}
                  className={styles.primaryButton}
                >
                  {loading.profile ? "Updating..." : "Update Profile"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Password Section */}
        {activeSection === "password" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>Change Password</h3>
              <p className={styles.sectionDescription}>
                Update your password to keep your account secure
              </p>
            </div>
            <form onSubmit={handlePasswordSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="current_password" className={styles.label}>
                  Current Password
                </label>
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
                <label htmlFor="new_password" className={styles.label}>
                  New Password
                </label>
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
                <label htmlFor="confirm_password" className={styles.label}>
                  Confirm New Password
                </label>
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

              <div className={styles.formActions}>
                <button
                  type="submit"
                  disabled={loading.password}
                  className={styles.primaryButton}
                >
                  {loading.password ? "Changing..." : "Change Password"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsAccountPage;
