import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resultApi } from '../../api/takingApi';
import { examApi } from '../../api/examApi';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Alert } from '../../components/common/Alert';
import { useToast } from '../../context/ToastContext';
import {
  Award,
  Search,
  ArrowRight,
  ShieldAlert,
  Download,
  Filter,
  RefreshCw,
} from 'lucide-react';

export const ResultsPage = () => {
  const { toast } = useToast();
  const [results, setResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedPassed, setSelectedPassed] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    fetchResults(selectedExamId, selectedPassed, searchQuery);
  }, [selectedExamId, selectedPassed]);

  const fetchResults = async (overrideExamId, overridePassed, overrideQuery) => {
    try {
      setLoading(true);
      const examIdToUse = overrideExamId !== undefined ? overrideExamId : selectedExamId;
      const passedToUse = overridePassed !== undefined ? overridePassed : selectedPassed;
      const queryToUse = overrideQuery !== undefined ? overrideQuery : searchQuery;

      const res = await resultApi.getResults({
        query: queryToUse || undefined,
        examId: examIdToUse || undefined,
        isPassed: passedToUse !== '' ? passedToUse === 'true' : undefined,
      });
      if (res && res.success) {
        const list = Array.isArray(res.data)
          ? res.data
          : (res.data?.content && Array.isArray(res.data.content) ? res.data.content : []);
        setResults(list);
      } else {
        setResults([]);
      }
    } catch (err) {
      const msg = err.message || 'Failed to fetch assessment results';
      setError(msg);
      toast.error(msg, 'Error');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const loadExams = async () => {
    try {
      const res = await examApi.getExams({ size: 100 });
      if (res && res.success) {
        const list = Array.isArray(res.data)
          ? res.data
          : (res.data?.content && Array.isArray(res.data.content) ? res.data.content : []);
        setExams(list);
      }
    } catch (ignored) {}
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchResults();
  };

  const columns = [
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
      header: 'Score Breakdown',
      accessor: 'totalScore',
      render: (row) => (
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            {row.totalScore} / {row.maxScore} ({row.percentage}%)
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            MCQ: {row.mcqScore} • Coding: {row.codingScore}
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'isPassed',
      render: (row) => {
        const passed = row.isPassed !== undefined ? row.isPassed : row.passed;
        return <StatusBadge status={passed ? 'PASSED' : 'FAILED'} />;
      },
    },
    {
      header: 'Submission',
      accessor: 'submissionReason',
      render: (row) => (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {row.submissionReason}
        </span>
      ),
    },
    {
      header: 'Violations',
      accessor: 'violationCount',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {row.violationCount > 0 ? (
            <span style={{ color: 'var(--color-danger)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <ShieldAlert size={14} /> {row.violationCount}
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>0</span>
          )}
        </div>
      ),
    },
    {
      header: 'Evaluated',
      accessor: 'evaluatedAt',
      render: (row) => {
        let dateStr = '-';
        if (row?.evaluatedAt) {
          try {
            const d = new Date(row.evaluatedAt);
            if (!isNaN(d.getTime())) {
              dateStr = d.toLocaleString();
            }
          } catch (e) {}
        }
        return <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{dateStr}</span>;
      },
    },
    {
      header: 'Action',
      align: 'right',
      render: (row) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => row?.attemptId && navigate(`/admin/results/${row.attemptId}`)}
          icon={ArrowRight}
        >
          Review
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Recruitment Examination Results</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Secure, admin-exclusive evaluation repository with question-by-question breakdowns, coding diffs, and proctoring audit trails.
        </p>
      </div>

      {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <Input
              placeholder="Search candidate name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ width: '220px' }}>
            <select
              className="form-select"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              style={{ marginBottom: 0 }}
            >
              <option value="">All Examinations</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.title}</option>
              ))}
            </select>
          </div>

          <div style={{ width: '160px' }}>
            <select
              className="form-select"
              value={selectedPassed}
              onChange={(e) => setSelectedPassed(e.target.value)}
              style={{ marginBottom: 0 }}
            >
              <option value="">All Outcomes</option>
              <option value="true">Passed Only</option>
              <option value="false">Failed Only</option>
            </select>
          </div>

          <Button type="submit" variant="primary" icon={Search}>
            Search
          </Button>

          {(searchQuery || selectedExamId || selectedPassed) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSearchQuery('');
                setSelectedExamId('');
                setSelectedPassed('');
                fetchResults('', '', '');
              }}
              icon={RefreshCw}
            >
              Reset
            </Button>
          )}
        </form>
      </div>

      {/* Results Table */}
      <div className="card" style={{ padding: 0 }}>
        <DataTable
          columns={columns}
          data={results}
          loading={loading}
          emptyMessage="No examination results found."
        />
      </div>
    </div>
  );
};
