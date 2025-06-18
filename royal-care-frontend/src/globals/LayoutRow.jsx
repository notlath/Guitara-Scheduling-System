import "../globals/LayoutRow.css";

const LayoutRow = ({ title, subtitle, children }) => (
  <div className="header-row">
    <div className="header-row-title">
      <h2>{title}</h2>
      {children}
    </div>
    {subtitle && <div className="header-row-subtitle">{subtitle}</div>}
  </div>
);

export default LayoutRow;
