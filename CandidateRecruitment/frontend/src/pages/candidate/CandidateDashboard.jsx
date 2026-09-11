import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { takingApi } from '../../api/takingApi';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Spinner } from '../../components/common/Spinner';
import { Alert } from '../../components/common/Alert';
import {
  FileText,
  Clock,
  Shield,
  AlertTriangle,
  Play,
  CheckCircle,
  HelpCircle,
  Layers,
  Award,
  Camera,
  RefreshCw,
  Mic,
} from 'lucide-react';
import { APP_NAME, APP_LOGO_URL } from '../../constants/branding';
import { releaseAllProctoringMedia } from '../../components/candidate/ProctoringCamera';
import { SystemPreCheckModal } from '../../components/candidate/SystemPreCheckModal';
import { useToast } from '../../context/ToastContext';

export const CandidateDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pre-Check and readiness modal
  const [selectedExam, setSelectedExam] = useState(null);
  const [isPreCheckOpen, setIsPreCheckOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    releaseAllProctoringMedia();
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await takingApi.getAssignedExams();
      if (res.success) {
        setExams(res.data || []);
      }
    } catch (err) {
      const msg = err.message || 'Failed to fetch assigned examinations';
      setError(msg);
      toast.error(msg, 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async () => {
    if (!selectedExam) return;
    setStarting(true);
    setError('');

    try {
      const res = await takingApi.startExam(selectedExam.examId);
      if (res.success) {
        const attempt = res.data;
        setIsPreCheckOpen(false);
        navigate(`/candidate/exam/${attempt.attemptId}`);
      }
    } catch (err) {
      const msg = err.message || 'Failed to start assessment';
      setError(msg);
      toast.error(msg, 'Start Failed');
      setStarting(false);
    }
  };


  if (loading) {
    return <Spinner text="Loading your recruitment assessments..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Welcome Banner */}
      <div
        style={{
          padding: '2rem',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, #1e3a8a, #0f172a)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          color: '#ffffff',
          boxShadow: 'var(--shadow-glow)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Award size={22} color="#60a5fa" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#93c5fd' }}>
              {APP_NAME} Technical Assessment
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
            Welcome, {user?.fullName || user?.username}
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: '0.95rem', maxWidth: '700px', marginTop: '0.5rem' }}>
            Candidate ID: <strong style={{ color: '#ffffff' }}>{user?.candidateId || 'CAND-ONLINE'}</strong>. Please review your assigned evaluations below. Ensure an uninterrupted environment before beginning any examination.
          </p>
        </div>

        <img
          src={APP_LOGO_URL}
          alt={APP_NAME}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-lg)',
            objectFit: 'cover',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
          }}
        />
      </div>

      {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}

      <div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1.25rem' }}>
          Assigned Technical Examinations
        </h2>

        {exams.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
            <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              No Pending Examinations
            </h3>
            <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
              You do not have any active recruitment examinations assigned at this moment.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {exams.map((ex) => (
              <div
                key={ex.assignmentId}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{ex.title}</h3>
                    <StatusBadge status={ex.assignmentStatus} />
                  </div>

                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                    {ex.description || 'Corporate recruitment technical examination.'}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '0.85rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: '0.825rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                      <Clock size={16} color="var(--color-primary)" />
                      <span>Duration: <strong>{ex.durationMinutes} min</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                      <Layers size={16} color="var(--color-accent)" />
                      <span>Questions: <strong>{ex.questionCount}</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                      <Shield size={16} color="var(--color-warning)" />
                      <span>Proctoring: <strong>{ex.proctoringEnabled ? 'Active' : 'Off'}</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                      <HelpCircle size={16} color="var(--color-success)" />
                      <span>Pass Score: <strong>{ex.passingPercentage}%</strong></span>
                    </div>
                  </div>
                </div>

                {/* Card Action */}
                <div>
                  {ex.assignmentStatus === 'COMPLETED' ? (
                    <Button
                      variant="secondary"
                      style={{ width: '100%', color: 'var(--color-success)', cursor: 'default' }}
                      disabled
                      icon={CheckCircle}
                    >
                      Assessment Completed
                    </Button>
                  ) : ex.canStart ? (
                    <Button
                      variant="primary"
                      style={{ width: '100%' }}
                      onClick={() => {
                        setSelectedExam(ex);
                        setIsPreCheckOpen(true);
                      }}
                      icon={Play}
                    >
                      Start Assessment
                    </Button>
                  ) : (
                    <Button variant="secondary" style={{ width: '100%' }} disabled>
                      Attempt Limit Reached
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive System Proctoring Pre-Check Modal */}
      <SystemPreCheckModal
        isOpen={isPreCheckOpen}
        onClose={() => setIsPreCheckOpen(false)}
        exam={selectedExam}
        onProceedToExam={handleStartExam}
        isStarting={starting}
      />
    </div>
  );
};

