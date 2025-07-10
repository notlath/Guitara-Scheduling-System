import { useEffect, useState } from "react";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import "./FormField.css";

// Button for toggling password visibility (eye icon)
export function PasswordVisibilityToggle({
  visible,
  onToggle,
  className = "",
  ...props
}) {
  return (
    <button
      type="button"
      aria-label={visible ? "Hide password" : "Show password"}
      onClick={onToggle}
      className={className}
      {...props}
    >
      {visible ? <MdVisibilityOff size={22} /> : <MdVisibility size={22} />}
    </button>
  );
}

// Generic, reusable form field component
export function FormField({
  label, // Label for the field
  name, // Field name (for form state)
  type = "text", // Input type (text, password, etc)
  value = "", // Current value
  onChange, // Change handler
  required = false, // Is field required?
  inputProps = {}, // Extra props for the input
  children, // For custom content (e.g. select, helper text, icons)
  as = "input", // What kind of field: input, select, textarea, or custom
  validate = null, // Optional validation function
  onErrorChange, // Callback to inform parent of error state
  showError, // Extract showError to prevent it from being passed to DOM
  ...rest
}) {
  // Remove showError from rest props to prevent it from being passed to DOM elements
  const { showError: _extractedShowError, ...filteredRest } = rest;
  // Track if user has interacted with the field
  const [touched, setTouched] = useState(false);
  // Store error message for this field
  const [error, setError] = useState("");
  // For password fields: show/hide password
  const [showPassword, setShowPassword] = useState(false);

  // Run validation when value, touched, or showError changes
  useEffect(() => {
    let err = "";
    // Show errors when explicitly requested via showError prop OR when field was touched (blurred)
    if (showError || touched) {
      if (validate) {
        // Check if validation function expects two parameters (new style) or one (legacy)
        if (validate.length > 1) {
          err = validate(value, touched); // Pass both value and touched state to validator
        } else {
          err = validate(value); // Use legacy validator with just value
        }
      } else if (
        required &&
        (typeof value === "string" ? value.trim() === "" : !value)
      ) {
        err = "This field is required";
      }
    }
    setError(err);
    if (onErrorChange) onErrorChange(name, err);
    // eslint-disable-next-line
  }, [value, touched, showError]);

  // Render label with asterisk if required
  const labelContent = (
    <>
      {label}
      {required && (
        <span className="global-form-field-required-asterisk">*</span>
      )}
    </>
  );

  // Compose input className, add error border if invalid
  const inputClassName = [
    inputProps.className ||
      (as === "select"
        ? "global-form-field-select"
        : as === "textarea"
        ? "global-form-field-textarea"
        : "global-form-field-input"),
    error ? "global-form-field-error-border" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // When input loses focus, mark as touched (for validation)
  const handleBlur = (e) => {
    // Call the custom onBlur first if provided (important for parent state updates)
    if (inputProps.onBlur) inputProps.onBlur(e);
    // Then set our internal touched state
    setTouched(true);
  };

  // Create combined inputProps that properly handles onBlur
  const combinedInputProps = {
    ...inputProps,
    onBlur: handleBlur, // This ensures our handleBlur always runs and calls custom onBlur if provided
  };

  // Main render logic
  return (
    <div className="global-form-field-group">
      {/* Render label if provided */}
      {label && (
        <div className="global-form-field-label-row">
          <label className="global-form-field-label" htmlFor={name}>
            {labelContent}
          </label>
        </div>
      )}
      <div className="global-form-field-relative-wrapper">
        {/* Password field: show input and eye icon */}
        {as === "input" && type === "password" ? (
          <div
            className="passwordFieldWrapper"
            style={{ position: "relative", width: "100%" }}
          >
            <input
              className={inputClassName}
              type={showPassword ? "text" : "password"}
              name={name}
              id={name}
              value={value}
              onChange={onChange}
              required={required}
              {...combinedInputProps}
              {...filteredRest}
            />
            {/* Eye icon for toggling password visibility */}
            <PasswordVisibilityToggle
              visible={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
              className="inputIconBtn"
            />
          </div>
        ) : children && as === "custom" ? (
          // Custom field (e.g. phone input with prefix)
          children
        ) : as === "select" ? (
          // Select dropdown
          <select
            className={inputClassName}
            name={name}
            id={name}
            value={value}
            onChange={onChange}
            required={required}
            {...combinedInputProps}
            {...filteredRest}
          >
            {children}
          </select>
        ) : as === "textarea" ? (
          // Textarea field
          <textarea
            className={inputClassName}
            name={name}
            id={name}
            value={value}
            onChange={onChange}
            required={required}
            {...combinedInputProps}
            {...filteredRest}
          />
        ) : (
          // Default input (text, email, etc)
          <input
            className={inputClassName}
            type={type}
            name={name}
            id={name}
            value={value}
            onChange={onChange}
            required={required}
            {...combinedInputProps}
            {...filteredRest}
          />
        )}
        {/* Render children for extra content (e.g. helper text, icons) */}
        {children &&
          as !== "custom" &&
          as !== "select" &&
          as !== "input" &&
          children}
        {/* Show error message if present */}
        {error && <div className="global-form-field-error">{error}</div>}
      </div>
    </div>
  );
}

// Default export for backward compatibility
export default FormField;
