import React, { useEffect, useState } from 'react';
import { examApi } from '../../api/examApi';
import { questionApi } from '../../api/questionApi';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge, Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input, TextArea } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Alert } from '../../components/common/Alert';
import { useToast } from '../../context/ToastContext';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Clock,
  CheckCircle,
  HelpCircle,
  Search,
  RefreshCw,
} from 'lucide-react';

export const ExamsPage = () => {
  const { toast } = useToast();
  const [exams, setExams] = useState([]);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Wizard Tab
  const [wizardTab, setWizardTab] = useState('basic');

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    durationMinutes: 60,
    passingPercentage: 60.0,
    maxAttempts: 1,
    status: 'DRAFT',
    negativeMarkingEnabled: false,
    negativeMarksPerWrong: 0.25,
    randomizeQuestions: false,
    proctoringEnabled: true,
    fullScreenRequired: true,
    maxViolations: 3,
    autoSubmitOnViolation: true,
    questionIds: [],
  });

  useEffect(() => {
    fetchExams(selectedStatus, searchQuery);
  }, [selectedStatus]);

  const fetchExams = async (overrideStatus, overrideQuery) => {
    try {
      setLoading(true);
      const statusToUse = overrideStatus !== undefined ? overrideStatus : selectedStatus;
      const queryToUse = overrideQuery !== undefined ? overrideQuery : searchQuery;
      const res = await examApi.getExams({
        query: queryToUse || undefined,
        status: statusToUse || undefined,
      });
      if (res && res.success) {
        const list = Array.isArray(res.data)
          ? res.data
          : (res.data?.content && Array.isArray(res.data.content) ? res.data.content : []);
        setExams(list);
      } else {
        setExams([]);
      }
    } catch (err) {
      const msg = err.message || 'Failed to fetch examinations';
      setError(msg);
      toast.error(msg, 'Error');
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async () => {
    try {
      const res = await questionApi.getQuestions({ size: 200 });
      if (res.success) {
        setAvailableQuestions(res.data.content || []);
      }
    } catch (ignored) {}
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedExam(null);
    setWizardTab('basic');
    setFormData({
      title: '',
      description: '',
      instructions: '1. Ensure stable internet connection.\n2. Do not switch tabs or minimize full-screen mode.\n3. Complete all questions before the timer runs out.',
      durationMinutes: 60,
      passingPercentage: 60.0,
      maxAttempts: 1,
      status: 'DRAFT',
      negativeMarkingEnabled: false,
      negativeMarksPerWrong: 0.25,
      randomizeQuestions: false,
      proctoringEnabled: true,
      fullScreenRequired: true,
      maxViolations: 3,
      autoSubmitOnViolation: true,
      questionIds: [],
    });
    loadQuestions();
    setError('');
    setModalError('');
    setIsModalOpen(true);
  };

  const openEditModal = async (exam) => {
    setIsEditMode(true);
    setSelectedExam(exam);
    setWizardTab('basic');
    setError('');
    setModalError('');
    await loadQuestions();

    try {
      const res = await examApi.getExamById(exam.id);
      if (res.success) {
        const fullExam = res.data;
        setFormData({
          title: fullExam.title,
          description: fullExam.description || '',
          instructions: fullExam.instructions || '',
          durationMinutes: fullExam.durationMinutes,
          passingPercentage: fullExam.passingPercentage,
          maxAttempts: fullExam.maxAttempts,
          status: fullExam.status,
          negativeMarkingEnabled: fullExam.negativeMarkingEnabled,
          negativeMarksPerWrong: fullExam.negativeMarksPerWrong,
          randomizeQuestions: fullExam.randomizeQuestions,
          proctoringEnabled: fullExam.proctoringEnabled,
          fullScreenRequired: fullExam.fullScreenRequired,
          maxViolations: fullExam.maxViolations,
          autoSubmitOnViolation: fullExam.autoSubmitOnViolation,
          questionIds: fullExam.questions ? fullExam.questions.map((q) => q.id) : [],
        });
        setIsModalOpen(true);
      }
    } catch (err) {
      const msg = err.message || 'Failed to load exam details';
      setError(msg);
      toast.error(msg, 'Error');
    }
  };

  const handleSaveExam = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setModalError('');

    try {
      let res;
      if (isEditMode) {
        res = await examApi.updateExam(selectedExam.id, formData);
      } else {
        res = await examApi.createExam(formData);
      }

      if (res.success) {
        const msg = `Examination ${isEditMode ? 'updated' : 'created'} successfully.`;
        toast.success(msg, 'Success');
        setSuccess(msg);
        setIsModalOpen(false);
        fetchExams();
      }
    } catch (err) {
      let errMsg = err.message || 'Failed to save examination';
      if (err.errors && typeof err.errors === 'object') {
        const fieldMsgs = Object.values(err.errors).filter(Boolean);
        if (fieldMsgs.length > 0) {
          errMsg = fieldMsgs.join(' • ');
        }
      }
      setModalError(errMsg);
      toast.error(errMsg, 'Save Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (exam) => {
    const nextStatus = exam.status === 'PUBLISHED' ? 'ARCHIVED' : 'PUBLISHED';
    try {
      const res = await examApi.updateStatus(exam.id, nextStatus);
      if (res.success) {
        const msg = `Exam status changed to ${nextStatus}.`;
        toast.success(msg, 'Status Updated');
        setSuccess(msg);
        fetchExams();
      }
    } catch (err) {
      const msg = err.message || 'Failed to update status';
      setError(msg);
      toast.error(msg, 'Error');
    }
  };

  const handleDeleteExam = async () => {
    setSubmitting(true);
    try {
      const res = await examApi.deleteExam(selectedExam.id);
      if (res.success) {
        const msg = 'Exam deleted successfully.';
        toast.success(msg, 'Deleted');
        setSuccess(msg);
        setIsDeleteModalOpen(false);
        fetchExams();
      }
    } catch (err) {
      const msg = err.message || 'Failed to delete exam';
      setError(msg);
      toast.error(msg, 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleQuestionSelection = (qId) => {
    const current = [...formData.questionIds];
    const index = current.indexOf(qId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(qId);
    }
    setFormData({ ...formData, questionIds: current });
  };

  const columns = [
    {
      header: 'Title & Assessment',
      accessor: 'title',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700 }}>{row.title}</div>
          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
            {row.durationMinutes} min • {row.questionCount} Questions • Passing: {row.passingPercentage}%
          </div>
        </div>
      ),
    },
    {
      header: 'Proctoring',
      accessor: 'proctoringEnabled',
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {row.proctoringEnabled ? (
            <Badge variant="primary"><Shield size={12} /> Active ({row.maxViolations} strikes)</Badge>
          ) : (
            <Badge variant="secondary">Disabled</Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
          <Button
            size="sm"
            variant={row.status === 'PUBLISHED' ? 'secondary' : 'success'}
            onClick={() => handleToggleStatus(row)}
          >
            {row.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
          </Button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => openEditModal(row)}
            title="Edit Exam"
          >
            <Edit2 size={14} />
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSelectedExam(row);
              setIsDeleteModalOpen(true);
            }}
            title="Delete Exam"
          >
            <Trash2 size={14} color="var(--color-danger)" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Examination Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Configure technical recruitment evaluations, proctoring policies, and question sets.
          </p>
        </div>
        <Button variant="primary" onClick={openCreateModal} icon={Plus}>
          Create Examination
        </Button>
      </div>

      {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '1rem' }}>
        <form onSubmit={(e) => { e.preventDefault(); fetchExams(); }} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <Input
              placeholder="Search by exam title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ width: '180px' }}>
            <select
              className="form-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ marginBottom: 0 }}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <Button type="submit" variant="primary" icon={Search}>
            Search
          </Button>

          {(searchQuery || selectedStatus) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('');
                fetchExams('', '');
              }}
              icon={RefreshCw}
            >
              Reset
            </Button>
          )}
        </form>
      </div>

      {/* Exams Table */}
      <div className="card" style={{ padding: 0 }}>
        <DataTable
          columns={columns}
          data={exams}
          loading={loading}
          emptyMessage="No examinations configured."
        />
      </div>

      {/* Create / Edit Exam Wizard Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditMode ? 'Configure Examination' : 'Create New Recruitment Assessment'}
        maxWidth="840px"
      >
        <form onSubmit={handleSaveExam}>
          {modalError && (
            <Alert variant="danger" onClose={() => setModalError('')}>
              {modalError}
            </Alert>
          )}

          {/* Wizard Tabs Header */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1.5rem', gap: '0.5rem' }}>
            <button
              type="button"
              className={`btn ${wizardTab === 'basic' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setWizardTab('basic')}
            >
              1. Basic Information
            </button>
            <button
              type="button"
              className={`btn ${wizardTab === 'proctoring' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setWizardTab('proctoring')}
            >
              2. Proctoring & Rules
            </button>
            <button
              type="button"
              className={`btn ${wizardTab === 'questions' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setWizardTab('questions')}
            >
              3. Assign Questions ({formData.questionIds.length} Selected)
            </button>
          </div>

          {/* Tab 1: Basic Information */}
          {wizardTab === 'basic' && (
            <div>
              <Input
                label="Examination Title *"
                placeholder="e.g. Senior Java Backend Screening 2026"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />

              <TextArea
                label="Description"
                placeholder="Brief assessment overview..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <Input
                  label="Duration (Minutes) *"
                  type="number"
                  min="5"
                  max="360"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 60 })}
                  required
                />
                <Input
                  label="Passing Score (%) *"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.passingPercentage}
                  onChange={(e) => setFormData({ ...formData, passingPercentage: parseFloat(e.target.value) || 60 })}
                  required
                />
                <Input
                  label="Maximum Attempts *"
                  type="number"
                  min="1"
                  max="5"
                  value={formData.maxAttempts}
                  onChange={(e) => setFormData({ ...formData, maxAttempts: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>

              <TextArea
                label="Candidate Instructions"
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                rows={3}
              />
            </div>
          )}

          {/* Tab 2: Proctoring & Integrity */}
          {wizardTab === 'proctoring' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ padding: '1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-primary)' }}>
                  Integrity & Proctoring Controls
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.proctoringEnabled}
                      onChange={(e) => setFormData({ ...formData, proctoringEnabled: e.target.checked })}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Enable Proctoring Monitoring</div>
                      <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                        Detects tab switching, window blur, clipboard manipulation, and right click.
                      </div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.fullScreenRequired}
                      onChange={(e) => setFormData({ ...formData, fullScreenRequired: e.target.checked })}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Enforce Full Screen Mode</div>
                      <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                        Candidate must remain in browser full-screen; exiting triggers a violation.
                      </div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.autoSubmitOnViolation}
                      onChange={(e) => setFormData({ ...formData, autoSubmitOnViolation: e.target.checked })}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Auto-Submit on Violation Limit Breach</div>
                      <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                        Automatically terminates and disqualifies exam if violation limit is reached.
                      </div>
                    </div>
                  </label>
                </div>

                <div style={{ marginTop: '1rem', width: '220px' }}>
                  <Input
                    label="Max Allowed Violations (Strikes)"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.maxViolations}
                    onChange={(e) => setFormData({ ...formData, maxViolations: parseInt(e.target.value) || 3 })}
                  />
                </div>
              </div>

              {/* Scoring Policies */}
              <div style={{ padding: '1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-accent)' }}>
                  Scoring & Randomization Policies
                </h4>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginBottom: '0.75rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.negativeMarkingEnabled}
                    onChange={(e) => setFormData({ ...formData, negativeMarkingEnabled: e.target.checked })}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Enable Negative Marking</div>
                    <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                      Deduct marks for incorrect MCQ / Multi-Answer responses.
                    </div>
                  </div>
                </label>

                {formData.negativeMarkingEnabled && (
                  <div style={{ width: '220px', marginBottom: '0.75rem' }}>
                    <Input
                      label="Default Negative Marks Deduction"
                      type="number"
                      step="0.25"
                      min="0"
                      value={formData.negativeMarksPerWrong}
                      onChange={(e) => setFormData({ ...formData, negativeMarksPerWrong: parseFloat(e.target.value) || 0.25 })}
                    />
                  </div>
                )}

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.randomizeQuestions}
                    onChange={(e) => setFormData({ ...formData, randomizeQuestions: e.target.checked })}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Randomize Question Order</div>
                    <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                      Shuffles question display sequence uniquely for each candidate attempt.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Tab 3: Assign Questions */}
          {wizardTab === 'questions' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                  Select Assessment Questions ({formData.questionIds.length} selected)
                </h4>
              </div>

              <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                {availableQuestions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No questions in question bank. Create questions first.
                  </div>
                ) : (
                  availableQuestions.map((q) => {
                    const isSelected = formData.questionIds.includes(q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => toggleQuestionSelection(q.id)}
                        style={{
                          padding: '0.75rem 1rem',
                          borderRadius: 'var(--radius-sm)',
                          background: isSelected ? 'var(--color-primary-light)' : 'var(--bg-card)',
                          border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ cursor: 'pointer' }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{q.title}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {q.category} • {q.questionType} • {q.difficulty}
                            </div>
                          </div>
                        </div>

                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-primary)' }}>
                          +{q.marks} pts
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.75rem' }}>
            <div>
              {wizardTab === 'proctoring' && (
                <Button type="button" variant="secondary" onClick={() => setWizardTab('basic')}>
                  Back
                </Button>
              )}
              {wizardTab === 'questions' && (
                <Button type="button" variant="secondary" onClick={() => setWizardTab('proctoring')}>
                  Back
                </Button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {wizardTab === 'basic' && (
                <Button type="button" variant="primary" onClick={() => setWizardTab('proctoring')}>
                  Next: Proctoring
                </Button>
              )}
              {wizardTab === 'proctoring' && (
                <Button type="button" variant="primary" onClick={() => setWizardTab('questions')}>
                  Next: Questions
                </Button>
              )}
              {wizardTab === 'questions' && (
                <Button type="submit" variant="primary" loading={submitting}>
                  {isEditMode ? 'Save Assessment' : 'Create Assessment'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Exam Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteExam}
        title="Delete Examination"
        message={`Are you sure you want to permanently delete examination "${selectedExam?.title}"? All attempts and results associated with it will be deleted.`}
        confirmText="Delete"
        variant="danger"
        loading={submitting}
      />
    </div>
  );
};
