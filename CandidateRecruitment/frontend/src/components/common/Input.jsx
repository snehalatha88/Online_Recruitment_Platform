import React from 'react';

export const Input = ({
  label,
  error,
  helperText,
  id,
  className = '',
  ...props
}) => {
  const inputId = id || props.name;

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`form-input ${error ? 'border-danger' : ''} ${className}`}
        {...props}
      />
      {error && <span className="form-error">{error}</span>}
      {helperText && !error && (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {helperText}
        </span>
      )}
    </div>
  );
};

export const TextArea = ({
  label,
  error,
  id,
  className = '',
  rows = 4,
  ...props
}) => {
  const inputId = id || props.name;

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        rows={rows}
        className={`form-textarea ${error ? 'border-danger' : ''} ${className}`}
        {...props}
      />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
};
