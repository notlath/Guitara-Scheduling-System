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
  children, // for select or helper/error/status
  as = "input",
  status = null, // new prop for status text (e.g., checking availability)
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
      {as === "select" ? (
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
          className="global-form-field-input"
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
      {/* Render children below the input/select/textarea for helper/status/error messages */}
      {as !== "select" && children}
    </div>
  );
}
