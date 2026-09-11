import React, { useEffect, useState } from 'react';
import { candidateApi } from '../../api/candidateApi';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Alert } from '../../components/common/Alert';
import { Spinner } from '../../components/common/Spinner';
import { useToast } from '../../context/ToastContext';
import {
  UserPlus,
  Search,
  KeyRound,
  Edit2,
  Trash2,
  Power,
  RefreshCw,
  User,
  Shield,
  Building2,
  Lock,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Calendar,
  Phone,
  Mail,
  Hash,
} from 'lucide-react';

export const CandidatesPage = () => {
  const { toast } = useToast();
  const [candidates, setCandidates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [candidateExamDetails, setCandidateExamDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [modalError, setModalError] = useState('');

  // Institute input mode: 'select' or 'enter'
  const [instituteInputMode, setInstituteInputMode] = useState('enter');
  const [editInstituteInputMode, setEditInstituteInputMode] = useState('enter');

  // Form states
  const [formData, setFormData] = useState({
    candidateId: '',
    employeeId: '',
    fullName: '',
    dob: '',
    aadharNumber: '',
    phone: '',
    gender: 'Male',
    department: '',
    designation: '',
    panNumber: '',
    email: '',
    username: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [newPassword, setNewPassword] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchCandidates(selectedDept, searchQuery);
  }, [selectedDept]);

  const fetchCandidates = async (overrideDept, overrideQuery) => {
    try {
      setLoading(true);
      const deptToUse = overrideDept !== undefined ? overrideDept : selectedDept;
      const queryToUse = overrideQuery !== undefined ? overrideQuery : searchQuery;
      const res = await candidateApi.getCandidates({
        query: queryToUse || undefined,
        department: deptToUse || undefined,
      });
      if (res && res.success) {
        const list = Array.isArray(res.data)
          ? res.data
          : (res.data?.content && Array.isArray(res.data.content) ? res.data.content : []);
        setCandidates(list);
      } else {
        setCandidates([]);
      }
    } catch (err) {
      const msg = err.message || 'Failed to fetch candidates';
      setError(msg);
      toast.error(msg, 'Error');
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await candidateApi.getDepartments();
      if (res && res.success) {
        const list = Array.isArray(res.data)
          ? res.data
          : (res.data?.content && Array.isArray(res.data.content) ? res.data.content : []);
        setDepartments(list);
      }
    } catch (ignored) {}
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCandidates();
  };

  const validateCandidateForm = (data, isEdit = false) => {
    const errors = {};

    // 1. Candidate ID
    if (!isEdit) {
      if (!data.candidateId?.trim()) {
        errors.candidateId = 'Candidate ID is required';
      } else if (!/^[a-zA-Z0-9_-]{3,50}$/.test(data.candidateId.trim())) {
        errors.candidateId = 'Candidate ID must be 3-50 alphanumeric characters (hyphens and underscores allowed)';
      }
    }

    // 2. Full Name
    if (!data.fullName?.trim()) {
      errors.fullName = 'Full Name is required';
    } else if (!/^[a-zA-Z\s.'-]{2,120}$/.test(data.fullName.trim())) {
      errors.fullName = 'Full Name must contain only letters, spaces, dots, or hyphens (min 2 chars)';
    }

    // 3. Date of Birth
    if (!data.dob) {
      errors.dob = 'Date of Birth is required';
    } else {
      const selectedDate = new Date(data.dob);
      const today = new Date();
      if (isNaN(selectedDate.getTime()) || selectedDate >= today) {
        errors.dob = 'Date of Birth must be a valid date in the past';
      }
    }

    // 4. Institute
    if (!data.department?.trim()) {
      errors.department = 'Institute is required';
    } else if (data.department.trim().length < 2) {
      errors.department = 'Institute name must be at least 2 characters';
    }

    // 5. Aadhar Number
    if (!data.aadharNumber?.trim()) {
      errors.aadharNumber = 'Aadhar number is required';
    } else {
      if (/[a-zA-Z]/.test(data.aadharNumber)) {
        errors.aadharNumber = 'Aadhar number cannot contain letters or text characters';
      } else {
        const cleanAadhar = data.aadharNumber.replace(/[\s-]/g, '');
        if (!/^\d{12}$/.test(cleanAadhar)) {
          errors.aadharNumber = 'Aadhar number must be exactly 12 numeric digits (e.g. 1234 5678 9012)';
        }
      }
    }

    // 6. Phone Number
    if (!data.phone?.trim()) {
      errors.phone = 'Phone number is required';
    } else {
      if (/[a-zA-Z]/.test(data.phone)) {
        errors.phone = 'Phone number cannot contain letters or text characters';
      } else {
        const cleanPhone = data.phone.replace(/[\s+-]/g, '');
        if (!/^(?:91)?[6-9]\d{9}$|^\d{10}$/.test(cleanPhone)) {
          errors.phone = 'Phone number must be a valid 10-digit numeric mobile number (e.g. 9876543210)';
        }
      }
    }

    // 7. Gender
    if (!data.gender?.trim()) {
      errors.gender = 'Gender is required';
    }

    // 8. Role / Designation
    if (!data.designation?.trim()) {
      errors.designation = 'Role / Designation is required';
    } else if (data.designation.trim().length < 2) {
      errors.designation = 'Role / Designation must be at least 2 characters';
    }

    // 9. PAN Number (Optional)
    if (data.panNumber?.trim()) {
      const cleanPan = data.panNumber.trim().toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
        errors.panNumber = 'PAN number must be a valid 10-character PAN format (e.g. ABCDE1234F)';
      }
    }

    // 10. Portal Username & Password (only on add)
    if (!isEdit) {
      if (!data.username?.trim()) {
        errors.username = 'Portal Username is required';
      } else if (!/^[a-zA-Z0-9._-]{3,50}$/.test(data.username.trim())) {
        errors.username = 'Username must be 3-50 alphanumeric characters (dots/underscores allowed)';
      }

      if (!data.password || data.password.length < 4) {
        errors.password = 'Temporary Password must be at least 4 characters';
      }
    }

    // 11. Email (Optional)
    if (data.email?.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
        errors.email = 'Please provide a valid email address';
      }
    }

    return errors;
  };

  const openAddModal = () => {
    const hasDepts = departments.length > 0;
    setInstituteInputMode(hasDepts ? 'select' : 'enter');
    setFormData({
      candidateId: `CAND-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      employeeId: '',
      fullName: '',
      dob: '',
      aadharNumber: '',
      phone: '',
      gender: 'Male',
      department: hasDepts ? departments[0] : '',
      designation: '',
      panNumber: '',
      email: '',
      username: '',
      password: 'Candidate@123',
    });
    setFieldErrors({});
    setError('');
    setModalError('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (cand) => {
    setSelectedCandidate(cand);
    const hasDepts = departments.length > 0;
    const isKnownDept = cand.department && departments.includes(cand.department);
    setEditInstituteInputMode(isKnownDept ? 'select' : 'enter');
    setFormData({
      candidateId: cand.candidateId || '',
      employeeId: cand.employeeId || '',
      fullName: cand.fullName || '',
      dob: cand.dob ? String(cand.dob).substring(0, 10) : '',
      aadharNumber: cand.aadharNumber || '',
      phone: cand.phone || '',
      gender: cand.gender ? (cand.gender.charAt(0).toUpperCase() + cand.gender.slice(1).toLowerCase()) : 'Male',
      department: cand.department || '',
      designation: cand.designation || '',
      panNumber: cand.panNumber || '',
      email: cand.email || '',
      status: cand.status || 'ACTIVE',
    });
    setFieldErrors({});
    setError('');
    setModalError('');
    setIsEditModalOpen(true);
  };

  const handleCreateCandidate = async (e) => {
    e.preventDefault();
    setModalError('');
    const validationErrors = validateCandidateForm(formData, false);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      const firstErrMsg = Object.values(validationErrors)[0];
      setModalError(firstErrMsg);
      toast.error(firstErrMsg, 'Validation Error');
      return;
    }

    setFormSubmitting(true);
    setFieldErrors({});
    try {
      const payload = {
        ...formData,
        candidateId: formData.candidateId.trim().toUpperCase(),
        phone: formData.phone.replace(/[\s-]/g, '').trim(),
        aadharNumber: formData.aadharNumber.replace(/[\s-]/g, '').trim(),
        panNumber: formData.panNumber ? formData.panNumber.replace(/[\s-]/g, '').trim().toUpperCase() : null,
        email: formData.email ? formData.email.trim() : null,
        employeeId: formData.employeeId ? formData.employeeId.trim() : null,
      };
      const res = await candidateApi.createCandidate(payload);
      if (res.success) {
        const msg = 'Candidate registered successfully.';
        toast.success(msg, 'Success');
        setSuccess(msg);
        setIsAddModalOpen(false);
        fetchCandidates();
        fetchDepartments();
      }
    } catch (err) {
      let errMsg = err.message || 'Failed to register candidate';
      const fErrors = {};
      if (err.errors && typeof err.errors === 'object') {
        Object.assign(fErrors, err.errors);
        const errorMsgs = Object.entries(err.errors)
          .map(([k, v]) => `${v}`)
          .join(', ');
        errMsg = errorMsgs || errMsg;
      } else if (errMsg.includes('Phone number')) {
        fErrors.phone = errMsg;
      } else if (errMsg.includes('Aadhar number')) {
        fErrors.aadharNumber = errMsg;
      } else if (errMsg.includes('PAN number')) {
        fErrors.panNumber = errMsg;
      } else if (errMsg.includes('Candidate ID')) {
        fErrors.candidateId = errMsg;
      } else if (errMsg.includes('Username')) {
        fErrors.username = errMsg;
      } else if (errMsg.includes('Email')) {
        fErrors.email = errMsg;
      }
      setFieldErrors(fErrors);
      setModalError(errMsg);
      toast.error(errMsg, 'Registration Failed');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateCandidate = async (e) => {
    e.preventDefault();
    setModalError('');
    const validationErrors = validateCandidateForm(formData, true);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      const firstErrMsg = Object.values(validationErrors)[0];
      setModalError(firstErrMsg);
      toast.error(firstErrMsg, 'Validation Error');
      return;
    }

    setFormSubmitting(true);
    setFieldErrors({});
    try {
      const payload = {
        ...formData,
        phone: formData.phone.replace(/[\s-]/g, '').trim(),
        aadharNumber: formData.aadharNumber.replace(/[\s-]/g, '').trim(),
        panNumber: formData.panNumber ? formData.panNumber.replace(/[\s-]/g, '').trim().toUpperCase() : null,
        email: formData.email ? formData.email.trim() : null,
        employeeId: formData.employeeId ? formData.employeeId.trim() : null,
      };
      const res = await candidateApi.updateCandidate(selectedCandidate.id, payload);
      if (res.success) {
        const msg = 'Candidate updated successfully.';
        toast.success(msg, 'Success');
        setSuccess(msg);
        setIsEditModalOpen(false);
        fetchCandidates();
      }
    } catch (err) {
      let errMsg = err.message || 'Failed to update candidate';
      const fErrors = {};
      if (err.errors && typeof err.errors === 'object') {
        Object.assign(fErrors, err.errors);
        const errorMsgs = Object.entries(err.errors)
          .map(([k, v]) => `${v}`)
          .join(', ');
        errMsg = errorMsgs || errMsg;
      } else if (errMsg.includes('Phone number')) {
        fErrors.phone = errMsg;
      } else if (errMsg.includes('Aadhar number')) {
        fErrors.aadharNumber = errMsg;
      } else if (errMsg.includes('PAN number')) {
        fErrors.panNumber = errMsg;
      } else if (errMsg.includes('Email')) {
        fErrors.email = errMsg;
      }
      setFieldErrors(fErrors);
      setModalError(errMsg);
      toast.error(errMsg, 'Update Failed');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (cand) => {
    const newStatus = cand.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await candidateApi.toggleStatus(cand.id, newStatus);
      if (res.success) {
        const msg = `Candidate marked as ${newStatus}.`;
        toast.success(msg, 'Status Updated');
        setSuccess(msg);
        fetchCandidates();
      }
    } catch (err) {
      const msg = err.message || 'Failed to update status';
      setError(msg);
      toast.error(msg, 'Error');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      const msg = 'Password must be at least 4 characters.';
      setModalError(msg);
      toast.error(msg, 'Validation Error');
      return;
    }
    setFormSubmitting(true);
    setModalError('');
    setError('');
    try {
      const res = await candidateApi.resetPassword(selectedCandidate.id, newPassword);
      if (res.success) {
        const msg = `Password for candidate '${selectedCandidate.fullName}' has been reset.`;
        toast.success(msg, 'Password Reset');
        setSuccess(msg);
        setIsResetModalOpen(false);
        setNewPassword('');
      }
    } catch (err) {
      const msg = err.message || 'Failed to reset password';
      setModalError(msg);
      toast.error(msg, 'Reset Failed');
    } finally {
      setFormSubmitting(false);
    }
  };

  const openExamHistoryModal = async (cand) => {
    setSelectedCandidate(cand);
    setIsDetailsModalOpen(true);
    setDetailsLoading(true);
    try {
      const res = await candidateApi.getCandidateExamDetails(cand.id);
      if (res && res.success) {
        setCandidateExamDetails(res.data);
      } else {
        setCandidateExamDetails(null);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load candidate exam details', 'Error');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDeleteCandidate = async () => {
    setFormSubmitting(true);
    try {
      const res = await candidateApi.deleteCandidate(selectedCandidate.id);
      if (res.success) {
        const msg = 'Candidate removed successfully.';
        toast.success(msg, 'Candidate Deleted');
        setSuccess(msg);
        setIsDeleteModalOpen(false);
        fetchCandidates();
      }
    } catch (err) {
      const msg = err.message || 'Failed to delete candidate';
      setError(msg);
      toast.error(msg, 'Error');
    } finally {
      setFormSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Candidate ID',
      accessor: 'candidateId',
      render: (row) => (
        <div>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-primary)' }}>
            {row.candidateId}
          </span>
          {row.employeeId && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Emp: {row.employeeId}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Candidate Details',
      accessor: 'fullName',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {row.fullName}
            {row.gender && (
              <span className="badge badge-subtle" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                {row.gender}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
            @{row.username} {row.dob ? `• DOB: ${row.dob}` : ''}
          </div>
        </div>
      ),
    },
    {
      header: 'Institute & Role',
      accessor: 'department',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{row.department}</div>
          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
            {row.designation || 'Candidate'}
          </div>
        </div>
      ),
    },
    {
      header: 'Contact & IDs',
      accessor: 'phone',
      render: (row) => (
        <div>
          <div style={{ fontSize: '0.825rem', fontWeight: 500 }}>{row.phone || '—'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {row.aadharNumber ? `Aadhar: ${row.aadharNumber}` : (row.email || '')}
            {row.panNumber ? ` • PAN: ${row.panNumber}` : ''}
          </div>
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
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => openExamHistoryModal(row)}
            title="View Candidate Profile & Exam Audit Details"
          >
            <FileText size={14} color="var(--color-primary)" />
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleToggleStatus(row)}
            title={row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          >
            <Power size={14} color={row.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--text-muted)'} />
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSelectedCandidate(row);
              setIsResetModalOpen(true);
            }}
            title="Reset Password"
          >
            <KeyRound size={14} />
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => openEditModal(row)}
            title="Edit Candidate"
          >
            <Edit2 size={14} />
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSelectedCandidate(row);
              setIsDeleteModalOpen(true);
            }}
            title="Delete Candidate"
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Candidate Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Register, provision credentials, and manage eligible recruitment candidates.
          </p>
        </div>
        <Button variant="primary" onClick={openAddModal} icon={UserPlus}>
          Register Candidate
        </Button>
      </div>

      {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Filters Bar */}
      <div className="card" style={{ padding: '1rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Input
              placeholder="Search by candidate name, ID, username, phone, or Aadhar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ width: '220px' }}>
            <select
              className="form-select"
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
              }}
              style={{ marginBottom: 0 }}
            >
              <option value="">All Institutes</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <Button type="submit" variant="primary" icon={Search}>
            Search
          </Button>

          {(searchQuery || selectedDept) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSearchQuery('');
                setSelectedDept('');
                fetchCandidates('', '');
              }}
              icon={RefreshCw}
            >
              Reset
            </Button>
          )}
        </form>
      </div>

      {/* Candidates Table */}
      <div className="card" style={{ padding: 0 }}>
        <DataTable
          columns={columns}
          data={candidates}
          loading={loading}
          emptyMessage="No candidates found matching the filters."
        />
      </div>

      {/* Register Candidate Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Recruitment Candidate"
        maxWidth="760px"
      >
        <form onSubmit={handleCreateCandidate}>
          {modalError && (
            <Alert variant="danger" onClose={() => setModalError('')}>
              {modalError}
            </Alert>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Section 1: Candidate Identity */}
            <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={16} /> Personal & Basic Details
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input
                  label="Candidate ID *"
                  placeholder="e.g. CAND-2026-001"
                  value={formData.candidateId}
                  error={fieldErrors.candidateId}
                  onChange={(e) => {
                    const clean = e.target.value.toUpperCase();
                    setFormData(prev => ({ ...prev, candidateId: clean }));
                    setFieldErrors(prev => ({ ...prev, candidateId: null }));
                    setModalError('');
                  }}
                  required
                />
                <Input
                  label="Full Name *"
                  placeholder="e.g. Robert Johnson"
                  value={formData.fullName}
                  error={fieldErrors.fullName}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, fullName: e.target.value }));
                    setFieldErrors(prev => ({ ...prev, fullName: null }));
                    setModalError('');
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                <Input
                  label="Date of Birth *"
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={formData.dob}
                  error={fieldErrors.dob}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, dob: e.target.value }));
                    setFieldErrors(prev => ({ ...prev, dob: null }));
                    setModalError('');
                  }}
                  required
                />
                <div className="form-group">
                  <label className="form-label">Gender *</label>
                  <select
                    className={`form-select ${fieldErrors.gender ? 'border-danger' : ''}`}
                    value={formData.gender}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, gender: e.target.value }));
                      setFieldErrors(prev => ({ ...prev, gender: null }));
                      setModalError('');
                    }}
                    required
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {fieldErrors.gender && <span className="form-error">{fieldErrors.gender}</span>}
                </div>
                <Input
                  label="Phone Number *"
                  placeholder="10 digits (e.g. 9876543210)"
                  value={formData.phone}
                  error={fieldErrors.phone}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9+\s-]/g, '');
                    setFormData(prev => ({ ...prev, phone: clean }));
                    setFieldErrors(prev => ({ ...prev, phone: null }));
                    setModalError('');
                  }}
                  required
                />
              </div>
            </div>

            {/* Section 2: Statutory & Identification */}
            <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={16} /> Identification & Verification
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '1rem' }}>
                <Input
                  label="Aadhar Number *"
                  placeholder="12 digits (e.g. 1234 5678 9012)"
                  value={formData.aadharNumber}
                  error={fieldErrors.aadharNumber}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9\s-]/g, '').slice(0, 14);
                    setFormData(prev => ({ ...prev, aadharNumber: clean }));
                    setFieldErrors(prev => ({ ...prev, aadharNumber: null }));
                    setModalError('');
                  }}
                  required
                />
                <Input
                  label="PAN Number (Optional)"
                  placeholder="10 chars (e.g. ABCDE1234F)"
                  value={formData.panNumber}
                  error={fieldErrors.panNumber}
                  onChange={(e) => {
                    const clean = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                    setFormData(prev => ({ ...prev, panNumber: clean }));
                    setFieldErrors(prev => ({ ...prev, panNumber: null }));
                    setModalError('');
                  }}
                />
                <Input
                  label="Employee ID (Optional)"
                  placeholder="e.g. EMP-1042"
                  value={formData.employeeId}
                  error={fieldErrors.employeeId}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, employeeId: e.target.value }));
                    setFieldErrors(prev => ({ ...prev, employeeId: null }));
                  }}
                />
              </div>
            </div>

            {/* Section 3: Academic & Role */}
            <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={16} /> Academic & Designation
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Institute *</label>
                    <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-elevated)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${instituteInputMode === 'select' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.15rem 0.45rem', fontSize: '0.725rem', height: 'auto' }}
                        onClick={() => {
                          setInstituteInputMode('select');
                          if (departments.length > 0 && !departments.includes(formData.department)) {
                            setFormData((prev) => ({ ...prev, department: departments[0] }));
                          }
                        }}
                        disabled={departments.length === 0}
                        title={departments.length === 0 ? 'No registered institutes available yet' : 'Select existing institute'}
                      >
                        Select Institute
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${instituteInputMode === 'enter' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.15rem 0.45rem', fontSize: '0.725rem', height: 'auto' }}
                        onClick={() => {
                          setInstituteInputMode('enter');
                        }}
                      >
                        Enter Institute
                      </button>
                    </div>
                  </div>

                  {instituteInputMode === 'select' && departments.length > 0 ? (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <select
                        className={`form-select ${fieldErrors.department ? 'border-danger' : ''}`}
                        value={formData.department}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, department: e.target.value }));
                          setFieldErrors(prev => ({ ...prev, department: null }));
                          setModalError('');
                        }}
                        required
                      >
                        <option value="" disabled>-- Select Institute --</option>
                        {departments.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      {fieldErrors.department && <span className="form-error">{fieldErrors.department}</span>}
                    </div>
                  ) : (
                    <Input
                      placeholder="e.g. Oxford Institute of Technology"
                      value={formData.department}
                      error={fieldErrors.department}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, department: e.target.value }));
                        setFieldErrors(prev => ({ ...prev, department: null }));
                        setModalError('');
                      }}
                      required
                      style={{ marginBottom: 0 }}
                    />
                  )}
                </div>

                <Input
                  label="Role / Designation *"
                  placeholder="e.g. Junior Backend Engineer"
                  value={formData.designation}
                  error={fieldErrors.designation}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, designation: e.target.value }));
                    setFieldErrors(prev => ({ ...prev, designation: null }));
                    setModalError('');
                  }}
                  required
                />
              </div>
            </div>

            {/* Section 4: Access Credentials */}
            <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={16} /> Portal Access & Credentials
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <Input
                  label="Username *"
                  placeholder="e.g. robert_j"
                  value={formData.username}
                  error={fieldErrors.username}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, username: e.target.value }));
                    setFieldErrors(prev => ({ ...prev, username: null }));
                    setModalError('');
                  }}
                  required
                />
                <Input
                  label="Password *"
                  type="text"
                  placeholder="Min 4 characters"
                  value={formData.password}
                  error={fieldErrors.password}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, password: e.target.value }));
                    setFieldErrors(prev => ({ ...prev, password: null }));
                    setModalError('');
                  }}
                  minLength={4}
                  required
                />
                <Input
                  label="Email (Optional)"
                  type="email"
                  placeholder="e.g. robert@example.com"
                  value={formData.email}
                  error={fieldErrors.email}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, email: e.target.value }));
                    setFieldErrors(prev => ({ ...prev, email: null }));
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={formSubmitting}>
              Register Candidate
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Candidate Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Candidate Profile"
        maxWidth="760px"
      >
        <form onSubmit={handleUpdateCandidate}>
          {modalError && (
            <Alert variant="danger" onClose={() => setModalError('')}>
              {modalError}
            </Alert>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Section 1: Basic Details */}
            <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={16} /> Personal & Basic Details
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input
                  label="Candidate ID"
                  value={formData.candidateId}
                  disabled
                  helperText="Candidate ID cannot be modified after registration"
                />
                <Input
                  label="Full Name *"
                  value={formData.fullName}
                  error={fieldErrors.fullName}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, fullName: e.target.value }));
                    setFieldErrors(prev => ({ ...prev, fullName: null }));
                    setModalError('');
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                <Input
                  label="Date of Birth"
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={formData.dob}
                  error={fieldErrors.dob}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, dob: e.target.value }));
                    setFieldErrors(prev => ({ ...prev, dob: null }));
                    setModalError('');
                  }}
                />
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select
                    className={`form-select ${fieldErrors.gender ? 'border-danger' : ''}`}
                    value={formData.gender}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, gender: e.target.value }));
                      setFieldErrors(prev => ({ ...prev, gender: null }));
                      setModalError('');
                    }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {fieldErrors.gender && <span className="form-error">{fieldErrors.gender}</span>}
                </div>
                <Input
                  label="Phone Number *"
                  placeholder="10 digits (e.g. 9876543210)"
                  value={formData.phone}
                  error={fieldErrors.phone}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9+\s-]/g, '');
                    setFormData(prev => ({ ...prev, phone: clean }));
                    setFieldErrors(prev => ({ ...prev, phone: null }));
                    setModalError('');
                  }}
                  required
                />
              </div>
            </div>

            {/* Section 2: Statutory & IDs */}
            <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={16} /> Identification & Verification
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '1rem' }}>
                <Input
                  label="Aadhar Number"
                  placeholder="12 digits (e.g. 1234 5678 9012)"
                  value={formData.aadharNumber}
                  error={fieldErrors.aadharNumber}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9\s-]/g, '').slice(0, 14);
                    setFormData(prev => ({ ...prev, aadharNumber: clean }));
                    setFieldErrors(prev => ({ ...prev, aadharNumber: null }));
                    setModalError('');
                  }}
                />
                <Input
                  label="PAN Number (Optional)"
                  placeholder="10 chars (e.g. ABCDE1234F)"
                  value={formData.panNumber}
                  error={fieldErrors.panNumber}
                  onChange={(e) => {
                    const clean = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                    setFormData(prev => ({ ...prev, panNumber: clean }));
                    setFieldErrors(prev => ({ ...prev, panNumber: null }));
                    setModalError('');
                  }}
                />
                <Input
                  label="Employee ID (Optional)"
                  placeholder="e.g. EMP-1042"
                  value={formData.employeeId}
                  error={fieldErrors.employeeId}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, employeeId: e.target.value }));
                    setFieldErrors(prev => ({ ...prev, employeeId: null }));
                  }}
                />
              </div>
            </div>

            {/* Section 3: Institute & Designation */}
            <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={16} /> Academic & Designation
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Institute *</label>
                    <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-elevated)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${editInstituteInputMode === 'select' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.15rem 0.45rem', fontSize: '0.725rem', height: 'auto' }}
                        onClick={() => {
                          setEditInstituteInputMode('select');
                          if (departments.length > 0 && !departments.includes(formData.department)) {
                            setFormData((prev) => ({ ...prev, department: departments[0] }));
                          }
                        }}
                        disabled={departments.length === 0}
                        title={departments.length === 0 ? 'No registered institutes available yet' : 'Select existing institute'}
                      >
                        Select Institute
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${editInstituteInputMode === 'enter' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.15rem 0.45rem', fontSize: '0.725rem', height: 'auto' }}
                        onClick={() => {
                          setEditInstituteInputMode('enter');
                        }}
                      >
                        Enter Institute
                      </button>
                    </div>
                  </div>

                  {editInstituteInputMode === 'select' && departments.length > 0 ? (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <select
                        className={`form-select ${fieldErrors.department ? 'border-danger' : ''}`}
                        value={formData.department}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, department: e.target.value }));
                          setFieldErrors(prev => ({ ...prev, department: null }));
                          setModalError('');
                        }}
                        required
                      >
                        <option value="" disabled>-- Select Institute --</option>
                        {departments.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      {fieldErrors.department && <span className="form-error">{fieldErrors.department}</span>}
                    </div>
                  ) : (
                    <Input
                      placeholder="e.g. Oxford Institute of Technology"
                      value={formData.department}
                      error={fieldErrors.department}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, department: e.target.value }));
                        setFieldErrors(prev => ({ ...prev, department: null }));
                        setModalError('');
                      }}
                      required
                      style={{ marginBottom: 0 }}
                    />
                  )}
                </div>

                <Input
                  label="Role / Designation *"
                  value={formData.designation}
                  error={fieldErrors.designation}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, designation: e.target.value }));
                    setFieldErrors(prev => ({ ...prev, designation: null }));
                    setModalError('');
                  }}
                  required
                />
              </div>
            </div>

            {/* Section 4: Email & Status */}
            <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input
                  label="Email (Optional)"
                  type="email"
                  value={formData.email}
                  error={fieldErrors.email}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, email: e.target.value }));
                    setFieldErrors(prev => ({ ...prev, email: null }));
                    setModalError('');
                  }}
                />
                <div className="form-group">
                  <label className="form-label">Account Status</label>
                  <select
                    className="form-select"
                    value={formData.status || 'ACTIVE'}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="LOCKED">LOCKED</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={formSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title={`Reset Credentials for ${selectedCandidate?.fullName}`}
      >
        <form onSubmit={handleResetPassword}>
          {modalError && (
            <Alert variant="danger" onClose={() => setModalError('')}>
              {modalError}
            </Alert>
          )}

          <Input
            label="New Temporary Password *"
            placeholder="Min 4 characters"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setModalError('');
            }}
            minLength={4}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsResetModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={formSubmitting}>
              Update Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteCandidate}
        title="Delete Candidate Record"
        message={`Are you sure you want to delete candidate ${selectedCandidate?.fullName} (${selectedCandidate?.candidateId})? All exam assignments and historical logs for this candidate will be removed.`}
        confirmText="Delete Candidate"
        variant="danger"
        loading={formSubmitting}
      />

      {/* Candidate Profile & Exam Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setCandidateExamDetails(null);
        }}
        title={`Candidate Details & Exam History: ${selectedCandidate?.fullName || ''}`}
        maxWidth="840px"
      >
        {detailsLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
            <Spinner size="lg" />
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading candidate profile and exam records...</p>
          </div>
        ) : candidateExamDetails ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Candidate Identity Card */}
            <div style={{ background: 'var(--bg-subtle)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                    {candidateExamDetails.fullName}
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                    {candidateExamDetails.candidateId}
                  </span>
                  {candidateExamDetails.employeeId && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                      (Emp: {candidateExamDetails.employeeId})
                    </span>
                  )}
                </div>
                <StatusBadge status={candidateExamDetails.status} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Institute</span>
                  <span style={{ fontWeight: 600 }}>{candidateExamDetails.department || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Role / Designation</span>
                  <span style={{ fontWeight: 600 }}>{candidateExamDetails.designation || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Date of Birth</span>
                  <span style={{ fontWeight: 600 }}>{candidateExamDetails.dob || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Gender</span>
                  <span style={{ fontWeight: 600 }}>{candidateExamDetails.gender || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Aadhar Number</span>
                  <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{candidateExamDetails.aadharNumber || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>PAN Number</span>
                  <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{candidateExamDetails.panNumber || 'N/A'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Phone Number</span>
                  <span style={{ fontWeight: 600 }}>{candidateExamDetails.phone || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Username / Email</span>
                  <span style={{ fontWeight: 600 }}>@{candidateExamDetails.username} • {candidateExamDetails.email}</span>
                </div>
              </div>
            </div>

            {/* Exam KPI Summary Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
              <div style={{ background: 'var(--bg-elevated)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned Exams</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{candidateExamDetails.totalAssignedExams}</div>
              </div>
              <div style={{ background: 'var(--bg-elevated)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Attempts</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{candidateExamDetails.totalAttemptedExams}</div>
              </div>
              <div style={{ background: 'rgba(34, 197, 94, 0.08)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(34, 197, 94, 0.25)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>Passed</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-success)' }}>{candidateExamDetails.totalPassedExams}</div>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.25)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>Failed</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-danger)' }}>{candidateExamDetails.totalFailedExams}</div>
              </div>
              <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245, 158, 11, 0.25)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>Total Warnings</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b' }}>{candidateExamDetails.totalWarningsReceived}</div>
              </div>
            </div>

            {/* Exam Attempts List */}
            <div>
              <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.75rem' }}>
                Exam Attempts & Proctoring Audit Records
              </h4>

              {candidateExamDetails.exams && candidateExamDetails.exams.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {candidateExamDetails.exams.map((examItem, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-elevated)',
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                          {examItem.examTitle}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Duration: {examItem.durationMinutes} mins • Pass Requirement: {examItem.passPercentage}%
                        </div>
                        {examItem.startTime && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Attempted on: {new Date(examItem.startTime).toLocaleString()}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {/* Warnings Received Badge */}
                        <div style={{ textAlign: 'center' }}>
                          <span
                            className="badge"
                            style={{
                              background: examItem.warningCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-subtle)',
                              color: examItem.warningCount > 0 ? '#f59e0b' : 'var(--text-muted)',
                              border: `1px solid ${examItem.warningCount > 0 ? '#f59e0b' : 'var(--border-subtle)'}`,
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              padding: '4px 8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {examItem.warningCount > 0 ? <AlertTriangle size={13} /> : null}
                            {examItem.warningCount} {examItem.warningCount === 1 ? 'Warning' : 'Warnings'}
                          </span>
                        </div>

                        {/* Score & Percentage */}
                        {examItem.score !== null && examItem.score !== undefined ? (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                              {examItem.score} / {examItem.maxScore}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              ({examItem.percentage?.toFixed(1)}%)
                            </div>
                          </div>
                        ) : null}

                        {/* Pass / Fail Outcome Badge */}
                        <div>
                          {examItem.isPassed === true && (
                            <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700 }}>
                              PASSED
                            </span>
                          )}
                          {examItem.isPassed === false && (
                            <span className="badge badge-danger" style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700 }}>
                              FAILED
                            </span>
                          )}
                          {examItem.isPassed === null && examItem.attemptStatus === 'IN_PROGRESS' && (
                            <span className="badge badge-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700 }}>
                              IN PROGRESS
                            </span>
                          )}
                          {examItem.isPassed === null && !examItem.attemptStatus && (
                            <span className="badge badge-subtle" style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 500 }}>
                              NOT ATTEMPTED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No exams assigned or attempted yet for this candidate.
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setIsDetailsModalOpen(false);
              setCandidateExamDetails(null);
            }}
          >
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
};
