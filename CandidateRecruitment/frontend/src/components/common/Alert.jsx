import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export const Alert = ({
  variant = 'info',
  title,
  children,
  onClose,
  className = '',
}) => {
  const getIcon = () => {
    switch (variant) {
      case 'success': return <CheckCircle2 size={20} color="var(--color-success)" />;
      case 'warning': return <AlertTriangle size={20} color="var(--color-warning)" />;
      case 'danger': return <AlertCircle size={20} color="var(--color-danger)" />;
      default: return <Info size={20} color="var(--color-primary)" />;
    }
  };

  const getStyle = () => {
    switch (variant) {
      case 'success': return { background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', color: 'var(--text-primary)' };
      case 'warning': return { background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', color: 'var(--text-primary)' };
      case 'danger': return { background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', color: 'var(--text-primary)' };
      default: return { background: 'var(--color-primary-light)', border: '1px solid var(--color-primary-border)', color: 'var(--text-primary)' };
    }
  };

  return (
    <div
      className={className}
      style={{
        ...getStyle(),
        padding: '1rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.85rem',
        marginBottom: '1rem',
        position: 'relative',
      }}
    >
      <div style={{ flexShrink: 0, marginTop: '2px' }}>{getIcon()}</div>
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{title}</div>}
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
