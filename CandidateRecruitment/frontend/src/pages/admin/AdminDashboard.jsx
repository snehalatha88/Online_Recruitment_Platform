import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resultApi } from '../../api/takingApi';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { Alert } from '../../components/common/Alert';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  FileText,
  CheckCircle2,
  Percent,
  ShieldAlert,
  ArrowRight,
  PlusCircle,
  Award,
  Clock,
} from 'lucide-react';

export const AdminDashboard = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await resultApi.getDashboardStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      const msg = err.message || 'Failed to load dashboard metrics';
      setError(msg);
      toast.error(msg, 'Dashboard Error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Spinner text="Loading corporate assessment statistics..." />;
  }

  const resultColumns = [
    {
      header: 'Candidate',
      accessor: 'candidateFullName',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.candidateFullName}</div>
          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
            {row.candidateCode} • {row.department}
          </div>
        </div>
      ),
    },
    {
      header: 'Examination',
      accessor: 'examTitle',
      render: (row) => <span style={{ fontWeight: 500 }}>{row.examTitle}</span>,
    },
    {
      header: 'Score',
      accessor: 'totalScore',
      render: (row) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
          {row.totalScore} / {row.maxScore} ({row.percentage}%)
        </span>
      ),
    },
    {
      header: 'Result',
      accessor: 'isPassed',
      render: (row) => {
        const passed = row.isPassed !== undefined ? row.isPassed : row.passed;
        return <StatusBadge status={passed ? 'PASSED' : 'FAILED'} />;
      },
    },
    {
      header: 'Violations',
      accessor: 'violationCount',
      render: (row) => (
        <span
          style={{
            fontWeight: 700,
            color: row.violationCount > 0 ? 'var(--color-danger)' : 'var(--text-secondary)',
          }}
        >
          {row.violationCount}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate(`/admin/results/${row.attemptId}`)}
          icon={ArrowRight}
        >
          Review
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Title & Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Recruitment Assessment Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', marginTop: '0.25rem' }}>
            Real-time monitoring of corporate technical candidates, evaluations, and test integrity.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={() => navigate('/admin/candidates')} icon={PlusCircle}>
            Add Candidate
          </Button>
          <Button variant="primary" onClick={() => navigate('/admin/exams')} icon={PlusCircle}>
            Create Exam
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <StatCard
          label="Total Candidates"
          value={stats?.totalCandidates ?? 0}
          subtitle={`${stats?.activeCandidates ?? 0} active registered`}
          icon={Users}
          color="var(--color-primary)"
        />
        <StatCard
          label="Published Exams"
          value={stats?.publishedExams ?? 0}
          subtitle={`${stats?.totalExams ?? 0} total assessments`}
          icon={FileText}
          color="var(--color-accent)"
        />
        <StatCard
          label="Completed Attempts"
          value={stats?.completedAttempts ?? 0}
          subtitle={`${stats?.inProgressAttempts ?? 0} currently taking`}
          icon={CheckCircle2}
          color="var(--color-success)"
        />
        <StatCard
          label="Pass Rate"
          value={`${stats?.passRate ?? 0}%`}
          subtitle={`Avg score: ${stats?.averageScore ?? 0}%`}
          icon={Percent}
          color="var(--color-warning)"
        />
        <StatCard
          label="Violations Flagged"
          value={stats?.totalViolations ?? 0}
          subtitle="Proctoring alerts detected"
          icon={ShieldAlert}
          color="var(--color-danger)"
        />
      </div>

      {/* Two Column Layout: Recent Results + Exam Performance Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Award size={20} color="var(--color-primary)" />
              <span>Recent Evaluations</span>
            </div>
            <Button size="sm" variant="secondary" onClick={() => navigate('/admin/results')}>
              View All
            </Button>
          </div>

          <DataTable
            columns={resultColumns}
            data={stats?.recentResults || []}
            emptyMessage="No examination attempts evaluated yet."
          />
        </div>

        {/* Assessment Performance List */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Clock size={20} color="var(--color-accent)" />
              <span>Exam Performance</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {stats?.examStats?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                No exam attempts data available.
              </div>
            ) : (
              stats?.examStats?.map((es) => (
                <div
                  key={es.examId}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.925rem' }}>{es.examTitle}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-primary)' }}>
                      {es.averagePercentage}% Avg
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{es.totalAttempts} Attempt(s)</span>
                    <span>{es.passedCount} Passed</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
