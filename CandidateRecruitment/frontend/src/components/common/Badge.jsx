import React from 'react';

export const Badge = ({ variant = 'secondary', children, className = '' }) => {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {children}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  let variant = 'secondary';
  const s = String(status || '').toUpperCase();

  if (['ACTIVE', 'PUBLISHED', 'PASSED', 'ACCEPTED', 'COMPLETED', 'SUCCESS'].includes(s)) {
    variant = 'success';
  } else if (['IN_PROGRESS', 'WARNING', 'ASSIGNED', 'DRAFT'].includes(s)) {
    variant = 'warning';
  } else if (['INACTIVE', 'SUSPENDED', 'FAILED', 'WRONG_ANSWER', 'DISQUALIFIED', 'TIME_EXPIRED', 'EXPIRED', 'ERROR', 'CRITICAL'].includes(s)) {
    variant = 'danger';
  } else if (['SUBMITTED', 'AUTO_SUBMITTED'].includes(s)) {
    variant = 'primary';
  }

  return <Badge variant={variant}>{status}</Badge>;
};
