import React, { useEffect, useState } from 'react';
import { assignmentApi } from '../../api/assignmentApi';
import { examApi } from '../../api/examApi';
import { candidateApi } from '../../api/candidateApi';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Alert } from '../../components/common/Alert';
import { useToast } from '../../context/ToastContext';
import {
  UserCheck,
  Plus,
  Trash2,
  Calendar,
  Building,
  RotateCcw,
} from 'lucide-react';

export const AssignmentsPage = () => {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState([]);
  const [exams, setExams] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Assign & Reassign Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [modalError, setModalError] = useState('');
  const [reassignModalError, setReassignModalError] = useState('');

  // Form
  const [assignType, setAssignType] = useState('individual'); // 'individual' or 'department'
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    fetchAssignments();
    fetchExamsAndCandidates();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await assignmentApi.getAssignments();
      if (res.success) {
        setAssignments(res.data.content || []);
      }
    } catch (err) {
      const msg = err.message || 'Failed to fetch assignments';
      setError(msg);
      toast.error(msg, 'Error');
    } finally {
      setLoading(false);
    }
  };

  const fetchExamsAndCandidates = async () => {
    try {
      const [examRes, candRes, deptRes] = await Promise.all([
        examApi.getExams({ size: 100 }),
        candidateApi.getCandidates({ size: 100 }),
        candidateApi.getDepartments(),
      ]);

      if (examRes.success) setExams(examRes.data.content || []);
      if (candRes.success) setCandidates(candRes.data.content || []);
      if (deptRes.success) setDepartments(deptRes.data || []);
    } catch (ignored) {}
  };

  const openAssignModal = () => {
    setSelectedExamId(exams.length > 0 ? exams[0].id : '');
    setSelectedCandidateIds([]);
    setSelectedDepartment('');
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setDueDate(d.toISOString().slice(0, 16));
    setError('');
    setModalError('');
    setIsAssignModalOpen(true);
  };

  const openReassignModal = (assignment) => {
    setSelectedAssignment(assignment);
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setDueDate(d.toISOString().slice(0, 16));
    setError('');
    setReassignModalError('');
    setIsReassignModalOpen(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setError('');

    if (!selectedExamId) {
      const msg = 'Please select an examination to assign.';
      setModalError(msg);
      toast.error(msg, 'Validation Error');
      return;
    }

    if (assignType === 'individual' && selectedCandidateIds.length === 0) {
      const msg = 'Please select at least one candidate.';
      setModalError(msg);
      toast.error(msg, 'Validation Error');
      return;
    }

    if (assignType === 'department' && !selectedDepartment) {
      const msg = 'Please select an institute.';
      setModalError(msg);
      toast.error(msg, 'Validation Error');
      return;
    }

    setAssigning(true);

    try {
      const payload = {
        examId: selectedExamId,
        candidateIds: assignType === 'individual' ? selectedCandidateIds : [],
        department: assignType === 'department' ? selectedDepartment : null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      };

      const res = await assignmentApi.assignExam(payload);
      if (res.success) {
        const msg = 'Examination assigned successfully.';
        toast.success(msg, 'Success');
        setSuccess(msg);
        setIsAssignModalOpen(false);
        fetchAssignments();
      }
    } catch (err) {
      let errMsg = err.message || 'Failed to assign examination';
      if (err.errors && typeof err.errors === 'object') {
        const fieldMsgs = Object.values(err.errors).filter(Boolean);
        if (fieldMsgs.length > 0) {
          errMsg = fieldMsgs.join(' • ');
        }
      }
      setModalError(errMsg);
      toast.error(errMsg, 'Assignment Failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    setAssigning(true);
    setReassignModalError('');
    setError('');

    try {
      const res = await assignmentApi.reassignAssignment(selectedAssignment.id, {
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });

      if (res.success) {
        const msg = `Examination reassigned to candidate '${selectedAssignment.candidateFullName || selectedAssignment.candidate?.fullName}' successfully. Their attempt limit and status have been reset.`;
        toast.success(msg, 'Reassigned');
        setSuccess(msg);
        setIsReassignModalOpen(false);
        fetchAssignments();
      }
    } catch (err) {
      const errMsg = err.message || 'Failed to reassign examination';
      setReassignModalError(errMsg);
      toast.error(errMsg, 'Reassignment Failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleDeleteAssignment = async () => {
    setAssigning(true);
    try {
      const res = await assignmentApi.deleteAssignment(selectedAssignment.id);
      if (res.success) {
        toast.success('Assignment removed successfully.', 'Removed');
        setSuccess('Assignment removed.');
        setIsDeleteModalOpen(false);
        fetchAssignments();
      }
    } catch (err) {
      const errMsg = err.message || 'Failed to remove assignment';
      setError(errMsg);
      toast.error(errMsg, 'Error');
    } finally {
      setAssigning(false);
    }
  };

  const toggleCandidateCheckbox = (id) => {
    const current = [...selectedCandidateIds];
    const index = current.indexOf(id);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(id);
    }
    setSelectedCandidateIds(current);
  };

  const columns = [
    {
      header: 'Examination',
      accessor: 'examTitle',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.examTitle || row.exam?.title || 'Examination'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Duration: {row.durationMinutes || row.exam?.durationMinutes || '--'}m • Pass: {row.passingPercentage || row.exam?.passingPercentage || '--'}%
          </div>
        </div>
      ),
    },
    {
      header: 'Candidate',
      accessor: 'candidateFullName',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.candidateFullName || row.candidate?.fullName || 'Candidate'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {[
              row.candidateCode || row.candidate?.candidateId,
              row.candidateDepartment || row.candidate?.department
            ].filter(Boolean).join(' • ')}
          </div>
        </div>
      ),
    },
    {
      header: 'Due Date',
      accessor: 'dueDate',
      render: (row) => (
        <span style={{ fontSize: '0.85rem' }}>
          {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : 'No Deadline'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Attempts',
      accessor: 'attemptCount',
      render: (row) => <span>{row.attemptCount ?? 0}</span>,
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => openReassignModal(row)}
            title="Reassign Assessment (Reset status & attempts for candidate)"
            style={{ color: 'var(--color-primary)' }}
          >
            <RotateCcw size={14} />
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSelectedAssignment(row);
              setIsDeleteModalOpen(true);
            }}
            title="Revoke Assignment"
          >
            <Trash2 size={14} color="var(--color-danger)" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Assessment Assignments</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Assign technical examinations to individual candidates or entire institutes.
          </p>
        </div>
        <Button variant="primary" onClick={openAssignModal} icon={Plus}>
          Assign Assessment
        </Button>
      </div>

      {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <DataTable
          columns={columns}
          data={assignments}
          loading={loading}
          emptyMessage="No assessment assignments found."
        />
      </div>

      {/* Assign Assessment Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Technical Assessment"
        maxWidth="680px"
      >
        <form onSubmit={handleAssignSubmit}>
          {modalError && (
            <Alert variant="danger" onClose={() => setModalError('')}>
              {modalError}
            </Alert>
          )}

          <Select
            label="Select Examination *"
            value={selectedExamId}
            onChange={(e) => {
              setSelectedExamId(e.target.value);
              setModalError('');
            }}
            options={exams.map((ex) => ({
              value: ex.id,
              label: `${ex.title} (${ex.durationMinutes} min - ${ex.status})`,
            }))}
            required
          />

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
              Assignment Method
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                className={`btn ${assignType === 'individual' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => {
                  setAssignType('individual');
                  setModalError('');
                }}
              >
                Individual Candidates
              </button>
              <button
                type="button"
                className={`btn ${assignType === 'department' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => {
                  setAssignType('department');
                  setModalError('');
                }}
              >
                By Institute Batch
              </button>
            </div>
          </div>

          {assignType === 'department' ? (
            <Select
              label="Select Target Institute *"
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setModalError('');
              }}
              options={departments.map((d) => ({ value: d, label: d }))}
              placeholder="Select institute..."
              required
            />
          ) : (
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">
                Select Candidates ({selectedCandidateIds.length} Selected)
              </label>
              <div
                style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                }}
              >
                {candidates.map((c) => {
                  const isChecked = selectedCandidateIds.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        toggleCandidateCheckbox(c.id);
                        setModalError('');
                      }}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        background: isChecked ? 'var(--color-primary-light)' : 'var(--bg-elevated)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ cursor: 'pointer' }}
                      />
                      <div style={{ fontSize: '0.875rem' }}>
                        <strong>{c.fullName}</strong> ({c.candidateId}) • {c.department}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Input
            label="Due Date / Deadline"
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={assigning}>
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reassign Assessment Modal */}
      <Modal
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        title="Reassign Technical Assessment"
        maxWidth="560px"
      >
        <form onSubmit={handleReassignSubmit}>
          {reassignModalError && (
            <Alert variant="danger" onClose={() => setReassignModalError('')}>
              {reassignModalError}
            </Alert>
          )}

          <div style={{ padding: '1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Target Examination</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
              {selectedAssignment?.examTitle || selectedAssignment?.exam?.title || 'Examination'}
            </div>

            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>Candidate</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-primary)', marginTop: '0.15rem' }}>
              {selectedAssignment?.candidateFullName || selectedAssignment?.candidate?.fullName} ({selectedAssignment?.candidateCode || selectedAssignment?.candidate?.candidateId})
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Current Status: <strong>{selectedAssignment?.status}</strong> • Attempts: <strong>{selectedAssignment?.attemptCount ?? 0}</strong>
            </div>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            Reassigning this examination will reset the candidate's assignment status to <strong>ASSIGNED</strong> and clear their attempt count so they can retake the assessment immediately.
          </p>

          <Input
            label="New Due Date / Deadline"
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsReassignModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={assigning} icon={RotateCcw}>
              Confirm Reassignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAssignment}
        title="Revoke Exam Assignment"
        message="Are you sure you want to revoke this candidate's examination assignment?"
        confirmText="Revoke"
        variant="danger"
        loading={assigning}
      />
    </div>
  );
};
