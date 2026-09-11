import React from 'react';
import { Loader2 } from 'lucide-react';

export const Spinner = ({ size = 28, text = 'Loading...' }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', gap: '0.75rem', color: 'var(--text-secondary)' }}>
      <Loader2 className="animate-spin" size={size} style={{ color: 'var(--color-primary)' }} />
      {text && <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{text}</span>}
    </div>
  );
};
