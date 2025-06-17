import { memo } from "react";

const PageLayout = memo(({ children }) => (
  <div className="global-container">
    <div className="global-content">{children}</div>
  </div>
));

PageLayout.displayName = "PageLayout";

export default PageLayout;
