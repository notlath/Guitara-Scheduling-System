import { memo } from "react";
// import "./PageLayout.css";

const PageLayout = memo(({ children }) => (
  <div className="global-container">
    <div className="global-content">{children}</div>
  </div>
));

PageLayout.displayName = "PageLayout";

export default PageLayout;
