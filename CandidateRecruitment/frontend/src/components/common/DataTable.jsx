import React from 'react';
import { Spinner } from './Spinner';

export const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No records found.',
}) => {
  const safeData = Array.isArray(data) ? data : [];

  if (loading) {
    return (
      <div className="table-container">
        <Spinner text="Loading data..." />
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} style={{ textAlign: col.align || 'left', width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {safeData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            safeData.map((row, rowIdx) => (
              <tr key={row?.id || rowIdx}>
                {columns.map((col, colIdx) => (
                  <td key={colIdx} style={{ textAlign: col.align || 'left' }}>
                    {col.render ? col.render(row, rowIdx) : (row?.[col.accessor] ?? '-')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
