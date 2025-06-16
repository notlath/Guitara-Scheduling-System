import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "./SalesChart.module.css";

const SalesChart = ({
  data,
  currentView,
  currentPeriod,
  currentTotal,
  previousTotal,
  comparison,
}) => {
  // Custom tooltip formatter
  const formatTooltip = (value, name) => {
    if (name === "revenue" || name === "commission") {
      return [
        `₱${parseFloat(value).toFixed(2)}`,
        name === "revenue" ? "Revenue" : "Commission",
      ];
    }
    return [value, name];
  };

  // Custom label formatter for X-axis
  const formatXAxisLabel = (tickItem) => {
    if (currentPeriod === "Daily") {
      return new Date(tickItem).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } else if (currentPeriod === "Weekly") {
      return tickItem; // Already formatted as "Week 1", "Week 2", etc.
    } else {
      return tickItem; // Monthly data
    }
  };

  // Determine chart type based on current view
  const isBarChart =
    currentView === "Services" || currentView === "Customer List";
  const dataKey =
    currentView === "Total Revenue"
      ? "revenue"
      : currentView === "Commission"
      ? "commission"
      : currentView === "Services"
      ? "appointmentCount"
      : "appointmentCount";

  // Color scheme based on view
  const getColor = () => {
    switch (currentView) {
      case "Total Revenue":
        return "var(--success)"; // Use theme success color
      case "Commission":
        return "var(--primary)"; // Use theme primary color
      case "Services":
        return "var(--accent)"; // Use theme accent color
      case "Customer List":
        return "var(--secondary)"; // Use theme secondary color
      default:
        return "var(--background-500)"; // Gray from theme
    }
  };

  // Comparison indicator
  const getComparisonColor = () => {
    switch (comparison) {
      case "higher":
        return "var(--success)"; // Green from theme
      case "lower":
        return "var(--error)"; // Red from theme
      case "same":
        return "var(--background-500)"; // Gray from theme
      default:
        return "var(--background-500)";
    }
  };

  const getComparisonText = () => {
    if (comparison === "no-data" || !previousTotal) return "No previous data";
    const change = currentTotal - previousTotal;
    const percentage =
      previousTotal > 0 ? ((change / previousTotal) * 100).toFixed(1) : 0;
    const direction = change > 0 ? "↗" : change < 0 ? "↘" : "→";
    return `${direction} ${Math.abs(
      percentage
    )}% vs previous ${currentPeriod.toLowerCase()}`;
  };

  return (
    <div className={styles.chartContainer}>
      {/* Chart Header */}
      <div className={styles.chartHeader}>
        <div>
          <h3 className={styles.chartTitle}>
            {currentView} Trend - {currentPeriod}
          </h3>
          <p className={styles.chartSubtitle}>
            {currentView === "Total Revenue" || currentView === "Commission"
              ? `₱${currentTotal.toFixed(2)}`
              : `${data.length} ${
                  currentView === "Services" ? "services" : "customers"
                }`}
          </p>
        </div>
        <div className={styles.comparisonBadge}>
          <span
            className={styles.comparisonIndicator}
            style={{ color: getComparisonColor() }}
          >
            {getComparisonText()}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={300}>
          {isBarChart ? (
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey={
                  currentView === "Services" ? "serviceName" : "clientName"
                }
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={formatTooltip}
                contentStyle={{
                  backgroundColor: "var(--background)",
                  border: "1px solid var(--background-200)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey={dataKey} fill={getColor()} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 12 }}
                tickFormatter={formatXAxisLabel}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={formatTooltip}
                labelFormatter={(label) => `Period: ${label}`}
                contentStyle={{
                  backgroundColor: "var(--background)",
                  border: "1px solid var(--background-200)",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={getColor()}
                strokeWidth={3}
                dot={{ fill: getColor(), strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, stroke: getColor(), strokeWidth: 2 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Chart Legend */}
      <div className={styles.chartLegend}>
        <div className={styles.legendItem}>
          <div
            className={styles.legendColor}
            style={{ backgroundColor: getColor() }}
          ></div>
          <span>
            {currentView === "Total Revenue"
              ? "Revenue (₱)"
              : currentView === "Commission"
              ? "Commission (₱)"
              : "Count"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SalesChart;
