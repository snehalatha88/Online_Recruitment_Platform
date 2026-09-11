import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, LogOut, User } from 'lucide-react';
import { Button } from './Button';
import { APP_NAME, APP_LOGO_URL } from '../../constants/branding';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <img
          src={APP_LOGO_URL}
          alt={APP_NAME}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm)',
            objectFit: 'cover',
            border: '1px solid var(--border-subtle)',
          }}
        />
        <span style={{ fontWeight: 800, letterSpacing: '-0.01em' }}>{APP_NAME}</span>
      </div>

      <div className="topbar-actions">
        <button
          onClick={toggleTheme}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            padding: '0.5rem',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.35rem 0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={16} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user?.fullName || user?.username}</span>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{user?.role === 'ROLE_ADMIN' ? 'Recruitment Admin' : 'Candidate'}</span>
          </div>
        </div>

        <Button variant="secondary" size="sm" onClick={logout} icon={LogOut}>
          Logout
        </Button>
      </div>
    </header>
  );
};
