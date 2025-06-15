/_ ============================================
MINIMAL LOADING INDICATOR USAGE GUIDE
============================================ _/

/\*\*

- PROBLEM: Traditional page loading states like `PageLoadingState` with large overlays
- are intrusive and inappropriate for frequent data fetching operations.
-
- SOLUTION: Use MinimalLoadingIndicator - a status-dot-like loading indicator
- that floats unobtrusively and doesn't interfere with user experience.
  \*/

// ============================================
// BASIC USAGE EXAMPLES
// ============================================

// 1. Calendar component - frequent availability fetching
import MinimalLoadingIndicator from "../common/MinimalLoadingIndicator";

const CalendarComponent = () => {
const { loading } = useSelector(state => state.scheduling);

return (
<div className="calendar-wrapper">
{/_ Your calendar content _/}

      {/* Minimal loading for frequent data fetching */}
      <MinimalLoadingIndicator
        show={loading}
        position="bottom-right"
        size="micro"
        variant="subtle"
        tooltip="Loading availability data..."
        pulse={true}
        fadeIn={true}
      />
    </div>

);
};

// 2. Dashboard component - background data refreshing
const DashboardComponent = () => {
const { loading } = useDashboardData();

return (
<div className="dashboard">
{/_ Your dashboard content _/}

      {/* Minimal loading for background updates */}
      <MinimalLoadingIndicator
        show={loading}
        position="top-right"
        size="small"
        variant="subtle"
        tooltip="Refreshing dashboard data..."
        pulse={true}
        fadeIn={true}
      />
    </div>

);
};

// 3. Data table - inline loading for row updates
const DataTableComponent = () => {
const [isUpdating, setIsUpdating] = useState(false);

return (
<div className="data-table-container">
{/_ Your table content _/}

      {/* Minimal loading for table updates */}
      <MinimalLoadingIndicator
        show={isUpdating}
        position="center-right"
        size="micro"
        variant="ghost"
        tooltip="Updating records..."
        pulse={true}
        fadeIn={true}
      />
    </div>

);
};

// ============================================
// CONFIGURATION OPTIONS
// ============================================

/\*\*

- size: Size of the indicator
- - "micro": 0.75rem (12px) - Ultra-subtle, like a status dot
- - "small": 1rem (16px) - Subtle but visible
- - "medium": 1.25rem (20px) - Standard size
- - "large": 1.5rem (24px) - More prominent
    \*/

/\*\*

- variant: Visual style
- - "subtle": Soft blue, barely noticeable (RECOMMENDED for frequent fetching)
- - "ghost": Almost invisible, ultra-minimal
- - "default": Standard blue
- - "primary": Theme primary color
- - "accent": Theme accent color
    \*/

/\*\*

- position: Where to float the indicator
- - "top-right": Top right corner
- - "top-left": Top left corner
- - "bottom-right": Bottom right corner (RECOMMENDED)
- - "bottom-left": Bottom left corner
- - "center-right": Vertically centered, right side
- - "center-left": Vertically centered, left side
    \*/

/\*\*

- pulse: Animation behavior
- - true: Gentle pulsing animation (RECOMMENDED)
- - false: Static dot
    \*/

/\*\*

- fadeIn: Entrance animation
- - true: Smooth fade in/out (RECOMMENDED)
- - false: Instant show/hide
    \*/

// ============================================
// WHEN TO USE vs WHEN NOT TO USE
// ============================================

/\*\*

- ✅ USE MinimalLoadingIndicator for:
- - Frequent API calls (every few seconds)
- - Background data refreshing
- - Real-time data updates
- - Availability checking
- - Search-as-you-type
- - Auto-save operations
- - Calendar time slot loading
- - Dashboard metric updates
    \*/

/\*\*

- ❌ DON'T USE MinimalLoadingIndicator for:
- - Initial page loads (use PageLoadingState)
- - Form submissions (use LoadingButton)
- - File uploads (use ProgressBar)
- - Critical operations requiring user attention
- - Long-running processes (>10 seconds)
    \*/

// ============================================
// REPLACING INTRUSIVE LOADING STATES
// ============================================

// ❌ OLD WAY - Intrusive and annoying for frequent operations
const OldComponent = () => {
const { loading } = useData();

return (
<div>
{loading && (
<PageLoadingState
title="Loading..."
className="dashboard-loading" // This blocks the entire UI
/>
)}
{/_ Content _/}
</div>
);
};

// ✅ NEW WAY - Minimal and non-intrusive
const NewComponent = () => {
const { loading } = useData();

return (
<div>
{/_ Content remains visible and interactive _/}

      <MinimalLoadingIndicator
        show={loading}
        position="bottom-right"
        size="micro"
        variant="subtle"
        tooltip="Loading data..."
        pulse={true}
        fadeIn={true}
      />
    </div>

);
};

// ============================================
// ACCESSIBILITY CONSIDERATIONS
// ============================================

/\*\*

- The MinimalLoadingIndicator includes:
- - ARIA labels for screen readers
- - Tooltips for hover context
- - Reduced motion support
- - High contrast mode support
- - Keyboard navigation friendly (non-interactive)
    \*/

// ============================================
// PERFORMANCE NOTES
// ============================================

/\*\*

- - Uses CSS transforms and opacity for smooth animations
- - Minimal DOM footprint (single div with pseudo-element)
- - Hardware accelerated animations
- - Respects user's motion preferences
- - Zero impact on layout (position: fixed)
    \*/
