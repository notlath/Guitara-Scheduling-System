import { sanitizeString } from "../../utils/sanitization";

/**
 * SanitizedInput component that automatically sanitizes input values
 *
 * Usage:
 * <SanitizedInput
 *   name="username"
 *   type="text"
 *   value={formData.username}
 *   onChange={handleChange}
 *   label="Username"
 *   required
 * />
 */
const SanitizedInput = ({
  name,
  type = "text",
  value,
  onChange,
  label,
  className = "",
  required = false,
  placeholder = "",
  error = "",
  onBlur = null,
  autoComplete = "off",
  disabled = false,
  min,
  max,
  pattern,
  ...rest
}) => {
  // Handle changes with sanitization
  const handleSanitizedChange = (e) => {
    const rawValue = e.target.value;

    // Avoid sanitizing certain input types
    const skipSanitization = [
      "number",
      "date",
      "time",
      "file",
      "checkbox",
      "radio",
    ].includes(type);

    if (skipSanitization) {
      onChange(e);
      return;
    }

    // Create a new synthetic event with sanitized value
    const sanitizedEvent = {
      ...e,
      target: {
        ...e.target,
        value: sanitizeString(rawValue),
      },
    };

    onChange(sanitizedEvent);
  };

  // Validation on blur
  const handleBlur = (e) => {
    if (onBlur) {
      onBlur(e);
    }
  };

  return (
    <div className={`sanitized-input-container ${className}`}>
      {label && (
        <label htmlFor={name} className="form-label">
          {label} {required && <span className="required-mark">*</span>}
        </label>
      )}

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={handleSanitizedChange}
        onBlur={handleBlur}
        className={`form-input ${error ? "error" : ""}`}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        disabled={disabled}
        min={min}
        max={max}
        pattern={pattern}
        {...rest}
      />

      {error && <div className="error-text">{error}</div>}
    </div>
  );
};

/**
 * SanitizedTextarea component that automatically sanitizes textarea values
 */
const SanitizedTextarea = ({
  name,
  value,
  onChange,
  label,
  className = "",
  required = false,
  placeholder = "",
  error = "",
  rows = 3,
  ...rest
}) => {
  const handleSanitizedChange = (e) => {
    const sanitizedEvent = {
      ...e,
      target: {
        ...e.target,
        value: sanitizeString(e.target.value),
      },
    };

    onChange(sanitizedEvent);
  };

  return (
    <div className={`sanitized-textarea-container ${className}`}>
      {label && (
        <label htmlFor={name} className="form-label">
          {label} {required && <span className="required-mark">*</span>}
        </label>
      )}

      <textarea
        id={name}
        name={name}
        value={value}
        onChange={handleSanitizedChange}
        className={`form-input ${error ? "error" : ""}`}
        placeholder={placeholder}
        required={required}
        rows={rows}
        {...rest}
      />

      {error && <div className="error-text">{error}</div>}
    </div>
  );
};

/**
 * SanitizedSelect component for dropdown selects
 */
const SanitizedSelect = ({
  name,
  value,
  onChange,
  options = [],
  label,
  className = "",
  required = false,
  error = "",
  multiple = false,
  ...rest
}) => {
  return (
    <div className={`sanitized-select-container ${className}`}>
      {label && (
        <label htmlFor={name} className="form-label">
          {label} {required && <span className="required-mark">*</span>}
        </label>
      )}

      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className={`form-input ${error ? "error" : ""}`}
        required={required}
        multiple={multiple}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && <div className="error-text">{error}</div>}
    </div>
  );
};

export { SanitizedInput, SanitizedSelect, SanitizedTextarea };
