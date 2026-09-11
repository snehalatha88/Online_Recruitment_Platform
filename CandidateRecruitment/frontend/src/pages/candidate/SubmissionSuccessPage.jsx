import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, ArrowRight, Home } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { releaseAllProctoringMedia } from '../../components/candidate/ProctoringCamera';

export const SubmissionSuccessPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    releaseAllProctoringMedia();
  }, []);

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '560px',
          width: '100%',
          textAlign: 'center',
          padding: '3rem 2.5rem',
          boxShadow: 'var(--shadow-lg)',
          borderRadius: 'var(--radius-xl)',
        }}
      >
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'var(--color-success-bg)',
            color: 'var(--color-success)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            border: '2px solid var(--color-success-border)',
          }}
        >
          <CheckCircle2 size={40} />
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Examination Submitted Successfully
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '2rem' }}>
          Thank you for completing your technical examination. Your answers and code submissions have been securely recorded and will be evaluated by the recruitment technical committee.
        </p>

        <div
          style={{
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
            marginBottom: '2rem',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '0.4rem' }}>
            <ShieldCheck size={18} />
            <span>Next Steps in the Recruitment Process</span>
          </div>
          <div>
            1. Technical assessment evaluation & code review.<br />
            2. Recruitment HR team communication regarding interview scheduling.<br />
            3. You may now close this window or return to your dashboard.
          </div>
        </div>

        <Button variant="primary" size="lg" onClick={() => navigate('/candidate/dashboard')} icon={Home}>
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};
