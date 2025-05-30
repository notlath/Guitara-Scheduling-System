import {
  sanitizeObject,
  sanitizePhone,
  sanitizeString,
} from "../../utils/sanitization";

/**
 * SanitizedForm - A form wrapper component that sanitizes form inputs
 *
 * Usage:
 * <SanitizedForm onSubmit={handleSubmit}>
 *   {({ register, handleSubmit }) => (
 *     <form onSubmit={handleSubmit}>
 *       <input {...register('username')} />
 *       <input {...register('password', { sanitize: false })} />
 *       <button type="submit">Submit</button>
 *     </form>
 *   )}
 * </SanitizedForm>
 */
const SanitizedForm = ({ children, onSubmit, className = "" }) => {
  // Create a register function for inputs
  const register = (name, options = {}) => {
    const {
      sanitize = true,
      isPhone = false,
      onChange: customOnChange,
    } = options;

    return {
      name,
      onChange: (e) => {
        // Apply sanitization based on options
        if (sanitize) {
          const value = e.target.value;
          const sanitizedValue = isPhone
            ? sanitizePhone(value)
            : sanitizeString(value);

          // Create a new synthetic event with sanitized value
          const sanitizedEvent = {
            ...e,
            target: {
              ...e.target,
              value: sanitizedValue,
            },
          };

          // Call custom onChange handler if provided
          if (customOnChange) {
            customOnChange(sanitizedEvent);
          }

          return sanitizedEvent;
        }

        // If no sanitization needed, just pass through
        if (customOnChange) {
          return customOnChange(e);
        }

        return e;
      },
    };
  };

  // Create a handler to sanitize form data on submit
  const handleSubmit = (event) => {
    if (event && event.preventDefault) {
      event.preventDefault();
    }

    // Get form data
    const formData = new FormData(event.target);
    const formDataObj = Object.fromEntries(formData);

    // Sanitize form data
    const sanitizedData = sanitizeObject(formDataObj);

    // Pass sanitized data to user's onSubmit handler
    onSubmit(sanitizedData, event);
  };

  // Render children with register and handleSubmit props
  return (
    <div className={`sanitized-form-container ${className}`}>
      {typeof children === "function"
        ? children({ register, handleSubmit })
        : children}
    </div>
  );
};

export default SanitizedForm;
