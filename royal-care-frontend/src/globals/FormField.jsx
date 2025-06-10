import React from "react";
import "./FormField.css";

export function FormField({
  label,
  name,
  type = "text",
  value = "",
  onChange,
  required = true,
  inputProps = {},
  children, // for select or helper/error/status or custom input
  as = "input",
  status = null,
  ...rest
}) {
  return (
    <div className="global-form-field-group">
      {label && (
        <div className="global-form-field-label-row">
          <label className="global-form-field-label" htmlFor={name}>
            {label}
          </label>
          {status && (
            <span className="global-form-field-status-text">{status}</span>
          )}
        </div>
      )}
      <div className="global-form-field-relative-wrapper">
        {/* If children is a custom input (like phone), render it directly. Otherwise, render the default input/select/textarea. */}
        {children && as === "custom" ? (
          children
        ) : as === "select" ? (
          <select
            className="global-form-field-select"
            name={name}
            id={name}
            value={value}
            onChange={onChange}
            required={required}
            {...rest}
          >
            {children}
          </select>
        ) : as === "textarea" ? (
          <textarea
            className={inputProps.className || "global-form-field-textarea"}
            name={name}
            id={name}
            value={value}
            onChange={onChange}
            required={required}
            {...inputProps}
            {...rest}
          />
        ) : (
          <input
            className={inputProps.className || "global-form-field-input"}
            type={type}
            name={name}
            id={name}
            value={value}
            onChange={onChange}
            required={required}
            {...inputProps}
            {...rest}
          />
        )}
        {/* Render children inside the relative wrapper for icons, popups, etc. */}
        {children && as !== "custom" && as !== "select" && children}
      </div>
    </div>
  );
}
