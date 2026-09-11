import React, { useEffect, useState } from 'react';
import { resultApi } from '../../api/takingApi';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Alert } from '../../components/common/Alert';
import { useToast } from '../../context/ToastContext';
import { Activity, Search, RefreshCw, Shield } from 'lucide-react';

export const AuditLogsPage = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLogs();
    fetchActions();
  }, [selectedAction]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await resultApi.getAuditLogs({
        query: searchQuery || undefined,
        action: selectedAction || undefined,
      });
      if (res.success) {
        setLogs(res.data.content || []);
      }
    } catch (err) {
      const msg = err.message || 'Failed to fetch audit trail';
      setError(msg);
      toast.error(msg, 'Error');
    } finally {
      setLoading(false);
    }
  };

  const fetchActions = async () => {
    try {
      const res = await resultApi.getAuditActions();
      if (res.success) {
        setActions(res.data || []);
      }
    } catch (ignored) {}
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const columns = [
    {
      header: 'Timestamp',
      accessor: 'timestamp',
      render: (row) => (
        <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          {new Date(row.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'User',
      accessor: 'username',
      render: (row) => (
        <span style={{ fontWeight: 600 }}>
          {row.username ? `@${row.username}` : 'SYSTEM'}
        </span>
      ),
    },
    {
      header: 'Action',
      accessor: 'action',
      render: (row) => <Badge variant="primary">{row.action}</Badge>,
    },
    {
      header: 'Details',
      accessor: 'details',
      render: (row) => (
        <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
          {row.details}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Audit & Compliance Logs</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Immutable audit record of administrative, candidate assessment, and security events.
        </p>
      </div>

      {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}

      <div className="card" style={{ padding: '1rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <Input
              placeholder="Search audit details or usernames..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ width: '220px' }}>
            <select
              className="form-select"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              style={{ marginBottom: 0 }}
            >
              <option value="">All Actions</option>
              {actions.map((act) => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>

          <Button type="submit" variant="primary" icon={Search}>
            Search
          </Button>

          {(searchQuery || selectedAction) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSearchQuery('');
                setSelectedAction('');
                fetchLogs();
              }}
              icon={RefreshCw}
            >
              Reset
            </Button>
          )}
        </form>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <DataTable
          columns={columns}
          data={logs}
          loading={loading}
          emptyMessage="No audit logs recorded."
        />
      </div>
    </div>
  );
};
