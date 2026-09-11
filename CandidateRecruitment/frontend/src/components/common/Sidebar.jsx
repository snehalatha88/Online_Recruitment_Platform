import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  HelpCircle,
  UserCheck,
  Award,
  ShieldAlert,
  ClipboardList,
  Activity,
} from 'lucide-react';
import { APP_NAME, APP_LOGO_URL } from '../../constants/branding';

export const Sidebar = () => {
  const navItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/candidates', icon: Users, label: 'Candidates' },
    { to: '/admin/exams', icon: FileText, label: 'Examinations' },
    { to: '/admin/questions', icon: HelpCircle, label: 'Question Bank' },
    { to: '/admin/assignments', icon: UserCheck, label: 'Assignments' },
    { to: '/admin/results', icon: Award, label: 'Results & Proctoring' },
    { to: '/admin/audit-logs', icon: Activity, label: 'Audit Compliance' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img
          src={APP_LOGO_URL}
          alt={APP_NAME}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            objectFit: 'cover',
            border: '1px solid var(--border-medium)',
            boxShadow: 'var(--shadow-sm)',
            flexShrink: 0,
          }}
        />
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {APP_NAME}
          </div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Recruitment Assessment</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {APP_NAME} Enterprise v1.0
        </div>
      </div>
    </aside>
  );
};
