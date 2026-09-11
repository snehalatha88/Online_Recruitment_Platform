import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  icon: Icon,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`btn btn-${variant} ${size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={18} />
      ) : (
        Icon && <Icon size={18} />
      )}
      {children}
    </button>
  );
};
