import "../globals/LayoutRow.css";

const LayoutRow = ({ title, subtitle, children }) => (
  <div className="header-row">
    <h2>{title}</h2>
    {subtitle && <div className="header-row-subtitle">{subtitle}</div>}
    {children}
  </div>
);

export default LayoutRow;
