import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';

export const CandidateLayout = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-app)' }}>
      <Navbar />
      <main className="page-body">
        <Outlet />
      </main>
    </div>
  );
};
