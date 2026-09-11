import React from 'react';

export const StatCard = ({
  label,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'var(--color-primary)',
}) => {
  return (
    <div className="stat-card">
      <div className="stat-header">
        <span className="stat-label">{label}</span>
        {Icon && (
          <div className="stat-icon" style={{ color }}>
            <Icon size={22} />
          </div>
        )}
      </div>
      <div className="stat-value">{value}</div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
      {trend && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: trend.positive ? 'var(--color-success)' : 'var(--color-danger)' }}>
          {trend.positive ? '↑' : '↓'} {trend.text}
        </div>
      )}
    </div>
  );
};
