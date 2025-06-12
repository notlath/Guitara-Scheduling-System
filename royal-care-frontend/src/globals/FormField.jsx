import React, { useState, useEffect } from "react";
import "./FormField.css";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";

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
      tabIndex={-1}
      {...props}
    >
      {visible ? <MdVisibilityOff size={22} /> : <MdVisibility size={22} />}
    </button>
  );
}

export function FormField({
  label,
  name,
  type = "text",
  value = "",
  onChange,
  required = false,
  inputProps = {},
  children, // for select or helper/error/status or custom input
  as = "input",
  validate = null, // optional validation function for custom logic
  onErrorChange, // optional callback to inform parent of error state
  ...rest
}) {
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Run validation whenever value or touched changes
  useEffect(() => {
    let err = "";
    if (touched) {
      if (validate) {
        err = validate(value);
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
  }, [value, touched]);

  // Show asterisk for required fields
  const labelContent = (
    <>
      {label}
      {required && (
        <span className="global-form-field-required-asterisk">*</span>
      )}
    </>
  );

  // Compose input className with error border if invalid
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

  // Blur handler to trigger validation
  const handleBlur = (e) => {
    setTouched(true);
    if (inputProps.onBlur) inputProps.onBlur(e);
  };

  return (
    <div className="global-form-field-group">
      {label && (
        <div className="global-form-field-label-row">
          <label className="global-form-field-label" htmlFor={name}>
            {labelContent}
          </label>
        </div>
      )}
      <div className="global-form-field-relative-wrapper">
        {as === "input" && type === "password" ? (
          <div style={{ position: "relative", width: "100%" }}>
            <input
              className={inputClassName}
              type={showPassword ? "text" : "password"}
              name={name}
              id={name}
              value={value}
              onChange={onChange}
              required={required}
              onBlur={handleBlur}
              {...inputProps}
              {...rest}
            />
            <PasswordVisibilityToggle
              visible={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
              className="inputIconBtn"
            />
          </div>
        ) : children && as === "custom" ? (
          children
        ) : as === "select" ? (
          <select
            className={inputClassName}
            name={name}
            id={name}
            value={value}
            onChange={onChange}
            required={required}
            onBlur={handleBlur}
            {...rest}
          >
            {children}
          </select>
        ) : as === "textarea" ? (
          <textarea
            className={inputClassName}
            name={name}
            id={name}
            value={value}
            onChange={onChange}
            required={required}
            onBlur={handleBlur}
            {...inputProps}
            {...rest}
          />
        ) : (
          <input
            className={inputClassName}
            type={type}
            name={name}
            id={name}
            value={value}
            onChange={onChange}
            required={required}
            onBlur={handleBlur}
            {...inputProps}
            {...rest}
          />
        )}
        {/* Render children inside the relative wrapper for icons, popups, etc. */}
        {children &&
          as !== "custom" &&
          as !== "select" &&
          as !== "input" &&
          children}
        {error && <div className="global-form-field-error">{error}</div>}
      </div>
    </div>
  );
}
