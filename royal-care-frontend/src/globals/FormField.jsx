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
  children, // for select
  as = "input",
  ...rest
}) {
  return (
    <div className="global-form-field-group">
      {label && (
        <label className="global-form-field-label" htmlFor={name}>
          {label}
        </label>
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
    </div>
  );
}
