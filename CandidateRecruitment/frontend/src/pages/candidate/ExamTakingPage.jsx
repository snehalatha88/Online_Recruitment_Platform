import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { takingApi, codingApi, proctoringApi } from '../../api/takingApi';
import { ProctoringCamera, releaseAllProctoringMedia, requestProctoringPermissions } from '../../components/candidate/ProctoringCamera';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Spinner } from '../../components/common/Spinner';
import { Alert } from '../../components/common/Alert';
import { APP_NAME, APP_LOGO_URL } from '../../constants/branding';
import {
  Clock,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Play,
  Save,
  CheckCircle2,
  XCircle,
  Code,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Check,
  LogOut,
  Camera,
} from 'lucide-react';

export const ExamTakingPage = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [examData, setExamData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active exam session state (set to false on submit to immediately release camera/mic hardware)
  const [isExamActive, setIsExamActive] = useState(true);

  // Timer State
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Proctoring Violations, Camera & Voice State
  const [violationCount, setViolationCount] = useState(0);
  const [latestViolationMessage, setLatestViolationMessage] = useState('');
  const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
  const [faceStatus, setFaceStatus] = useState('CHECKING'); // 'CHECKING' | 'DETECTED' | 'AWAY' | 'MULTIPLE' | 'NO_CAMERA' | 'ERROR'
  const [voiceStatus, setVoiceStatus] = useState('QUIET'); // 'QUIET' | 'VOICE_DETECTED' | 'NO_MIC'
  const [isDeviceBlocked, setIsDeviceBlocked] = useState(false);

  // Auto-Submit Countdown Modal State (for Proctoring Warning Limit Exceeded)
  const [isAutoSubmittingModalOpen, setIsAutoSubmittingModalOpen] = useState(false);
  const [autoSubmitCountdown, setAutoSubmitCountdown] = useState(5);
  const autoSubmitTimerRef = useRef(null);
  const isAutoSubmittingRef = useRef(false);

  // Stable callbacks for proctoring camera
  const handleFaceStatusChange = useCallback((status) => {
    setFaceStatus(status);
  }, []);

  const handleVoiceStatusChange = useCallback((status) => {
    setVoiceStatus(status);
  }, []);

  const handleDeviceStatusChange = useCallback(({ isBlocked }) => {
    setIsDeviceBlocked(isBlocked);
  }, []);

  // Global cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSubmitTimerRef.current) {
        clearInterval(autoSubmitTimerRef.current);
      }
    };
  }, []);

  // Startup Permission Grace Window (Prevents false WINDOW_BLUR strikes while browser camera/mic prompt is open)
  const proctoringGraceActiveRef = useRef(true);

  useEffect(() => {
    // 12-second grace period for permissions & device initialization
    const timer = setTimeout(() => {
      proctoringGraceActiveRef.current = false;
    }, 12000);
    return () => clearTimeout(timer);
  }, []);

  // Exit Confirmation Modal (for Back Button & Exit navigation)
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  // Close Window Intent Alert Modal
  const [isCloseWindowModalOpen, setIsCloseWindowModalOpen] = useState(false);

  // Code Editor state
  const [codeLanguage, setCodeLanguage] = useState('JAVA');
  const [codeSource, setCodeSource] = useState('');
  const [runningCode, setRunningCode] = useState(false);
  const [codeRunResult, setCodeRunResult] = useState(null);
  const [savingDraft, setSavingDraft] = useState(false);

  // Submission Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reference to prevent duplicate violation triggers
  const lastViolationTimeRef = useRef(0);

  // Auto-submit examination handler (releases media and navigates to submitted page)
  const handleAutoSubmit = useCallback(async (reason) => {
    setIsExamActive(false);
    // If on a coding question, try to quickly save draft
    if (questions[currentIndex]?.questionType === 'CODING' && codeSource) {
      try {
        await takingApi.saveDraftCode(attemptId, {
          codingQuestionId: questions[currentIndex].codingDetails.id,
          language: codeLanguage,
          sourceCode: codeSource,
        });
      } catch (ignored) {}
    }
    releaseAllProctoringMedia();
    try {
      await takingApi.submitExam(attemptId, reason);
    } catch (err) {
      console.warn('Auto-submit error:', err);
    } finally {
      releaseAllProctoringMedia();
      navigate('/candidate/submitted', { replace: true });
    }
  }, [attemptId, questions, currentIndex, codeLanguage, codeSource, navigate]);

  // Trigger 5-second countdown auto-submit modal when proctoring violation limit is exceeded
  const triggerAutoSubmitOnViolationLimit = useCallback((reasonDesc = '') => {
    if (isAutoSubmittingRef.current) return;
    isAutoSubmittingRef.current = true;

    // Immediately dismiss standard modals
    setIsViolationModalOpen(false);
    setIsSubmitModalOpen(false);
    setIsExitModalOpen(false);
    setIsCloseWindowModalOpen(false);
    setIsAutoSubmittingModalOpen(true);
    setAutoSubmitCountdown(5);

    if (autoSubmitTimerRef.current) {
      clearInterval(autoSubmitTimerRef.current);
    }

    let remaining = 5;
    autoSubmitTimerRef.current = setInterval(() => {
      remaining -= 1;
      setAutoSubmitCountdown(remaining);

      if (remaining <= 0) {
        clearInterval(autoSubmitTimerRef.current);
        autoSubmitTimerRef.current = null;
        handleAutoSubmit('PROCTORING_VIOLATION');
      }
    }, 1000);
  }, [handleAutoSubmit]);

  const handleImmediateAutoSubmit = () => {
    if (autoSubmitTimerRef.current) {
      clearInterval(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }
    handleAutoSubmit('PROCTORING_VIOLATION');
  };

  // Exit and Submit Examination Handler
  const [exitingAndSubmitting, setExitingAndSubmitting] = useState(false);

  const handleExitAndSubmit = async () => {
    setExitingAndSubmitting(true);
    setIsExamActive(false);

    // Save current code draft if on coding question
    if (questions[currentIndex]?.questionType === 'CODING' && codeSource) {
      try {
        await takingApi.saveDraftCode(attemptId, {
          codingQuestionId: questions[currentIndex].codingDetails.id,
          language: codeLanguage,
          sourceCode: codeSource,
        });
      } catch (ignored) {}
    }

    releaseAllProctoringMedia();

    try {
      await takingApi.submitExam(attemptId, 'AUTO_WINDOW_CLOSED');
    } catch (err) {
      console.warn('Exit submit error:', err);
    } finally {
      releaseAllProctoringMedia();
      setIsExitModalOpen(false);
      setIsCloseWindowModalOpen(false);
      navigate('/candidate/submitted', { replace: true });
    }
  };

  // Intercept Back Button, Window Close, & Mouse Exit Intent
  useEffect(() => {
    // Push dummy history entry so back button triggers popstate without leaving
    window.history.pushState({ inExam: true }, '', window.location.href);

    const handlePopState = (e) => {
      if (!isExamActive) {
        navigate('/candidate/submitted', { replace: true });
        return;
      }
      // Re-push state so URL doesn't jump back
      window.history.pushState({ inExam: true }, '', window.location.href);
      setIsExitModalOpen(true);
    };

    const handleBeforeUnload = (e) => {
      if (!isExamActive) return;
      const alertMsg = "If you close the window, then the assessment will auto submit and you won't be able to resume again.";
      e.preventDefault();
      e.returnValue = alertMsg;
      setIsCloseWindowModalOpen(true);
      return alertMsg;
    };

    const handleMouseLeave = (e) => {
      if (!isExamActive) return;
      // If cursor leaves towards the top (tabs/close button) or outside viewport
      if (e.clientY <= 0 || e.clientX < 0 || e.clientX >= window.innerWidth) {
        setIsCloseWindowModalOpen(true);
      }
    };

    const handlePageHide = () => {
      if (!isExamActive) return;
      releaseAllProctoringMedia();
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        fetch(`/api/candidate/attempts/${attemptId}/submit`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ reason: 'AUTO_WINDOW_CLOSED' }),
          keepalive: true,
        });
      } catch (e) {}
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('unload', handlePageHide);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('unload', handlePageHide);
    };
  }, [isExamActive, attemptId, navigate]);

  useEffect(() => {
    loadAttemptData();
  }, [attemptId]);

  const loadAttemptData = async () => {
    try {
      setLoading(true);
      const res = await takingApi.getAttemptState(attemptId);
      if (res.success) {
        setExamData(res.data);
        const qs = res.data.questions || [];
        setQuestions(qs);
        setRemainingSeconds(res.data.remainingSeconds || 0);

        if (qs.length > 0 && qs[0].questionType === 'CODING') {
          initCodeForQuestion(qs[0]);
        }
      }
    } catch (err) {
      const errMsg = err.message || '';
      if (
        errMsg.toLowerCase().includes('already been submitted') ||
        errMsg.toLowerCase().includes('already completed') ||
        errMsg.toLowerCase().includes('finalized')
      ) {
        navigate('/candidate/submitted', { replace: true });
        return;
      }
      setError(err.message || 'Failed to load assessment questions');
    } finally {
      setLoading(false);
    }
  };

  const initCodeForQuestion = (q) => {
    const lang = q.currentLanguage || 'JAVA';
    setCodeLanguage(lang);
    if (q.currentCode) {
      setCodeSource(q.currentCode);
    } else if (q.codingDetails?.starterCodeTemplates) {
      try {
        const templates = JSON.parse(q.codingDetails.starterCodeTemplates);
        setCodeSource(templates[lang] || getDefaultStarter(lang));
      } catch (e) {
        setCodeSource(getDefaultStarter(lang));
      }
    } else {
      setCodeSource(getDefaultStarter(lang));
    }
    setCodeRunResult(null);
  };

  const getDefaultStarter = (lang) => {
    switch (lang) {
      case 'JAVA':
        return 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        // Write your solution here\n    }\n}';
      case 'PYTHON':
        return 'import sys\n\ndef main():\n    # Write your solution here\n    pass\n\nif __name__ == "__main__":\n    main()';
      case 'CPP':
        return '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}';
      case 'JAVASCRIPT':
        return 'const fs = require("fs");\nconst input = fs.readFileSync("/dev/stdin", "utf-8");\n// Write your solution here';
      default:
        return '';
    }
  };

  // Authoritative countdown timer effect
  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit('TIME_EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds, handleAutoSubmit]);

  // Violation reporter
  const reportViolation = useCallback(async (type, desc, severity = 'MEDIUM') => {
    if (isAutoSubmittingRef.current) return;

    const now = Date.now();
    // Debounce violation reports by 2.5s
    if (now - lastViolationTimeRef.current < 2500) return;
    lastViolationTimeRef.current = now;

    try {
      const res = await proctoringApi.reportViolation(attemptId, {
        violationType: type,
        description: desc,
        severity,
      });

      if (res.success && res.data) {
        const v = res.data;
        const newCount = violationCount + 1;
        setViolationCount(newCount);

        const maxViolations = examData?.maxViolations || 3;
        const isLimitExceeded =
          v.actionTaken === 'AUTO_SUBMITTED' ||
          v.actionTaken === 'DISQUALIFIED' ||
          newCount > maxViolations;

        if (isLimitExceeded) {
          setLatestViolationMessage(
            `Maximum proctoring warnings exceeded (${newCount}/${maxViolations}). Assessment will auto-submit.`
          );
          triggerAutoSubmitOnViolationLimit(desc);
        } else {
          setLatestViolationMessage(
            `Security Warning: ${type} detected. Warning strike ${newCount} of ${maxViolations}. Action: ${v.actionTaken}.`
          );
          setIsViolationModalOpen(true);
        }
      }
    } catch (err) {
      console.error('Failed to report violation:', err);
      const errMsg = err?.response?.data?.message || err?.message || '';
      if (
        errMsg.toLowerCase().includes('no longer active') ||
        errMsg.toLowerCase().includes('already been submitted') ||
        errMsg.toLowerCase().includes('already completed')
      ) {
        triggerAutoSubmitOnViolationLimit('Assessment expired or limit exceeded');
      }
    }
  }, [attemptId, violationCount, examData, triggerAutoSubmitOnViolationLimit]);

  // Proctoring listeners
  useEffect(() => {
    if (!examData?.proctoringEnabled) return;

    const handleVisibilityChange = () => {
      if (proctoringGraceActiveRef.current) return;
      if (document.hidden) {
        reportViolation('TAB_SWITCH', 'Candidate switched browser tab or minimized window.', 'HIGH');
      }
    };

    const handleWindowBlur = () => {
      // Ignore blur events while camera/mic browser permission prompts are being interacted with
      if (proctoringGraceActiveRef.current) return;
      reportViolation('WINDOW_BLUR', 'Browser window lost focus.', 'MEDIUM');
    };

    const handleFullScreenChange = () => {
      if (examData.fullScreenRequired && !document.fullscreenElement) {
        reportViolation('FULLSCREEN_EXIT', 'Candidate exited full screen examination mode.', 'HIGH');
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      reportViolation('RIGHT_CLICK', 'Right-click context menu attempt detected.', 'LOW');
    };

    const handleCopy = (e) => {
      reportViolation('COPY_ATTEMPT', 'Clipboard copy attempt detected.', 'LOW');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
    };
  }, [examData, reportViolation]);

  // Request Full Screen Helper
  const requestFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Full screen request denied:', err);
      });
    }
  };

  const currentQ = questions[currentIndex];

  const handleSelectOption = async (optionId) => {
    const q = questions[currentIndex];
    let newAnswer;

    if (q.questionType === 'MCQ') {
      newAnswer = String(optionId);
    } else if (q.questionType === 'MULTIPLE_ANSWER') {
      const currentArr = q.currentAnswer ? q.currentAnswer.split(',').map((s) => s.trim()).filter(Boolean) : [];
      const optStr = String(optionId);
      if (currentArr.includes(optStr)) {
        newAnswer = currentArr.filter((id) => id !== optStr).join(',');
      } else {
        newAnswer = [...currentArr, optStr].join(',');
      }
    }

    const updated = [...questions];
    updated[currentIndex].currentAnswer = newAnswer;
    setQuestions(updated);

    // Save answer to server
    try {
      await takingApi.saveAnswer(attemptId, {
        questionId: q.questionId,
        selectedOptionIds: newAnswer,
        isMarkedForReview: q.isMarkedForReview,
      });
    } catch (err) {
      console.error('Failed to save answer:', err);
    }
  };

  const toggleMarkForReview = async () => {
    const q = questions[currentIndex];
    const updated = [...questions];
    const newStatus = !q.isMarkedForReview;
    updated[currentIndex].isMarkedForReview = newStatus;
    setQuestions(updated);

    try {
      await takingApi.saveAnswer(attemptId, {
        questionId: q.questionId,
        selectedOptionIds: q.currentAnswer || '',
        isMarkedForReview: newStatus,
      });
    } catch (err) {
      console.error('Failed to update review flag:', err);
    }
  };

  const handleRunCode = async () => {
    if (!currentQ || currentQ.questionType !== 'CODING') return;

    setRunningCode(true);
    setCodeRunResult(null);

    try {
      const res = await codingApi.runCode({
        codingQuestionId: currentQ.codingDetails.id,
        language: codeLanguage,
        sourceCode: codeSource,
      });

      if (res.success) {
        setCodeRunResult(res.data);
      }
    } catch (err) {
      setCodeRunResult({
        executionStatus: 'RUNTIME_ERROR',
        passed: false,
        stderr: err.message || 'Execution error in sandbox',
      });
    } finally {
      setRunningCode(false);
    }
  };

  const handleSaveCodeDraft = async () => {
    if (!currentQ || currentQ.questionType !== 'CODING') return;
    setSavingDraft(true);

    try {
      await takingApi.saveDraftCode(attemptId, {
        codingQuestionId: currentQ.codingDetails.id,
        language: codeLanguage,
        sourceCode: codeSource,
      });

      const updated = [...questions];
      updated[currentIndex].currentCode = codeSource;
      updated[currentIndex].currentLanguage = codeLanguage;
      setQuestions(updated);
    } catch (err) {
      console.error('Failed to save code draft:', err);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleNavigateQuestion = (idx) => {
    // If leaving coding question, auto-save draft
    if (currentQ?.questionType === 'CODING') {
      handleSaveCodeDraft();
    }

    setCurrentIndex(idx);
    const targetQ = questions[idx];
    if (targetQ.questionType === 'CODING') {
      initCodeForQuestion(targetQ);
    }
  };

  const handleManualSubmit = async () => {
    setSubmitting(true);
    try {
      // Save current code if on coding question
      if (currentQ?.questionType === 'CODING') {
        await takingApi.saveDraftCode(attemptId, {
          codingQuestionId: currentQ.codingDetails.id,
          language: codeLanguage,
          sourceCode: codeSource,
        });
      }

      await takingApi.submitExam(attemptId, 'MANUAL');
      setIsExamActive(false);
      releaseAllProctoringMedia();
      setIsSubmitModalOpen(false);
      navigate('/candidate/submitted', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to submit examination');
      setSubmitting(false);
    }
  };

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (loading) {
    return <Spinner text="Initializing secure assessment environment..." />;
  }

  const answeredCount = questions.filter((q) => {
    if (q.questionType === 'CODING') return !!q.currentCode;
    return !!q.currentAnswer;
  }).length;

  return (
    <div className="exam-layout">
      {/* Top Header */}
      <header className="exam-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <img
            src={APP_LOGO_URL}
            alt={APP_NAME}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-sm)',
              objectFit: 'cover',
              border: '1px solid var(--border-subtle)',
            }}
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>{examData?.examTitle}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {APP_NAME} Assessment • {questions.length} Total Questions
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {examData?.fullScreenRequired && (
            <Button size="sm" variant="secondary" onClick={requestFullScreen} icon={Maximize}>
              Full Screen
            </Button>
          )}

          {/* Countdown Timer */}
          <div className={`exam-timer ${remainingSeconds < 300 ? 'urgent' : ''}`}>
            <Clock size={18} />
            <span>{formatTimer(remainingSeconds)}</span>
          </div>

          <Button variant="secondary" size="sm" onClick={() => setIsExitModalOpen(true)} icon={LogOut}>
            Exit
          </Button>

          <Button variant="danger" size="sm" onClick={() => setIsSubmitModalOpen(true)}>
            Finish Exam
          </Button>
        </div>
      </header>

      {/* Camera Face Warning Alert Banner */}
      {examData?.proctoringEnabled && (faceStatus === 'AWAY' || faceStatus === 'ERROR') && (
        <div style={{ padding: '0.75rem 1.5rem 0' }}>
          <div className="face-not-detected-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertTriangle size={20} color="#fff" />
              <span>
                <strong>Camera Warning:</strong> Face cannot be detected properly! Please position yourself directly in front of the camera to avoid security strikes.
              </span>
            </div>
            <Badge variant="danger">PROCTORING ALERT</Badge>
          </div>
        </div>
      )}

      {/* Multiple Faces Detected Warning Banner */}
      {examData?.proctoringEnabled && faceStatus === 'MULTIPLE' && (
        <div style={{ padding: '0.75rem 1.5rem 0' }}>
          <div className="face-not-detected-banner" style={{ background: '#b91c1c', border: '1px solid #ef4444' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertTriangle size={20} color="#fff" />
              <span>
                <strong>Security Alert:</strong> More than 1 face detected in camera! Only one candidate is allowed in the camera frame during the examination.
              </span>
            </div>
            <Badge variant="danger">MULTI-FACE ALERT</Badge>
          </div>
        </div>
      )}

      {/* Device Disabled / Mic or Camera Off Warning Banner */}
      {examData?.proctoringEnabled && (faceStatus === 'NO_CAMERA' || (isDeviceBlocked && (faceStatus === 'ERROR' || faceStatus === 'NO_CAMERA'))) && (
        <div style={{ padding: '0.75rem 1.5rem 0' }}>
          <div className="face-not-detected-banner" style={{ background: '#991b1b', border: '1px solid #ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertTriangle size={20} color="#fff" />
              <span>
                <strong>Device Required:</strong> Webcam and microphone access are mandatory for proctoring. Please allow permissions in your browser.
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Button
                size="sm"
                variant="primary"
                onClick={async () => {
                  try {
                    await requestProctoringPermissions();
                    setFaceStatus('CHECKING');
                    setIsDeviceBlocked(false);
                  } catch (e) {
                    console.warn('Manual permission request failed:', e);
                  }
                }}
                style={{ background: '#ffffff', color: '#991b1b', border: 'none', fontWeight: 700 }}
              >
                Allow Camera & Mic
              </Button>
              <Badge variant="danger">DEVICES REQUIRED</Badge>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Voice Detection Warning Banner */}
      {examData?.proctoringEnabled && voiceStatus === 'VOICE_DETECTED' && (
        <div style={{ padding: '0.75rem 1.5rem 0' }}>
          <div className="voice-detected-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertTriangle size={20} color="#fff" />
              <span>
                <strong>Voice Warning:</strong> Speech or voice activity detected. Please maintain complete silence during the examination.
              </span>
            </div>
            <Badge variant="danger">AUDIO STRIKE</Badge>
          </div>
        </div>
      )}

      {/* Main Assessment Body */}
      <div className="exam-main">
        {/* Left Pane: Question & Code Area */}
        <div className="exam-content-pane">
          {error && <Alert variant="danger">{error}</Alert>}

          {/* Question Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                Question {currentIndex + 1} of {questions.length}
              </span>
              <Badge variant="secondary">{currentQ?.questionType}</Badge>
              <Badge variant={currentQ?.difficulty === 'EASY' ? 'success' : currentQ?.difficulty === 'MEDIUM' ? 'warning' : 'danger'}>
                {currentQ?.difficulty}
              </Badge>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 600 }}>
                +{currentQ?.marks} Marks
              </span>
              <Button
                variant={currentQ?.isMarkedForReview ? 'primary' : 'secondary'}
                size="sm"
                onClick={toggleMarkForReview}
                icon={Bookmark}
              >
                {currentQ?.isMarkedForReview ? 'Marked' : 'Mark for Review'}
              </Button>
            </div>
          </div>

          {/* Question Statement */}
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              {currentQ?.title}
            </h3>
            <div style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
              {currentQ?.questionText}
            </div>
          </div>

          {/* MCQ Options Display */}
          {(currentQ?.questionType === 'MCQ' || currentQ?.questionType === 'MULTIPLE_ANSWER') && (
            <div className="card">
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                {currentQ.questionType === 'MCQ' ? 'Select 1 correct option:' : 'Select all options that apply:'}
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {currentQ.options?.map((opt, idx) => {
                  const selectedArr = currentQ.currentAnswer ? currentQ.currentAnswer.split(',').map((s) => s.trim()) : [];
                  const isChecked = selectedArr.includes(String(opt.id));

                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectOption(opt.id)}
                      style={{
                        padding: '1rem 1.25rem',
                        borderRadius: 'var(--radius-md)',
                        background: isChecked ? 'var(--color-primary-light)' : 'var(--bg-elevated)',
                        border: isChecked ? '2px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: currentQ.questionType === 'MCQ' ? '50%' : '6px',
                          border: `2px solid ${isChecked ? 'var(--color-primary)' : 'var(--border-strong)'}`,
                          background: isChecked ? 'var(--color-primary)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          flexShrink: 0,
                        }}
                      >
                        {isChecked && <Check size={14} />}
                      </div>

                      <div style={{ fontSize: '0.95rem', fontWeight: isChecked ? 600 : 400 }}>
                        {opt.optionText}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Coding Challenge Interface */}
          {currentQ?.questionType === 'CODING' && currentQ.codingDetails && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Constraints & Sample I/O */}
              <div className="card" style={{ padding: '1.25rem', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)' }}>
                {currentQ.codingDetails.constraints && (
                  <div style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--color-warning)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>Constraints:</span>
                    </div>
                    <code style={{ display: 'block', background: '#070b14', color: '#fde68a', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245, 158, 11, 0.3)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {currentQ.codingDetails.constraints}
                    </code>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {currentQ.codingDetails.sampleInput && (
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>Sample Input:</span>
                      </div>
                      <pre style={{ margin: 0, padding: '0.75rem 1rem', background: '#070b14', color: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(56, 189, 248, 0.3)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                        {currentQ.codingDetails.sampleInput}
                      </pre>
                    </div>
                  )}

                  {currentQ.codingDetails.sampleOutput && (
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4ade80', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>Sample Output:</span>
                      </div>
                      <pre style={{ margin: 0, padding: '0.75rem 1rem', background: '#070b14', color: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(74, 222, 128, 0.3)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                        {currentQ.codingDetails.sampleOutput}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Code Editor Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Language:</label>
                  <select
                    className="form-select"
                    value={codeLanguage}
                    onChange={(e) => {
                      const newLang = e.target.value;
                      setCodeLanguage(newLang);
                      setCodeSource(getDefaultStarter(newLang));
                    }}
                    style={{ width: '160px', marginBottom: 0 }}
                  >
                    <option value="JAVA">Java</option>
                    <option value="PYTHON">Python 3</option>
                    <option value="CPP">C++</option>
                    <option value="JAVASCRIPT">JavaScript</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Button variant="secondary" size="sm" onClick={handleSaveCodeDraft} loading={savingDraft} icon={Save}>
                    Save Draft
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleRunCode} loading={runningCode} icon={Play}>
                    Run Public Tests
                  </Button>
                </div>
              </div>

              {/* Monaco Code Editor */}
              <div style={{ height: '360px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-medium)' }}>
                <Editor
                  height="100%"
                  language={codeLanguage === 'CPP' ? 'cpp' : codeLanguage.toLowerCase()}
                  theme="vs-dark"
                  value={codeSource}
                  onChange={(val) => setCodeSource(val || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                  }}
                />
              </div>

              {/* Execution Output Console */}
              {codeRunResult && (
                <div className="card" style={{ background: 'var(--bg-surface)', padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Code size={16} />
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Compiler Execution Output</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {codeRunResult.executionTimeMs} ms
                      </span>
                      <Badge variant={codeRunResult.passed ? 'success' : 'danger'}>
                        {codeRunResult.executionStatus}
                      </Badge>
                    </div>
                  </div>

                  {codeRunResult.testCaseResults?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {codeRunResult.testCaseResults.map((tc) => (
                        <div
                          key={tc.testCaseIndex}
                          style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-elevated)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.825rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {tc.passed ? <CheckCircle2 size={16} color="var(--color-success)" /> : <XCircle size={16} color="var(--color-danger)" />}
                            <span>Test Case #{tc.testCaseIndex}</span>
                          </div>
                          <div>
                            {tc.passed ? (
                              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Passed</span>
                            ) : (
                              <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Failed (Expected: {tc.expectedOutput}, Got: {tc.actualOutput || 'No output'})</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : codeRunResult.stderr || codeRunResult.compileErrors ? (
                    <pre style={{ margin: 0, padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 'var(--radius-sm)', color: '#fca5a5', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {codeRunResult.compileErrors || codeRunResult.stderr}
                    </pre>
                  ) : (
                    <pre style={{ margin: 0, padding: '0.75rem 1rem', background: '#070b14', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', color: '#f8fafc', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {codeRunResult.stdout || 'Program executed without standard output.'}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Navigation Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <Button
              variant="secondary"
              onClick={() => handleNavigateQuestion(currentIndex - 1)}
              disabled={currentIndex === 0}
              icon={ChevronLeft}
            >
              Previous
            </Button>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {currentIndex < questions.length - 1 ? (
                <Button
                  variant="primary"
                  onClick={() => handleNavigateQuestion(currentIndex + 1)}
                >
                  Save & Next <ChevronRight size={18} />
                </Button>
              ) : (
                <Button
                  variant="success"
                  onClick={() => setIsSubmitModalOpen(true)}
                >
                  Review & Finish Assessment
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right Pane: Camera Proctoring & Question Palette */}
        <aside className="exam-palette-pane">
          {/* Real-time AI Camera Proctoring Widget (Permanently Fixed Sticky Header) */}
          {examData?.proctoringEnabled && (
            <div className="proctoring-camera-sticky-container">
              <ProctoringCamera
                enabled={isExamActive && examData.proctoringEnabled}
                attemptId={attemptId}
                onViolation={reportViolation}
                onFaceStatusChange={handleFaceStatusChange}
                onVoiceStatusChange={handleVoiceStatusChange}
                onDeviceStatusChange={handleDeviceStatusChange}
                candidateName={examData.candidateFullName || 'Candidate'}
              />
            </div>
          )}

          {/* Scrollable Question Palette Area */}
          <div className="exam-palette-scrollable">
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.4rem' }}>
                Question Palette
              </h4>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {answeredCount} of {questions.length} answered
              </div>
            </div>

            {/* Palette Grid */}
            <div className="palette-grid">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = q.questionType === 'CODING' ? !!q.currentCode : !!q.currentAnswer;
                const isReview = q.isMarkedForReview;

                let btnClass = 'palette-btn';
                if (isCurrent) btnClass += ' current';
                if (isReview) btnClass += ' review';
                else if (isAnswered) btnClass += ' answered';

                return (
                  <button
                    key={q.questionId}
                    className={btnClass}
                    onClick={() => handleNavigateQuestion(idx)}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'var(--color-success)' }} />
                <span>Answered</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'var(--color-warning)' }} />
                <span>Marked for Review</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)' }} />
                <span>Unanswered</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: '2px solid var(--color-primary)' }} />
                <span>Current Question</span>
              </div>
            </div>

            {/* Security / Proctoring Status Widget */}
            {examData?.proctoringEnabled && (
              <div style={{ marginTop: 'auto', padding: '0.85rem 1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: violationCount > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  <ShieldAlert size={16} />
                  <span>Security Integrity: {violationCount} Strikes</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Limit: {examData.maxViolations} strikes max.
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Proctoring Violation Alert Modal */}
      <Modal
        isOpen={isViolationModalOpen}
        onClose={() => setIsViolationModalOpen(false)}
        title="Examination Proctoring Warning"
        maxWidth="500px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Alert variant="danger" title={`Security Strike #${violationCount}`}>
            {latestViolationMessage}
          </Alert>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Please return to your assessment immediately. Remaining in another application or tab will lead to automated disqualification.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Button variant="primary" onClick={() => setIsViolationModalOpen(false)}>
              I Understand, Continue Assessment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Maximum Proctoring Warnings Exceeded - 5s Auto Submit Modal */}
      <Modal
        isOpen={isAutoSubmittingModalOpen}
        onClose={() => {}}
        title="Proctoring Warning Limit Exceeded"
        maxWidth="540px"
        closable={false}
        closeOnBackdrop={false}
        closeOnEsc={false}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center', padding: '0.5rem 0' }}>
          {/* Animated Warning Shield Icon */}
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              background: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              border: '2px solid var(--color-danger-border)',
              boxShadow: '0 0 25px rgba(239, 68, 68, 0.35)',
            }}
          >
            <ShieldAlert size={44} />
          </div>

          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Maximum Proctoring Warnings Exceeded
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6 }}>
              Due to reaching the maximum allowed proctoring warnings (
              <strong style={{ color: 'var(--color-danger)' }}>
                {violationCount} of {examData?.maxViolations || 3} strikes
              </strong>
              ), your assessment is automatically submitting in <strong>{autoSubmitCountdown} seconds</strong>.
            </p>
          </div>

          {/* Live 5-Second Countdown Container */}
          <div
            style={{
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              border: '1px solid var(--color-danger-border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700 }}>
              Auto-Submitting Examination In
            </div>

            <div
              style={{
                fontSize: '3.5rem',
                fontWeight: 900,
                color: 'var(--color-danger)',
                lineHeight: 1,
                fontFamily: 'var(--font-mono)',
                textShadow: '0 0 16px rgba(239, 68, 68, 0.4)',
              }}
            >
              0{autoSubmitCountdown}s
            </div>

            {/* Countdown Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(Math.max(0, autoSubmitCountdown) / 5) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #ef4444, #f59e0b)',
                  borderRadius: '4px',
                  transition: 'width 1s linear',
                }}
              />
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              All saved responses & code drafts are being securely recorded.
            </div>
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <Button
              variant="danger"
              size="lg"
              onClick={handleImmediateAutoSubmit}
              style={{ width: '100%', fontWeight: 700 }}
            >
              Submit Assessment Immediately ({autoSubmitCountdown}s)
            </Button>
          </div>
        </div>
      </Modal>

      {/* Close Window Warning Modal */}
      <Modal
        isOpen={isCloseWindowModalOpen}
        onClose={() => !exitingAndSubmitting && setIsCloseWindowModalOpen(false)}
        title="⚠️ Warning: Do Not Close Window"
        maxWidth="560px"
        closable={!exitingAndSubmitting}
        closeOnBackdrop={false}
        closeOnEsc={false}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Alert variant="danger" title="Active Assessment Auto-Submit Alert">
            <strong>Warning:</strong> If you close the window, then the assessment will auto submit and you won't be able to resume again.
          </Alert>

          <div
            style={{
              padding: '1.1rem',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}
          >
            <div>• Your assessment session is active and strictly proctored.</div>
            <div>• Closing this tab, closing the browser window, or navigating away will immediately auto-submit and finalize your examination.</div>
            <div>• <strong>You will NOT be permitted to resume or re-enter this assessment.</strong></div>
            <div style={{ marginTop: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              Please remain in this window and continue answering your questions.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setIsCloseWindowModalOpen(false);
                requestFullScreen();
              }}
              disabled={exitingAndSubmitting}
            >
              Stay & Continue Assessment
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleExitAndSubmit}
              loading={exitingAndSubmitting}
              icon={LogOut}
            >
              Close & Auto-Submit Now
            </Button>
          </div>
        </div>
      </Modal>

      {/* Exit & Permanent Submission Warning Modal */}
      <Modal
        isOpen={isExitModalOpen}
        onClose={() => !exitingAndSubmitting && setIsExitModalOpen(false)}
        title="Exit Examination Warning"
        maxWidth="560px"
        closable={!exitingAndSubmitting}
        closeOnBackdrop={false}
        closeOnEsc={false}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Alert variant="danger" title="Leaving Will Finalize & Auto-Submit Assessment">
            <strong>Warning:</strong> If you close the window or exit, then the assessment will auto submit and you won't be able to resume again.
          </Alert>
          <div
            style={{
              padding: '1.1rem',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}
          >
            <div>• All answers saved up to this point will be finalized and evaluated.</div>
            <div>• Your assessment will be permanently submitted and marked as completed.</div>
            <div>• <strong>You will not be able to resume this assessment from the dashboard.</strong></div>
            <div style={{ marginTop: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              If you wish to continue taking the test, please click <strong>"Stay & Continue Assessment"</strong>.
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button
              variant="primary"
              onClick={() => setIsExitModalOpen(false)}
              disabled={exitingAndSubmitting}
            >
              Stay & Continue Assessment
            </Button>
            <Button
              variant="danger"
              onClick={handleExitAndSubmit}
              loading={exitingAndSubmitting}
              icon={LogOut}
            >
              Exit & Auto-Submit Now
            </Button>
          </div>
        </div>
      </Modal>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Confirm Examination Submission"
        maxWidth="520px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Answered</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-success)' }}>
                {answeredCount}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Unanswered</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: questions.length - answeredCount > 0 ? 'var(--color-warning)' : 'var(--text-muted)' }}>
                {questions.length - answeredCount}
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Are you sure you want to finalize your examination? Once submitted, your answers cannot be altered.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={() => setIsSubmitModalOpen(false)} disabled={submitting}>
              Back to Assessment
            </Button>
            <Button variant="danger" onClick={handleManualSubmit} loading={submitting}>
              Confirm & Submit Exam
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
