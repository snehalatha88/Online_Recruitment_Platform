import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  UserCheck,
  UserX,
  Users,
  AlertTriangle,
  RefreshCw,
  Mic,
  MicOff,
  Eye,
  Volume2,
} from 'lucide-react';
import { Button } from '../common/Button';
import { proctoringAiApi } from '../../api/proctoringAiApi';

// Global media track registry to guarantee no orphaned media tracks persist in the browser
if (typeof window !== 'undefined') {
  window.__activeProctoringStreams = window.__activeProctoringStreams || new Set();
}

export const releaseAllProctoringMedia = () => {
  try {
    if (typeof window !== 'undefined') {
      if (window.__activeProctoringStreams) {
        window.__activeProctoringStreams.forEach((stream) => {
          try {
            if (stream && stream.getTracks) {
              stream.getTracks().forEach((track) => {
                try {
                  track.stop();
                  track.enabled = false;
                } catch (e) {}
              });
            }
          } catch (e) {}
        });
        window.__activeProctoringStreams.clear();
      }
      if (window.__activeProctoringStream) {
        try {
          if (window.__activeProctoringStream.getTracks) {
            window.__activeProctoringStream.getTracks().forEach((track) => {
              try {
                track.stop();
                track.enabled = false;
              } catch (e) {}
            });
          }
        } catch (e) {}
        window.__activeProctoringStream = null;
      }
      if (window.__activeAudioContext && window.__activeAudioContext.state !== 'closed') {
        try {
          window.__activeAudioContext.close().catch(() => {});
        } catch (e) {}
        window.__activeAudioContext = null;
      }
    }
  } catch (ignored) {}
};

// Standalone helper for pre-checking / requesting permissions during user clicks
export const requestProctoringPermissions = async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Media devices API is not supported in this browser.');
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: true,
    });
  } catch (e1) {}

  try {
    return await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
  } catch (e2) {}

  try {
    return await navigator.mediaDevices.getUserMedia({
      video: true,
    });
  } catch (e3) {}

  return await navigator.mediaDevices.getUserMedia({
    audio: true,
  });
};

