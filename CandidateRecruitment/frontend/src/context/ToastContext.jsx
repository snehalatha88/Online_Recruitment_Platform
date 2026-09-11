import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', title, message, duration = 5000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = { id, type, title, message, duration };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const toast = {
    error: (message, title = 'Error') => addToast({ type: 'error', title, message }),
    success: (message, title = 'Success') => addToast({ type: 'success', title, message }),
    warning: (message, title = 'Warning') => addToast({ type: 'warning', title, message }),
    info: (message, title = 'Information') => addToast({ type: 'info', title, message }),
    remove: removeToast,
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast, toast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastContainer = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-container"
      style={{
        position: 'fixed',
        top: '1.5rem',
        right: '1.5rem',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        maxWidth: '440px',
        width: 'calc(100vw - 3rem)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((item) => (
        <ToastItem key={item.id} item={item} onRemove={() => onRemove(item.id)} />
      ))}
    </div>
  );
};

const ToastItem = ({ item, onRemove }) => {
  const getIcon = () => {
    switch (item.type) {
      case 'error':
      case 'danger':
        return <AlertCircle size={22} color="var(--color-danger)" />;
      case 'success':
        return <CheckCircle2 size={22} color="var(--color-success)" />;
      case 'warning':
        return <AlertTriangle size={22} color="var(--color-warning)" />;
      default:
        return <Info size={22} color="var(--color-primary)" />;
    }
  };

  const getBorderColor = () => {
    switch (item.type) {
      case 'error':
      case 'danger':
        return 'var(--color-danger-border)';
      case 'success':
        return 'var(--color-success-border)';
      case 'warning':
        return 'var(--color-warning-border)';
      default:
        return 'var(--color-primary-border)';
    }
  };

  const getTitleColor = () => {
    switch (item.type) {
      case 'error':
      case 'danger':
        return 'var(--color-danger)';
      case 'success':
        return 'var(--color-success)';
      case 'warning':
        return 'var(--color-warning)';
      default:
        return 'var(--color-primary)';
    }
  };

  const getBgGlow = () => {
    switch (item.type) {
      case 'error':
      case 'danger':
        return 'rgba(239, 68, 68, 0.08)';
      case 'success':
        return 'rgba(16, 185, 129, 0.08)';
      case 'warning':
        return 'rgba(245, 158, 11, 0.08)';
      default:
        return 'rgba(59, 130, 246, 0.08)';
    }
  };

  return (
    <div
      className="toast-item"
      style={{
        pointerEvents: 'auto',
        background: `linear-gradient(135deg, ${getBgGlow()}, var(--bg-card))`,
        backdropFilter: 'blur(16px)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.25rem',
        boxShadow: 'var(--shadow-lg), 0 10px 30px rgba(0, 0, 0, 0.35)',
        border: `1px solid ${getBorderColor()}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.85rem',
        position: 'relative',
        overflow: 'hidden',
        animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ flexShrink: 0, marginTop: '2px' }}>{getIcon()}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {item.title && (
          <div
            style={{
              fontWeight: 700,
              fontSize: '0.925rem',
              color: getTitleColor(),
              marginBottom: '0.2rem',
              letterSpacing: '-0.01em',
            }}
          >
            {item.title}
          </div>
        )}
        <div
          style={{
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            wordBreak: 'break-word',
          }}
        >
          {item.message}
        </div>
      </div>
      <button
        onClick={onRemove}
        aria-label="Close notification"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        <X size={16} />
      </button>
    </div>
  );
};
