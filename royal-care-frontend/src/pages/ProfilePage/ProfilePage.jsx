import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import ProfilePhotoUpload from "../../components/ProfilePhotoUpload/ProfilePhotoUploadPure";
import pageTitles from "../../constants/pageTitles";
import { logout, updateUserProfile } from "../../features/auth/authSlice";
import PageLayout from "../../globals/PageLayout";
import {
  changePassword,
  getUserProfile,
  updateUserProfile as updateUserProfileAPI,
} from "../../services/api";
import "../../styles/Placeholders.css";
import { profileCache } from "../../utils/profileCache";
import { performLogout } from "../../utils/logoutUtils";
import styles from "./ProfilePage.module.css";

const ProfilePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useSelector((state) => state.auth.user);
  const [userData, setUserData] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [activeSection, setActiveSection] = useState("view");

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

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);

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

  // Get cached user data
  const cachedUserData = useMemo(() => {
    try {
      return profileCache.get("user_profile");
    } catch {
      return null;
    }
  }, []);

  // Initialize user data
  useEffect(() => {
    document.title = pageTitles.profile;

    const initializeUserData = async () => {
      setLoading((prev) => ({ ...prev, initial: true }));

      try {
        // Try to get data from Redux store first
        let currentUserData = user;

        // Fallback to localStorage if Redux store is empty
        if (!currentUserData) {
          const storedUser = localStorage.getItem("user");
          if (
            storedUser &&
            storedUser !== "undefined" &&
            storedUser !== "null"
          ) {
            try {
              currentUserData = JSON.parse(storedUser);
            } catch (error) {
              console.error("Error parsing stored user data:", error);
              localStorage.removeItem("user");
            }
          }
        }

        // Set initial data
        if (currentUserData) {
          setUserData(currentUserData);
          setProfilePhoto(currentUserData.profile_photo_url);
          setProfileData({
            first_name: currentUserData.first_name || "",
            last_name: currentUserData.last_name || "",
            email: currentUserData.email || "",
            phone_number: currentUserData.phone_number || "",
          });
          setTwoFactorEnabled(currentUserData.two_factor_enabled || false);
        }

        // Fetch latest profile data from API
        const token = localStorage.getItem("knoxToken");
        if (token) {
          try {
            const response = await getUserProfile();
            const latestUserData = response.data;

            setUserData(latestUserData);
            setProfilePhoto(latestUserData.profile_photo_url);
            setProfileData({
              first_name: latestUserData.first_name || "",
              last_name: latestUserData.last_name || "",
              email: latestUserData.email || "",
              phone_number: latestUserData.phone_number || "",
            });
            setTwoFactorEnabled(latestUserData.two_factor_enabled || false);

            // Cache the profile data
            profileCache.set("user_profile", latestUserData);
          } catch (error) {
            console.error("Error fetching latest profile:", error);
          }
        }
      } catch (error) {
        console.error("Error initializing user data:", error);
      } finally {
        setLoading((prev) => ({ ...prev, initial: false }));
      }
    };

    initializeUserData();
  }, [user]);

  // Form handlers
  const handleProfileChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setProfileData((prev) => ({ ...prev, [name]: value }));

      // Clear errors when user starts typing
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

      // Clear errors when user starts typing
      if (errors.password) {
        setErrors((prev) => ({ ...prev, password: "" }));
      }
    },
    [errors.password]
  );

  // Form submissions
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading((prev) => ({ ...prev, profile: true }));
    setErrors((prev) => ({ ...prev, profile: "" }));

    try {
      const response = await updateUserProfileAPI(profileData);

      // Update local state
      const updatedUserData = { ...userData, ...response.data };
      setUserData(updatedUserData);

      // Update Redux store
      dispatch(updateUserProfile(response.data));

      // Update localStorage
      localStorage.setItem("user", JSON.stringify(updatedUserData));

      // Update cache
      profileCache.set("user_profile", updatedUserData);

      setSuccess((prev) => ({ ...prev, profile: true }));

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess((prev) => ({ ...prev, profile: false }));
      }, 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setErrors((prev) => ({
        ...prev,
        profile: error.response?.data?.detail || "Failed to update profile",
      }));
    } finally {
      setLoading((prev) => ({ ...prev, profile: false }));
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    // Validate passwords match
    if (passwordData.new_password !== passwordData.confirm_password) {
      setErrors((prev) => ({ ...prev, password: "Passwords do not match" }));
      return;
    }

    setLoading((prev) => ({ ...prev, password: true }));
    setErrors((prev) => ({ ...prev, password: "" }));

    try {
      await changePassword({
        old_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });

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
      console.error("Error changing password:", error);
      setErrors((prev) => ({
        ...prev,
        password: error.response?.data?.detail || "Failed to change password",
      }));
    } finally {
      setLoading((prev) => ({ ...prev, password: false }));
    }
  };

  const handleLogout = async () => {
    await performLogout(dispatch, navigate, queryClient, profileCache, logout);
  };

  const handlePhotoUpdate = (photoUrl) => {
    setProfilePhoto(photoUrl);

    // Update user data in localStorage and Redux store
    if (userData) {
      const updatedUser = { ...userData, profile_photo_url: photoUrl };
      setUserData(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      // Update Redux store if available
      if (user) {
        dispatch(updateUserProfile({ profile_photo_url: photoUrl }));
      }
    }
  };

  // 2FA Toggle Handler
  const handleTwoFactorToggle = async () => {
    setTwoFactorLoading(true);
    setErrors((prev) => ({ ...prev, profile: "" }));

    try {
      const newTwoFactorStatus = !twoFactorEnabled;

      // Use the existing API utility for consistency
      await updateUserProfileAPI({
        two_factor_enabled: newTwoFactorStatus,
      });

      // Update local state
      setTwoFactorEnabled(newTwoFactorStatus);

      // Update user data
      const updatedUserData = {
        ...userData,
        two_factor_enabled: newTwoFactorStatus,
      };
      setUserData(updatedUserData);
      localStorage.setItem("user", JSON.stringify(updatedUserData));

      // Update Redux store if available
      if (user) {
        dispatch(updateUserProfile({ two_factor_enabled: newTwoFactorStatus }));
      }

      // Update cache
      profileCache.set("user_profile", updatedUserData);

      setSuccess((prev) => ({ ...prev, profile: true }));
      setTimeout(() => {
        setSuccess((prev) => ({ ...prev, profile: false }));
      }, 3000);
    } catch (error) {
      console.error("Error toggling 2FA:", error);
      // Use consistent error handling pattern
      setErrors((prev) => ({
        ...prev,
        profile:
          error.response?.data?.error ||
          error.response?.data?.detail ||
          error.message ||
          "Failed to update 2FA setting. Please try again.",
      }));
    } finally {
      setTwoFactorLoading(false);
    }
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

  // Memoize the user display data to prevent unnecessary recalculations
  const userDisplayData = useMemo(
    () => ({
      fullName:
        `${profileData.first_name} ${profileData.last_name}`.trim() || "User",
      role: getRoleDisplayName(cachedUserData?.role || userData?.role),
      email:
        profileData.email ||
        cachedUserData?.email ||
        userData?.email ||
        "No email",
    }),
    [
      profileData.first_name,
      profileData.last_name,
      profileData.email,
      cachedUserData?.role,
      cachedUserData?.email,
      userData?.role,
      userData?.email,
    ]
  );

  if (loading.initial) {
    return (
      <PageLayout>
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.loadingContainer}>
              <div className="placeholder-loader"></div>
              <p>Loading your profile information...</p>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!userData) {
    return (
      <PageLayout>
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
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className={styles.container}>
        <div className={styles.content}>
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
              <p className={styles.userEmail}>{userDisplayData.email}</p>
              <p className={styles.userRole}>{userDisplayData.role}</p>
            </div>
          </div>

          {/* Section Tabs */}
          <div className={styles.sectionTabs}>
            <button
              className={`${styles.tabButton} ${
                activeSection === "view" ? styles.active : ""
              }`}
              onClick={() => setActiveSection("view")}
            >
              Profile Overview
            </button>
            <button
              className={`${styles.tabButton} ${
                activeSection === "profile" ? styles.active : ""
              }`}
              onClick={() => setActiveSection("profile")}
            >
              Edit Profile
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

          {/* Profile Overview Section */}
          {activeSection === "view" && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Account Information</h3>
                <p className={styles.sectionDescription}>
                  Your personal details and account status
                </p>
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoCard}>
                  <div className={styles.infoLabel}>Full Name</div>
                  <div className={styles.infoValue}>
                    {userDisplayData.fullName}
                  </div>
                </div>

                <div className={styles.infoCard}>
                  <div className={styles.infoLabel}>Email Address</div>
                  <div className={styles.infoValue}>
                    {userDisplayData.email}
                  </div>
                </div>

                <div className={styles.infoCard}>
                  <div className={styles.infoLabel}>Contact Number</div>
                  <div className={styles.infoValue}>
                    {userData.phone_number || "Not provided"}
                  </div>
                </div>

                <div className={styles.infoCard}>
                  <div className={styles.infoLabel}>Role</div>
                  <div className={styles.infoValue}>
                    <span className={styles.roleValue}>
                      {userDisplayData.role}
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

                <div className={styles.infoCard}>
                  <div className={styles.infoLabel}>
                    Two-Factor Authentication
                  </div>
                  <div className={styles.infoValue}>
                    <div className={styles.twoFactorToggle}>
                      <span className={styles.twoFactorStatus}>
                        {twoFactorEnabled ? "Enabled" : "Disabled"}
                      </span>
                      <button
                        className={`${styles.toggleButton} ${
                          twoFactorEnabled ? styles.enabled : styles.disabled
                        }`}
                        onClick={handleTwoFactorToggle}
                        disabled={twoFactorLoading}
                        title={
                          twoFactorEnabled
                            ? "Click to disable two-factor authentication"
                            : "Click to enable two-factor authentication"
                        }
                      >
                        <div
                          className={`${styles.toggleSlider} ${
                            twoFactorEnabled ? styles.on : styles.off
                          }`}
                        ></div>
                      </button>
                      {twoFactorLoading && (
                        <span className={styles.toggleLoading}>
                          Updating...
                        </span>
                      )}
                    </div>
                    <p className={styles.twoFactorDescription}>
                      {twoFactorEnabled
                        ? "Your account is protected with two-factor authentication. You'll receive a verification code via email when logging in."
                        : "Enable two-factor authentication for enhanced security. You'll receive a verification code via email when logging in."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className={styles.actionsSection}>
                <h3 className={styles.sectionTitle}>Account Actions</h3>
                <button className={styles.actionButton} onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          )}

          {/* Profile Section */}
          {activeSection === "profile" && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Edit Profile Information</h3>
                <p className={styles.sectionDescription}>
                  Update your personal information and contact details
                </p>
              </div>
              <form onSubmit={handleProfileSubmit} className={styles.form}>
                {errors.profile && (
                  <div className={styles.errorMessage}>{errors.profile}</div>
                )}
                {success.profile && (
                  <div className={styles.successMessage}>
                    Profile updated successfully!
                  </div>
                )}

                <div className={styles.formRow}>
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

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={loading.profile}
                >
                  {loading.profile ? "Updating..." : "Update Profile"}
                </button>
              </form>
            </div>
          )}

          {/* Password Section */}
          {activeSection === "password" && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Change Password</h3>
                <p className={styles.sectionDescription}>
                  Update your account password for enhanced security
                </p>
              </div>
              <form onSubmit={handlePasswordSubmit} className={styles.form}>
                {errors.password && (
                  <div className={styles.errorMessage}>{errors.password}</div>
                )}
                {success.password && (
                  <div className={styles.successMessage}>
                    Password changed successfully!
                  </div>
                )}

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
                    className={styles.input}
                  />
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
                    className={styles.input}
                  />
                </div>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={loading.password}
                >
                  {loading.password ? "Changing..." : "Change Password"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default ProfilePage;