export const ProctoringCamera = ({
  onViolation,
  onFaceStatusChange,
  onVoiceStatusChange,
  onDeviceStatusChange,
  enabled = true,
  attemptId = 0,
  candidateName = 'Candidate',
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const isMountedRef = useRef(true);
  const isInitializingRef = useRef(false);

  // Stable callback refs
  const onViolationRef = useRef(onViolation);
  onViolationRef.current = onViolation;

  const onFaceStatusChangeRef = useRef(onFaceStatusChange);
  onFaceStatusChangeRef.current = onFaceStatusChange;

  const onVoiceStatusChangeRef = useRef(onVoiceStatusChange);
  onVoiceStatusChangeRef.current = onVoiceStatusChange;

  const onDeviceStatusChangeRef = useRef(onDeviceStatusChange);
  onDeviceStatusChangeRef.current = onDeviceStatusChange;

  // Audio Context & Analyser refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioAnimationRef = useRef(null);
  const audioChunkTimerRef = useRef(null);
  const frameAnalysisTimerRef = useRef(null);

  // Device & Monitoring States
  const [hasCamera, setHasCamera] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [cameraError, setCameraError] = useState('');
  
  // Face Detection state (FACE_DETECTED | FACE_NOT_DETECTED | FACE_NOT_CLEAR | MULTIPLE_FACES | CAMERA_UNAVAILABLE | ERROR | CHECKING)
  const [faceStatus, setFaceStatus] = useState('CHECKING');
  const [faceConfidence, setFaceConfidence] = useState(95);
  const [faceMessage, setFaceMessage] = useState('');

  // Audio state (QUIET | SPEECH_DETECTED | BACKGROUND_NOISE | NO_MIC)
  const [voiceStatus, setVoiceStatus] = useState('QUIET');
  const [eqLevels, setEqLevels] = useState([4, 6, 5, 7, 4]); // 5 VU level bars

  // Debouncing & Confirmation Tracking
  const lastViolationReportedRef = useRef({});
  const isCooldownExpired = (type, cooldownMs = 8000) => {
    const now = Date.now();
    const last = lastViolationReportedRef.current[type] || 0;
    return now - last > cooldownMs;
  };
  const recordViolationReported = (type) => {
    lastViolationReportedRef.current[type] = Date.now();
  };

  // Complete cleanup function
  const stopCameraAndAudio = useCallback(() => {
    if (frameAnalysisTimerRef.current) {
      clearInterval(frameAnalysisTimerRef.current);
      frameAnalysisTimerRef.current = null;
    }
    if (audioChunkTimerRef.current) {
      clearInterval(audioChunkTimerRef.current);
      audioChunkTimerRef.current = null;
    }
    if (audioAnimationRef.current) {
      cancelAnimationFrame(audioAnimationRef.current);
      audioAnimationRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
        }
      } catch (ignored) {}
      audioContextRef.current = null;
    }
    // Only detach video element, do not kill global active stream during component lifecycle
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch (ignored) {}
    }
  }, []);

  // Setup Audio Frequency Analysis & AI Speech Stream
  const setupAudioAnalyser = useCallback((stream) => {
    try {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        if (isMountedRef.current) {
          setHasAudio(false);
          setVoiceStatus('NO_MIC');
        }
        onVoiceStatusChangeRef.current?.('NO_MIC');
        return;
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      window.__activeAudioContext = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      if (isMountedRef.current) {
        setHasAudio(true);
        setVoiceStatus('QUIET');
      }
      onVoiceStatusChangeRef.current?.('QUIET');

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Visual VU Equalizer animation loop
      const checkAudioLoop = () => {
        if (!analyserRef.current || !isMountedRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Visual equalizer levels (5 bands with noise floor damping)
        const b1 = Math.max(3, Math.min(16, (dataArray[2] / 255) * 16));
        const b2 = Math.max(3, Math.min(16, (dataArray[6] / 255) * 16));
        const b3 = Math.max(3, Math.min(16, (dataArray[12] / 255) * 16));
        const b4 = Math.max(3, Math.min(16, (dataArray[20] / 255) * 16));
        const b5 = Math.max(3, Math.min(16, (dataArray[30] / 255) * 16));
        if (isMountedRef.current) {
          setEqLevels([b1, b2, b3, b4, b5]);
        }

        audioAnimationRef.current = requestAnimationFrame(checkAudioLoop);
      };

      audioAnimationRef.current = requestAnimationFrame(checkAudioLoop);

      // Periodic AI Audio Chunk Analysis (every 1.2 seconds)
      audioChunkTimerRef.current = setInterval(async () => {
        if (!analyserRef.current || !isMountedRef.current) return;
        
        try {
          const buffer = new Float32Array(analyserRef.current.fftSize);
          analyserRef.current.getFloatTimeDomainData(buffer);
          const sampleList = Array.from(buffer);

          const aiAudioRes = await proctoringAiApi.analyzeAudio({
            audioSamples: sampleList,
            attemptId,
            sampleRate: audioCtx.sampleRate || 16000,
          });

          if (aiAudioRes.success && aiAudioRes.data && isMountedRef.current) {
            const data = aiAudioRes.data;
            const newVoiceStatus = data.status === 'SPEECH_DETECTED' ? 'VOICE_DETECTED' : 'QUIET';
            setVoiceStatus(newVoiceStatus);
            onVoiceStatusChangeRef.current?.(newVoiceStatus);

            if (data.confirmed_violation && data.violation_type) {
              if (isCooldownExpired('VOICE_DETECTED', 10000)) {
                recordViolationReported('VOICE_DETECTED');
                onViolationRef.current?.(
                  'VOICE_DETECTED',
                  data.message || 'Human speech detected during examination. Please maintain silence.',
                  data.violation_severity || 'MEDIUM'
                );
              }
            }
          }
        } catch (audioErr) {
          // Silent catch for periodic audio poll
        }
      }, 1200);

    } catch (e) {
      console.warn('Audio proctoring initialization error:', e);
      if (isMountedRef.current) {
        setHasAudio(false);
        setVoiceStatus('NO_MIC');
      }
      onVoiceStatusChangeRef.current?.('NO_MIC');
    }
  }, [attemptId]);

  // Start combined camera and audio stream
  const startCameraAndAudio = useCallback(async () => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    if (isMountedRef.current) {
      setCameraError('');
      setFaceStatus('CHECKING');
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera and microphone access APIs are not supported in this browser.');
      }

      // 1. First check if a live stream is already available and active from Pre-Check
      let stream = null;
      if (
        window.__activeProctoringStream &&
        window.__activeProctoringStream.getVideoTracks().length > 0 &&
        window.__activeProctoringStream.getVideoTracks().some((t) => t.readyState === 'live')
      ) {
        stream = window.__activeProctoringStream;
      } else {
        stream = await requestProctoringPermissions();
      }

      if (!isMountedRef.current) {
        return;
      }

      streamRef.current = stream;
      if (window.__activeProctoringStreams) {
        window.__activeProctoringStreams.add(stream);
      }
      window.__activeProctoringStream = stream;

      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();


      // Track lifecycle listeners
      videoTracks.forEach((track) => {
        track.onended = () => {
          if (!isMountedRef.current) return;
          setHasCamera(false);
          setFaceStatus('NO_CAMERA');
          setCameraError('Webcam was disconnected or turned off.');
          onFaceStatusChangeRef.current?.('NO_CAMERA');
          onDeviceStatusChangeRef.current?.({ hasCamera: false, hasAudio: audioTracks.length > 0, isBlocked: true });
          if (isCooldownExpired('CAMERA_UNAVAILABLE')) {
            recordViolationReported('CAMERA_UNAVAILABLE');
            onViolationRef.current?.('CAMERA_UNAVAILABLE', 'Webcam was disconnected or disabled during assessment.', 'HIGH');
          }
        };
      });

      audioTracks.forEach((track) => {
        track.onended = () => {
          if (!isMountedRef.current) return;
          setHasAudio(false);
          setVoiceStatus('NO_MIC');
          onVoiceStatusChangeRef.current?.('NO_MIC');
          if (isCooldownExpired('MIC_UNAVAILABLE')) {
            recordViolationReported('MIC_UNAVAILABLE');
            onViolationRef.current?.('MIC_UNAVAILABLE', 'Microphone was disconnected or disabled.', 'MEDIUM');
          }
        };
      });

      // Bind stream to video DOM element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current && isMountedRef.current) {
            videoRef.current.play().catch(() => {});
          }
        };
        videoRef.current.play().catch(() => {});
      }

      if (isMountedRef.current) {
        setHasCamera(videoTracks.length > 0);
        setCameraError('');
      }

      if (audioTracks.length > 0) {
        setupAudioAnalyser(stream);
      } else {
        if (isMountedRef.current) {
          setHasAudio(false);
          setVoiceStatus('NO_MIC');
        }
        onVoiceStatusChangeRef.current?.('NO_MIC');
      }

      onDeviceStatusChangeRef.current?.({
        hasCamera: videoTracks.length > 0,
        hasAudio: audioTracks.length > 0,
        isBlocked: false,
      });

      // Start Python AI Computer Vision loop
      startAiFaceDetectionLoop();

    } catch (err) {
      console.warn('Media devices initialization failed:', err);
      if (isMountedRef.current) {
        setHasCamera(false);
        setHasAudio(false);
        const isPermissionDenied =
          err.name === 'NotAllowedError' ||
          err.name === 'PermissionDeniedError' ||
          err.message?.toLowerCase().includes('denied');
        const errMsg = isPermissionDenied
          ? 'Camera/Microphone permission was denied. Please allow permissions in your address bar.'
          : 'Webcam/Microphone not accessible. Please ensure your device is connected.';
        setCameraError(errMsg);
        setFaceStatus('ERROR');
      }
      onFaceStatusChangeRef.current?.('NO_CAMERA');
      onVoiceStatusChangeRef.current?.('NO_MIC');
      onDeviceStatusChangeRef.current?.({ hasCamera: false, hasAudio: false, isBlocked: true });
      if (isCooldownExpired('CAMERA_UNAVAILABLE')) {
        recordViolationReported('CAMERA_UNAVAILABLE');
        onViolationRef.current?.('CAMERA_UNAVAILABLE', 'Camera/Microphone access unavailable or denied.', 'HIGH');
      }
    } finally {
      isInitializingRef.current = false;
    }
  }, [stopCameraAndAudio, setupAudioAnalyser]);

  // AI Face Detection Loop
  const startAiFaceDetectionLoop = () => {
    if (frameAnalysisTimerRef.current) {
      clearInterval(frameAnalysisTimerRef.current);
    }

    const runAiFrameAnalysis = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !isMountedRef.current || video.readyState < 2) return;

      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      try {
        // Render current video frame to snapshot canvas
        const snapCanvas = document.createElement('canvas');
        const snapW = 320;
        const snapH = 240;
        snapCanvas.width = snapW;
        snapCanvas.height = snapH;
        const snapCtx = snapCanvas.getContext('2d');
        snapCtx.drawImage(video, 0, 0, snapW, snapH);
        const imageBase64 = snapCanvas.toDataURL('image/jpeg', 0.7);

        // Send to Python AI Proctoring Service
        const aiRes = await proctoringAiApi.analyzeFrame({
          imageBase64,
          attemptId,
        });

        if (aiRes.success && aiRes.data && isMountedRef.current) {
          const data = aiRes.data;
          
          let frontendFaceStatus = 'DETECTED';
          if (data.status === 'FACE_NOT_DETECTED') frontendFaceStatus = 'AWAY';
          else if (data.status === 'MULTIPLE_FACES') frontendFaceStatus = 'MULTIPLE';
          else if (data.status === 'FACE_NOT_CLEAR') frontendFaceStatus = 'UNCLEAR';
          else if (data.status === 'CAMERA_UNAVAILABLE') frontendFaceStatus = 'NO_CAMERA';

          setFaceStatus(frontendFaceStatus);
          setFaceConfidence(Math.round(data.confidence * 100));
          setFaceMessage(data.message || '');
          onFaceStatusChangeRef.current?.(frontendFaceStatus);

          // Draw visual bounding box & reticle
          ctx.save();
          ctx.translate(width, 0);
          ctx.scale(-1, 1);

          if (data.bounding_boxes && data.bounding_boxes.length > 0) {
            data.bounding_boxes.forEach((box) => {
              const scaleX = width / snapW;
              const scaleY = height / snapH;
              const bx = box.x * scaleX;
              const by = box.y * scaleY;
              const bw = box.width * scaleX;
              const bh = box.height * scaleY;

              ctx.strokeStyle = data.status === 'MULTIPLE_FACES' ? '#ef4444' : '#10b981';
              ctx.lineWidth = 2.5;
              ctx.strokeRect(bx, by, bw, bh);

              // Draw corner brackets
              const cl = 12;
              ctx.beginPath();
              ctx.moveTo(bx, by + cl); ctx.lineTo(bx, by); ctx.lineTo(bx + cl, by);
              ctx.moveTo(bx + bw - cl, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cl);
              ctx.moveTo(bx, by + bh - cl); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cl, by + bh);
              ctx.moveTo(bx + bw - cl, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cl);
              ctx.stroke();
            });
          } else {
            // Draw red dashed targeting frame when face is away
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            const tw = width * 0.55;
            const th = height * 0.7;
            const tx = (width - tw) / 2;
            const ty = (height - th) / 2;
            ctx.strokeRect(tx, ty, tw, th);
          }
          ctx.restore();

          // Report confirmed violation if Python engine escalated
          if (data.confirmed_violation && data.violation_type) {
            if (isCooldownExpired(data.violation_type, 8000)) {
              recordViolationReported(data.violation_type);
              onViolationRef.current?.(
                data.violation_type,
                data.message || `Proctoring violation: ${data.violation_type}`,
                data.violation_severity || 'MEDIUM'
              );
            }
          }
        }
      } catch (err) {
        console.warn('AI Frame analysis loop error:', err);
      }
    };

    frameAnalysisTimerRef.current = setInterval(runAiFrameAnalysis, 850);
    runAiFrameAnalysis();
  };

  // Main lifecycle effect
  useEffect(() => {
    isMountedRef.current = true;
    if (enabled) {
      startCameraAndAudio();
    } else {
      stopCameraAndAudio();
    }

    return () => {
      isMountedRef.current = false;
      stopCameraAndAudio();
    };
  }, [enabled, startCameraAndAudio, stopCameraAndAudio]);

  // Ensure video element is bound to stream when mounted or updated
  useEffect(() => {
    const s = streamRef.current || window.__activeProctoringStream;
    if (videoRef.current && s && videoRef.current.srcObject !== s) {
      videoRef.current.srcObject = s;
      videoRef.current.play().catch(() => {});
    }
  }, [hasCamera]);

  return (
    <div className={`proctoring-camera-card ${faceStatus === 'AWAY' || faceStatus === 'ERROR' || faceStatus === 'MULTIPLE' || faceStatus === 'NO_CAMERA' || voiceStatus === 'VOICE_DETECTED' ? 'warning' : ''}`}>
      {/* Video Feed Wrapper */}
      <div
        className="camera-feed-wrapper"
        style={{
          position: 'relative',
          width: '100%',
          height: '180px',
          background: '#0a0f1d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <div className="camera-rec-badge">
          <span className="camera-rec-dot" />
          <span>AI PROCTORING ACTIVE</span>
        </div>

        {/* Video feed element */}
        <video
          ref={videoRef}
          className="camera-feed-video"
          muted
          playsInline
          autoPlay
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: hasCamera && !cameraError ? 1 : 0,
            transform: 'scaleX(-1)',
            zIndex: 1,
          }}
        />
        <canvas
          ref={canvasRef}
          className="camera-overlay-canvas"
          width={240}
          height={180}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            display: hasCamera && !cameraError ? 'block' : 'none',
            zIndex: 2,
          }}
        />

        {/* Fallback Display if camera initializing or error */}
        {(!hasCamera || cameraError) && (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#cbd5e1', zIndex: 3, position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
              <CameraOff size={28} color="#ef4444" />
              <div style={{ fontSize: '0.75rem', color: '#fca5a5', lineHeight: 1.35, maxWidth: '210px' }}>
                {cameraError || 'Camera & Microphone access is required.'}
              </div>
              <Button
                size="sm"
                variant="primary"
                icon={RefreshCw}
                onClick={startCameraAndAudio}
                style={{ marginTop: '0.35rem', fontSize: '0.72rem', padding: '0.35rem 0.65rem' }}
              >
                Turn On Camera & Mic
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Face Status Bar */}
      <div className="camera-status-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Face:</span>
          {faceStatus === 'DETECTED' && (
            <span className="face-status-pill detected">
              <UserCheck size={13} />
              Verified ({faceConfidence}%)
            </span>
          )}
          {faceStatus === 'AWAY' && (
            <span className="face-status-pill away">
              <UserX size={13} />
              Not Detected
            </span>
          )}
          {faceStatus === 'UNCLEAR' && (
            <span className="face-status-pill" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
              <AlertTriangle size={13} />
              Position Unclear
            </span>
          )}
          {faceStatus === 'MULTIPLE' && (
            <span className="face-status-pill multiple" style={{ background: '#7f1d1d', color: '#fecaca', border: '1px solid #ef4444', animation: 'pulse 1.5s infinite' }}>
              <Users size={13} />
              ⚠️ Multiple Faces
            </span>
          )}
          {faceStatus === 'CHECKING' && (
            <span className="face-status-pill" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
              AI Analyzing...
            </span>
          )}
          {(faceStatus === 'ERROR' || faceStatus === 'NO_CAMERA') && (
            <span className="face-status-pill away">
              <AlertTriangle size={13} />
              Camera Disabled
            </span>
          )}
        </div>

        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {candidateName}
        </div>
      </div>

      {/* Real-time Voice & Audio Monitoring Bar */}
      <div className="audio-monitor-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {hasAudio ? (
            <Mic size={14} color={voiceStatus === 'VOICE_DETECTED' ? '#ef4444' : '#10b981'} />
          ) : (
            <MicOff size={14} color="#ef4444" />
          )}
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Audio:</span>

          {voiceStatus === 'QUIET' && (
            <span className="audio-status-pill quiet">
              Quiet
            </span>
          )}
          {voiceStatus === 'VOICE_DETECTED' && (
            <span className="audio-status-pill voice-detected">
              Voice Detected
            </span>
          )}
          {voiceStatus === 'NO_MIC' && (
            <span className="audio-status-pill" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              Mic Disabled
            </span>
          )}
        </div>

        {/* Live Equalizer Bars */}
        <div className="audio-equalizer" title="Live Audio Input Level">
          {eqLevels.map((lvl, idx) => (
            <div
              key={idx}
              className={`audio-eq-bar ${voiceStatus === 'VOICE_DETECTED' ? 'active-voice' : ''}`}
              style={{ height: `${lvl}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
