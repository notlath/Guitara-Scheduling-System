import React, { useState, useEffect } from "react";
import "./FormField.css";

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
        {children && as === "custom" ? (
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
        {children && as !== "custom" && as !== "select" && children}
        {error && <div className="global-form-field-error">{error}</div>}
      </div>
    </div>
  );
}
