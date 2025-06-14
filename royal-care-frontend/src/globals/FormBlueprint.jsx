import PropTypes from "prop-types";
import React from "react";
import "./FormBlueprint.css";
import rcLogo from "./logo";
/**
 * Generic form blueprint for authentication and other forms.
 *
 * Props:
 * - logo: JSX for logo (optional)
 * - header: string or JSX for the form header/title
 * - children: form fields/components (required)
 * - onSubmit: form submit handler (required)
 * - button: JSX for the main action button (required)
 * - links: JSX for optional links (e.g., register/login links)
 * - containerClass: extra class for outer container (optional)
 * - formClass: extra class for form (optional)
 */
const FormBlueprint = ({
  logo,
  header,
  errorMessage,
  children,
  onSubmit,
  button,
  links,
  containerClass = "",
  formClass = "",
}) => {
  // Use global logo if not provided
  const logoNode =
    logo === undefined ? <img src={rcLogo} alt="Royal Care Logo" /> : logo;

  // Helper to wrap anchor tags in the correct class if needed
  function renderLinks(links) {
    if (!links) return null;
    // If it's a string, just wrap in the div
    if (typeof links === "string") {
      return <div className="form-blueprint-links">{links}</div>;
    }
    // If it's a fragment, wrap all anchors inside with the anchor class
    if (links.type === React.Fragment) {
      return (
        <div className="form-blueprint-links">
          {React.Children.map(links.props.children, (child) => {
            if (React.isValidElement(child) && child.type === "a") {
              return React.cloneElement(child, {
                className: [child.props.className, "form-blueprint-link-anchor"]
                  .filter(Boolean)
                  .join(" "),
              });
            }
            return child;
          })}
        </div>
      );
    }
    // If it's a single anchor, clone and add the class
    if (React.isValidElement(links) && links.type === "a") {
      return (
        <div className="form-blueprint-links">
          {React.cloneElement(links, {
            className: [links.props.className, "form-blueprint-link-anchor"]
              .filter(Boolean)
              .join(" "),
          })}
        </div>
      );
    }
    // If it's a div with anchors, add the class to all anchors inside
    if (React.isValidElement(links) && links.type === "div") {
      return React.cloneElement(links, {
        className: [links.props.className, "form-blueprint-links"]
          .filter(Boolean)
          .join(" "),
        children: React.Children.map(links.props.children, (child) => {
          if (React.isValidElement(child) && child.type === "a") {
            return React.cloneElement(child, {
              className: [child.props.className, "form-blueprint-link-anchor"]
                .filter(Boolean)
                .join(" "),
            });
          }
          return child;
        }),
      });
    }
    // Otherwise, just render as is
    return links;
  }

  return (
    <div className={`form-blueprint-container ${containerClass}`}>
      {logoNode && <div className="form-blueprint-logo">{logoNode}</div>}
      {header && (
        <h2 className="form-blueprint-header">
          {typeof header === "string" ? header : header}
        </h2>
      )}
      {errorMessage}
      <form
        className={`form-blueprint-form ${formClass}`}
        onSubmit={onSubmit}
        noValidate
      >
        {children}
        {button}
      </form>
      {renderLinks(links)}
    </div>
  );
};

FormBlueprint.propTypes = {
  logo: PropTypes.node,
  header: PropTypes.node,
  children: PropTypes.node.isRequired,
  onSubmit: PropTypes.func.isRequired,
  button: PropTypes.node.isRequired,
  links: PropTypes.node,
  containerClass: PropTypes.string,
  formClass: PropTypes.string,
};

export default FormBlueprint;
