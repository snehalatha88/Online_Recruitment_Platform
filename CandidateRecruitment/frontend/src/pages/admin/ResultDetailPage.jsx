import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resultApi } from '../../api/takingApi';
import { StatusBadge, Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { Alert } from '../../components/common/Alert';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Code,
  ShieldAlert,
  Clock,
  User,
  FileText,
  Terminal,
  HelpCircle,
} from 'lucide-react';

export const ResultDetailPage = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('questions'); // 'questions', 'coding', 'violations'

  useEffect(() => {
    fetchDetail();
  }, [attemptId]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await resultApi.getAttemptDetail(attemptId);
      if (res.success) {
        setDetail(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load attempt details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Spinner text="Loading candidate evaluation breakdown..." />;
  }

  if (error || !detail) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Button variant="secondary" onClick={() => navigate('/admin/results')} icon={ArrowLeft}>
          Back to Results
        </Button>
        <Alert variant="danger">{error || 'Attempt detail not found.'}</Alert>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Bar with Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button variant="secondary" size="sm" onClick={() => navigate('/admin/results')} icon={ArrowLeft}>
          Back to Results
        </Button>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Attempt ID: #{detail.attemptId}
        </div>
      </div>

      {/* Candidate & Assessment Summary Card */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, var(--bg-card), var(--bg-elevated))',
          border: '1px solid var(--border-medium)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{detail.candidateFullName}</h2>
              <StatusBadge status={detail.isPassed ? 'PASSED' : 'FAILED'} />
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <span><strong>ID:</strong> {detail.candidateCode}</span>
              <span><strong>Email:</strong> {detail.candidateEmail}</span>
              <span><strong>Institute:</strong> {detail.department}</span>
              <span><strong>Role:</strong> {detail.designation || 'Candidate'}</span>
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Assessment: <strong style={{ color: 'var(--text-primary)' }}>{detail.examTitle}</strong> ({detail.durationMinutes} min)
            </div>
          </div>

          {/* Score Hero Panel */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2rem',
              padding: '1rem 1.5rem',
              background: 'var(--bg-app)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Total Score
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                {detail.totalScore ?? 0} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {detail.maxScore}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Percentage
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: detail.isPassed ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {detail.percentage ?? 0}%
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Violations
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: detail.violationCount > 0 ? 'var(--color-danger)' : 'var(--text-secondary)' }}>
                {detail.violationCount}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <span>Started: <strong>{new Date(detail.startTime).toLocaleString()}</strong></span>
          <span>Submitted: <strong>{detail.submissionTime ? new Date(detail.submissionTime).toLocaleString() : 'In-Progress'}</strong></span>
          <span>Reason: <strong style={{ color: 'var(--color-primary)' }}>{detail.submissionReason}</strong></span>
          <span>Correct Answers: <strong style={{ color: 'var(--color-success)' }}>{detail.correctAnswersCount}</strong> / {detail.totalQuestions}</span>
        </div>
      </div>

      {/* Tabs Header */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${activeTab === 'questions' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('questions')}
        >
          <HelpCircle size={16} /> Question Performance Review ({detail.questionReviews?.length || 0})
        </button>
        <button
          className={`btn ${activeTab === 'coding' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('coding')}
        >
          <Code size={16} /> Coding Submissions ({detail.codingSubmissions?.length || 0})
        </button>
        <button
          className={`btn ${activeTab === 'violations' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('violations')}
        >
          <ShieldAlert size={16} /> Proctoring Audit Timeline ({detail.violations?.length || 0})
        </button>
      </div>

      {/* TAB 1: Question Performance Review */}
      {activeTab === 'questions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {detail.questionReviews?.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              No question reviews available.
            </div>
          ) : (
            detail.questionReviews.map((qr) => (
              <div
                key={qr.questionId}
                className="card"
                style={{
                  borderLeft: `4px solid ${qr.isCorrect ? 'var(--color-success)' : qr.isAnswered ? 'var(--color-danger)' : 'var(--text-muted)'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                      Q{qr.order}. {qr.title}
                    </span>
                    <Badge variant="secondary">{qr.questionType}</Badge>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {qr.isCorrect ? (
                      <Badge variant="success"><CheckCircle2 size={12} /> Correct (+{qr.marksAwarded} / {qr.maxMarks})</Badge>
                    ) : qr.isAnswered ? (
                      <Badge variant="danger"><XCircle size={12} /> Incorrect ({qr.marksAwarded} / {qr.maxMarks})</Badge>
                    ) : (
                      <Badge variant="secondary">Unanswered (0 / {qr.maxMarks})</Badge>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '1rem', lineHeight: 1.6 }}>
                  {qr.questionText}
                </div>

                {/* Candidate Answer vs Official Key */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '0.85rem 1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Candidate Answer
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: qr.isCorrect ? 'var(--color-success)' : 'var(--color-danger)', marginTop: '0.2rem' }}>
                      {qr.candidateAnswerText || 'No answer selected'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Correct Answer Key
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-success)', marginTop: '0.2rem' }}>
                      {qr.correctAnswerText}
                    </div>
                  </div>
                </div>

                {qr.explanation && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    <strong>Recruiter Note / Explanation:</strong> {qr.explanation}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: Coding Submissions */}
      {activeTab === 'coding' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {detail.codingSubmissions?.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              No coding submissions for this attempt.
            </div>
          ) : (
            detail.codingSubmissions.map((cs) => (
              <div key={cs.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Coding Challenge Solution</h3>
                    <Badge variant="primary">{cs.language}</Badge>
                    <StatusBadge status={cs.executionStatus} />
                  </div>

                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    Score: {cs.scoreAwarded} pts ({cs.testCasesPassed} / {cs.totalTestCases} Test Cases Passed)
                  </div>
                </div>

                {/* Source Code Box */}
                <div style={{ background: 'var(--bg-code)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-medium)', overflowX: 'auto', marginBottom: '1rem' }}>
                  <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: '#e2e8f0' }}>
                    {cs.sourceCode}
                  </pre>
                </div>

                {/* Performance stats */}
                <div style={{ display: 'flex', gap: '2rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  <span>Execution Time: <strong>{cs.executionTimeMs} ms</strong></span>
                  <span>Memory: <strong>{cs.memoryUsedKb} KB</strong></span>
                  <span>Submitted: <strong>{new Date(cs.submittedAt).toLocaleTimeString()}</strong></span>
                </div>

                {cs.compilerOutput && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--color-danger-bg)', borderRadius: 'var(--radius-sm)', color: 'var(--color-danger)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                    {cs.compilerOutput}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: Proctoring Violations Timeline */}
      {activeTab === 'violations' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <ShieldAlert size={20} color="var(--color-danger)" />
              <span>Proctoring & Integrity Timeline</span>
            </div>
          </div>

          {detail.violations?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} color="var(--color-success)" style={{ margin: '0 auto 0.75rem' }} />
              <div>Clean Assessment Record: Zero Proctoring Violations Detected.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {detail.violations.map((v, idx) => (
                <div
                  key={v.id || idx}
                  style={{
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-elevated)',
                    borderLeft: `4px solid ${v.severity === 'CRITICAL' || v.severity === 'HIGH' ? 'var(--color-danger)' : 'var(--color-warning)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        #{idx + 1}. {v.violationType}
                      </span>
                      <Badge variant={v.severity === 'CRITICAL' ? 'danger' : 'warning'}>{v.severity}</Badge>
                      <Badge variant="secondary">Action: {v.actionTaken}</Badge>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {v.description || 'Violation detected via browser proctoring listener.'}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {new Date(v.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
