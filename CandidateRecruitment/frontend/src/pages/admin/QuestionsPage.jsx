import React, { useEffect, useState } from 'react';
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
  HelpCircle,
  Plus,
  Trash2,
  Edit2,
  Code,
  CheckSquare,
  ListOrdered,
  Search,
  RefreshCw,
} from 'lucide-react';

export const QuestionsPage = () => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    questionText: '',
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    category: '',
    marks: 2.0,
    negativeMarks: 0.5,
    explanation: '',
    options: [
      { optionText: '', isCorrect: true, optionOrder: 1 },
      { optionText: '', isCorrect: false, optionOrder: 2 },
      { optionText: '', isCorrect: false, optionOrder: 3 },
      { optionText: '', isCorrect: false, optionOrder: 4 },
    ],
    codingDetails: {
      problemStatement: '',
      inputFormat: '',
      outputFormat: '',
      constraints: '',
      sampleInput: '',
      sampleOutput: '',
      allowedLanguages: 'JAVA,PYTHON,CPP,JAVASCRIPT',
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      starterCodeTemplates: '',
      testCases: [
        { inputData: '', expectedOutput: '', isHidden: false, marksWeight: 1.0, orderIndex: 1 },
        { inputData: '', expectedOutput: '', isHidden: true, marksWeight: 1.0, orderIndex: 2 },
      ],
    },
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchQuestions(selectedType, selectedDifficulty, selectedCategory, searchQuery);
  }, [selectedType, selectedDifficulty, selectedCategory]);

  const fetchQuestions = async (overrideType, overrideDifficulty, overrideCategory, overrideQuery) => {
    try {
      setLoading(true);
      const typeToUse = overrideType !== undefined ? overrideType : selectedType;
      const diffToUse = overrideDifficulty !== undefined ? overrideDifficulty : selectedDifficulty;
      const catToUse = overrideCategory !== undefined ? overrideCategory : selectedCategory;
      const queryToUse = overrideQuery !== undefined ? overrideQuery : searchQuery;

      const res = await questionApi.getQuestions({
        query: queryToUse || undefined,
        type: typeToUse || undefined,
        difficulty: diffToUse || undefined,
        category: catToUse || undefined,
      });
      if (res && res.success) {
        const list = Array.isArray(res.data)
          ? res.data
          : (res.data?.content && Array.isArray(res.data.content) ? res.data.content : []);
        setQuestions(list);
      } else {
        setQuestions([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch questions');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await questionApi.getCategories();
      if (res && res.success) {
        const list = Array.isArray(res.data)
          ? res.data
          : (res.data?.content && Array.isArray(res.data.content) ? res.data.content : []);
        setCategories(list);
      }
    } catch (ignored) {}
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedQuestion(null);
    setFormData({
      title: '',
      questionText: '',
      questionType: 'MCQ',
      difficulty: 'MEDIUM',
      category: 'Java Core',
      marks: 2.0,
      negativeMarks: 0.5,
      explanation: '',
      options: [
        { optionText: '', isCorrect: true, optionOrder: 1 },
        { optionText: '', isCorrect: false, optionOrder: 2 },
        { optionText: '', isCorrect: false, optionOrder: 3 },
        { optionText: '', isCorrect: false, optionOrder: 4 },
      ],
      codingDetails: {
        problemStatement: '',
        inputFormat: '',
        outputFormat: '',
        constraints: '',
        sampleInput: '',
        sampleOutput: '',
        allowedLanguages: 'JAVA,PYTHON,CPP,JAVASCRIPT',
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        starterCodeTemplates: '',
        testCases: [
          { inputData: '', expectedOutput: '', isHidden: false, marksWeight: 1.0, orderIndex: 1 },
          { inputData: '', expectedOutput: '', isHidden: true, marksWeight: 1.0, orderIndex: 2 },
        ],
      },
    });
    setError('');
    setModalError('');
    setIsModalOpen(true);
  };

  const openEditModal = async (q) => {
    setIsEditMode(true);
    setSelectedQuestion(q);
    setError('');
    setModalError('');
    try {
      const res = await questionApi.getQuestionById(q.id);
      if (res.success) {
        const fullQ = res.data;
        setFormData({
          title: fullQ.title,
          questionText: fullQ.questionText,
          questionType: fullQ.questionType,
          difficulty: fullQ.difficulty,
          category: fullQ.category,
          marks: fullQ.marks,
          negativeMarks: fullQ.negativeMarks,
          explanation: fullQ.explanation || '',
          options: fullQ.options?.length > 0 ? fullQ.options : [
            { optionText: '', isCorrect: true, optionOrder: 1 },
            { optionText: '', isCorrect: false, optionOrder: 2 },
          ],
          codingDetails: fullQ.codingDetails || {
            problemStatement: '',
            inputFormat: '',
            outputFormat: '',
            constraints: '',
            sampleInput: '',
            sampleOutput: '',
            allowedLanguages: 'JAVA,PYTHON,CPP,JAVASCRIPT',
            timeLimitMs: 2000,
            memoryLimitMb: 256,
            starterCodeTemplates: '',
            testCases: [{ inputData: '', expectedOutput: '', isHidden: false, marksWeight: 1.0, orderIndex: 1 }],
          },
        });
        setIsModalOpen(true);
      }
    } catch (err) {
      const msg = err.message || 'Failed to load question details';
      setError(msg);
      toast.error(msg, 'Error');
    }
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setModalError('');

    try {
      // Build clean payload according to questionType
      const payload = {
        title: formData.title.trim(),
        questionText: formData.questionText.trim(),
        questionType: formData.questionType,
        difficulty: formData.difficulty,
        category: formData.category.trim(),
        marks: parseFloat(formData.marks) || 1.0,
        negativeMarks: parseFloat(formData.negativeMarks) || 0.0,
        explanation: formData.explanation || '',
      };

      if (formData.questionType === 'CODING') {
        payload.options = [];
        const validTestCases = (formData.codingDetails?.testCases || [])
          .filter((tc) => tc.expectedOutput && tc.expectedOutput.trim() !== '')
          .map((tc, idx) => ({
            inputData: tc.inputData || '',
            expectedOutput: tc.expectedOutput.trim(),
            isHidden: !!tc.isHidden,
            marksWeight: parseFloat(tc.marksWeight) || 1.0,
            orderIndex: idx + 1,
          }));

        if (validTestCases.length === 0) {
          const msg = 'Please provide at least one test case with expected output for the coding challenge.';
          setModalError(msg);
          toast.error(msg, 'Validation Error');
          setSubmitting(false);
          return;
        }

        payload.codingDetails = {
          problemStatement: (formData.codingDetails?.problemStatement || formData.questionText).trim(),
          inputFormat: formData.codingDetails?.inputFormat || '',
          outputFormat: formData.codingDetails?.outputFormat || '',
          constraints: formData.codingDetails?.constraints || '',
          sampleInput: formData.codingDetails?.sampleInput || '',
          sampleOutput: formData.codingDetails?.sampleOutput || '',
          allowedLanguages: formData.codingDetails?.allowedLanguages || 'JAVA,PYTHON,CPP,JAVASCRIPT',
          timeLimitMs: parseInt(formData.codingDetails?.timeLimitMs, 10) || 2000,
          memoryLimitMb: parseInt(formData.codingDetails?.memoryLimitMb, 10) || 256,
          starterCodeTemplates: formData.codingDetails?.starterCodeTemplates || '',
          testCases: validTestCases,
        };
      } else {
        payload.codingDetails = null;
        const validOptions = (formData.options || [])
          .filter((o) => o.optionText && o.optionText.trim() !== '')
          .map((o, idx) => ({
            id: o.id,
            optionText: o.optionText.trim(),
            isCorrect: !!o.isCorrect,
            optionOrder: idx + 1,
          }));

        if (validOptions.length < 2) {
          const msg = 'Please provide at least 2 non-empty options.';
          setModalError(msg);
          toast.error(msg, 'Validation Error');
          setSubmitting(false);
          return;
        }

        const correctCount = validOptions.filter((o) => o.isCorrect).length;
        if (formData.questionType === 'MCQ' && correctCount !== 1) {
          const msg = `Please select exactly 1 correct answer for Single Choice (MCQ). (Currently ${correctCount} selected)`;
          setModalError(msg);
          toast.error(msg, 'Validation Error');
          setSubmitting(false);
          return;
        }
        if (formData.questionType === 'MULTIPLE_ANSWER' && correctCount < 1) {
          const msg = 'Please select at least 1 correct answer for Multiple Choice.';
          setModalError(msg);
          toast.error(msg, 'Validation Error');
          setSubmitting(false);
          return;
        }

        payload.options = validOptions;
      }

      let res;
      if (isEditMode) {
        res = await questionApi.updateQuestion(selectedQuestion.id, payload);
      } else {
        res = await questionApi.createQuestion(payload);
      }

      if (res.success) {
        const msg = `Question ${isEditMode ? 'updated' : 'created'} successfully.`;
        toast.success(msg, 'Success');
        setSuccess(msg);
        setIsModalOpen(false);
        fetchQuestions();
        fetchCategories();
      }
    } catch (err) {
      let errMsg = err.message || 'Failed to save question';
      if (err.errors && typeof err.errors === 'object') {
        const errorMsgs = Object.entries(err.errors).map(([k, v]) => `${k}: ${v}`).join(', ');
        errMsg = errorMsgs || errMsg;
      }
      setModalError(errMsg);
      toast.error(errMsg, 'Validation Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuestion = async () => {
    setSubmitting(true);
    try {
      const res = await questionApi.deleteQuestion(selectedQuestion.id);
      if (res.success) {
        const msg = 'Question deleted successfully.';
        toast.success(msg, 'Deleted');
        setSuccess(msg);
        setIsDeleteModalOpen(false);
        fetchQuestions();
      }
    } catch (err) {
      const msg = err.message || 'Failed to delete question';
      setError(msg);
      toast.error(msg, 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  // Option helper handlers
  const handleOptionTextChange = (idx, text) => {
    const opts = [...formData.options];
    opts[idx].optionText = text;
    setFormData({ ...formData, options: opts });
  };

  const handleOptionCorrectToggle = (idx) => {
    const opts = [...formData.options];
    if (formData.questionType === 'MCQ') {
      opts.forEach((o, i) => {
        o.isCorrect = i === idx;
      });
    } else {
      opts[idx].isCorrect = !opts[idx].isCorrect;
    }
    setFormData({ ...formData, options: opts });
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [
        ...formData.options,
        { optionText: '', isCorrect: false, optionOrder: formData.options.length + 1 },
      ],
    });
  };

  const removeOption = (idx) => {
    if (formData.options.length <= 2) return;
    const opts = formData.options.filter((_, i) => i !== idx);
    setFormData({ ...formData, options: opts });
  };

  // TestCase helper handlers
  const addTestCase = () => {
    const cd = { ...formData.codingDetails };
    cd.testCases = [
      ...cd.testCases,
      { inputData: '', expectedOutput: '', isHidden: false, marksWeight: 1.0, orderIndex: cd.testCases.length + 1 },
    ];
    setFormData({ ...formData, codingDetails: cd });
  };

  const removeTestCase = (idx) => {
    const cd = { ...formData.codingDetails };
    if (cd.testCases.length <= 1) return;
    cd.testCases = cd.testCases.filter((_, i) => i !== idx);
    setFormData({ ...formData, codingDetails: cd });
  };

  const handleTestCaseChange = (idx, field, value) => {
    const cd = { ...formData.codingDetails };
    cd.testCases[idx][field] = value;
    setFormData({ ...formData, codingDetails: cd });
  };

  const columns = [
    {
      header: 'Title & Category',
      accessor: 'title',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.title}</div>
          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
            Category: {row.category}
          </div>
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: 'questionType',
      render: (row) => {
        if (row.questionType === 'CODING') return <Badge variant="primary"><Code size={12} /> Coding</Badge>;
        if (row.questionType === 'MULTIPLE_ANSWER') return <Badge variant="warning"><CheckSquare size={12} /> Multi-Ans</Badge>;
        return <Badge variant="secondary"><ListOrdered size={12} /> MCQ</Badge>;
      },
    },
    {
      header: 'Difficulty',
      accessor: 'difficulty',
      render: (row) => {
        const variant = row.difficulty === 'EASY' ? 'success' : row.difficulty === 'MEDIUM' ? 'warning' : 'danger';
        return <Badge variant={variant}>{row.difficulty}</Badge>;
      },
    },
    {
      header: 'Marks',
      accessor: 'marks',
      render: (row) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
          +{row.marks} {row.negativeMarks > 0 && <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>(-{row.negativeMarks})</span>}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => openEditModal(row)}
            title="Edit Question"
          >
            <Edit2 size={14} />
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSelectedQuestion(row);
              setIsDeleteModalOpen(true);
            }}
            title="Delete Question"
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Question Bank</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Author, configure, and maintain MCQs, Multiple-Answer, and Coding assessment challenges.
          </p>
        </div>
        <Button variant="primary" onClick={openCreateModal} icon={Plus}>
          Create Question
        </Button>
      </div>

      {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '1rem' }}>
        <form onSubmit={(e) => { e.preventDefault(); fetchQuestions(); }} style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <Input
              placeholder="Search by title or question text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ width: '180px' }}>
            <select
              className="form-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{ marginBottom: 0 }}
            >
              <option value="">All Question Types</option>
              <option value="MCQ">MCQ</option>
              <option value="MULTIPLE_ANSWER">Multiple Answer</option>
              <option value="CODING">Coding</option>
            </select>
          </div>

          <div style={{ width: '160px' }}>
            <select
              className="form-select"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              style={{ marginBottom: 0 }}
            >
              <option value="">All Difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>

          <div style={{ width: '180px' }}>
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ marginBottom: 0 }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <Button type="submit" variant="primary" icon={Search}>
            Search
          </Button>

          {(searchQuery || selectedType || selectedDifficulty || selectedCategory) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSearchQuery('');
                setSelectedType('');
                setSelectedDifficulty('');
                setSelectedCategory('');
                fetchQuestions('', '', '', '');
              }}
              icon={RefreshCw}
            >
              Reset
            </Button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <DataTable
          columns={columns}
          data={questions}
          loading={loading}
          emptyMessage="No questions found."
        />
      </div>

      {/* Create / Edit Question Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditMode ? 'Edit Assessment Question' : 'Create New Assessment Question'}
        maxWidth="840px"
      >
        <form onSubmit={handleSaveQuestion}>
          {modalError && (
            <Alert variant="danger" onClose={() => setModalError('')}>
              {modalError}
            </Alert>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <Input
              label="Question Title *"
              placeholder="e.g. Java Streams Reduction"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            <Select
              label="Question Type *"
              value={formData.questionType}
              onChange={(e) => setFormData({ ...formData, questionType: e.target.value })}
              options={[
                { value: 'MCQ', label: 'Single Choice (MCQ)' },
                { value: 'MULTIPLE_ANSWER', label: 'Multiple Choice' },
                { value: 'CODING', label: 'Coding Challenge' },
              ]}
              disabled={isEditMode}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
            <Input
              label="Category *"
              placeholder="e.g. Java Core"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            />
            <Select
              label="Difficulty"
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
              options={[
                { value: 'EASY', label: 'Easy' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HARD', label: 'Hard' },
              ]}
            />
            <Input
              label="Positive Marks *"
              type="number"
              step="0.5"
              min="0.5"
              value={formData.marks}
              onChange={(e) => setFormData({ ...formData, marks: parseFloat(e.target.value) || 1 })}
              required
            />
            <Input
              label="Negative Marks"
              type="number"
              step="0.25"
              min="0"
              value={formData.negativeMarks}
              onChange={(e) => setFormData({ ...formData, negativeMarks: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <TextArea
            label="Question Description / Problem Text *"
            placeholder="Type the question content or problem statement here..."
            value={formData.questionText}
            onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
            rows={3}
            required
          />

          {/* Options Builder (for MCQ & Multiple Answer) */}
          {(formData.questionType === 'MCQ' || formData.questionType === 'MULTIPLE_ANSWER') && (
            <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                  Options & Correct Answer Key ({formData.questionType === 'MCQ' ? 'Select 1 correct' : 'Check all correct'})
                </h4>
                <Button type="button" size="sm" variant="secondary" onClick={addOption} icon={Plus}>
                  Add Option
                </Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {formData.options.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type={formData.questionType === 'MCQ' ? 'radio' : 'checkbox'}
                      name="correctOption"
                      checked={opt.isCorrect}
                      onChange={() => handleOptionCorrectToggle(idx)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      title="Mark as correct answer"
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder={`Option ${idx + 1} text...`}
                      value={opt.optionText}
                      onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                      style={{ flex: 1, marginBottom: 0 }}
                      required
                    />
                    {formData.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coding Challenge Details Builder */}
          {formData.questionType === 'CODING' && (
            <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-primary)' }}>
                Coding Sandbox & Test Cases Configuration
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <Input
                  label="Allowed Languages (comma separated)"
                  value={formData.codingDetails.allowedLanguages}
                  onChange={(e) => setFormData({ ...formData, codingDetails: { ...formData.codingDetails, allowedLanguages: e.target.value } })}
                  placeholder="JAVA,PYTHON,CPP,JAVASCRIPT"
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <Input
                    label="Time Limit (ms)"
                    type="number"
                    value={formData.codingDetails.timeLimitMs}
                    onChange={(e) => setFormData({ ...formData, codingDetails: { ...formData.codingDetails, timeLimitMs: parseInt(e.target.value, 10) || 2000 } })}
                  />
                  <Input
                    label="Memory (MB)"
                    type="number"
                    value={formData.codingDetails.memoryLimitMb}
                    onChange={(e) => setFormData({ ...formData, codingDetails: { ...formData.codingDetails, memoryLimitMb: parseInt(e.target.value, 10) || 256 } })}
                  />
                </div>
              </div>

              <TextArea
                label="Constraints"
                placeholder="e.g. 1 <= N <= 10^5, -10^9 <= A[i] <= 10^9"
                value={formData.codingDetails.constraints}
                onChange={(e) => setFormData({ ...formData, codingDetails: { ...formData.codingDetails, constraints: e.target.value } })}
                rows={2}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <TextArea
                  label="Input Format"
                  placeholder="e.g. First line contains integer N..."
                  value={formData.codingDetails.inputFormat}
                  onChange={(e) => setFormData({ ...formData, codingDetails: { ...formData.codingDetails, inputFormat: e.target.value } })}
                  rows={2}
                />
                <TextArea
                  label="Output Format"
                  placeholder="e.g. Print a single integer..."
                  value={formData.codingDetails.outputFormat}
                  onChange={(e) => setFormData({ ...formData, codingDetails: { ...formData.codingDetails, outputFormat: e.target.value } })}
                  rows={2}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <TextArea
                  label="Sample Input"
                  placeholder="e.g. 5&#10;10 45 2 99 30"
                  value={formData.codingDetails.sampleInput}
                  onChange={(e) => setFormData({ ...formData, codingDetails: { ...formData.codingDetails, sampleInput: e.target.value } })}
                  rows={2}
                />
                <TextArea
                  label="Sample Output"
                  placeholder="e.g. 99"
                  value={formData.codingDetails.sampleOutput}
                  onChange={(e) => setFormData({ ...formData, codingDetails: { ...formData.codingDetails, sampleOutput: e.target.value } })}
                  rows={2}
                />
              </div>

              {/* Test Cases Table */}
              <div style={{ marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h5 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Test Cases (Public & Hidden)</h5>
                  <Button type="button" size="sm" variant="secondary" onClick={addTestCase} icon={Plus}>
                    Add Test Case
                  </Button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {formData.codingDetails.testCases.map((tc, idx) => (
                    <div key={idx} style={{ padding: '0.85rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '1fr 1fr 100px 40px', gap: '0.75rem', alignItems: 'center' }}>
                      <textarea
                        className="form-textarea"
                        placeholder="Standard Input (stdin)..."
                        value={tc.inputData}
                        onChange={(e) => handleTestCaseChange(idx, 'inputData', e.target.value)}
                        rows={2}
                        style={{ marginBottom: 0, fontSize: '0.825rem', fontFamily: 'var(--font-mono)' }}
                      />
                      <textarea
                        className="form-textarea"
                        placeholder="Expected Output (stdout)..."
                        value={tc.expectedOutput}
                        onChange={(e) => handleTestCaseChange(idx, 'expectedOutput', e.target.value)}
                        rows={2}
                        style={{ marginBottom: 0, fontSize: '0.825rem', fontFamily: 'var(--font-mono)' }}
                        required
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={tc.isHidden}
                          onChange={(e) => handleTestCaseChange(idx, 'isHidden', e.target.checked)}
                        />
                        Hidden
                      </label>
                      <button
                        type="button"
                        onClick={() => removeTestCase(idx)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <TextArea
            label="Answer Explanation / Recruitment Notes"
            placeholder="Provide context or explanation for recruitment evaluators..."
            value={formData.explanation}
            onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
            rows={2}
            style={{ marginTop: '1rem' }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {isEditMode ? 'Save Changes' : 'Create Question'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Question Dialog */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteQuestion}
        title="Delete Question"
        message={`Are you sure you want to permanently delete question "${selectedQuestion?.title}"?`}
        confirmText="Delete"
        variant="danger"
        loading={submitting}
      />
    </div>
  );
};
