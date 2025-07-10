import styles from "./DataTable.module.css";

/**
 * columns: Array<{ key: string, label: string }>
 * data: Array<Object>
 * noDataText: string (optional)
 * isLoading: boolean (optional) - Shows loading state
 */
const DataTable = ({ columns, data, noDataText = "No data available.", isLoading = false }) => (
  <table className={styles["data-table"]}>
    <thead>
      <tr className={styles["thead-row"]}>
        {columns.map((col) => (
          <th key={col.key} scope="col">
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {isLoading ? (
        <tr>
          <td colSpan={columns.length} className={styles["loading"]}>
            <div className={styles["loading-spinner"]}></div>
          </td>
        </tr>
      ) : data && data.length > 0 ? (
        data.map((row, idx) => (
          <tr key={idx}>
            {columns.map((col) => (
              <td key={col.key}>
                {row[col.key] !== undefined ? row[col.key] : "-"}
              </td>
            ))}
          </tr>
        ))
      ) : (
        <tr>
          <td colSpan={columns.length} className={styles["no-data"]}>
            {noDataText}
          </td>
        </tr>
      )}
    </tbody>
  </table>
);

export default DataTable;
