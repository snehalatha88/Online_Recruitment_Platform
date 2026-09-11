import time
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from app.config import settings
from app.schemas.response_schemas import (
    FaceStatus,
    VoiceStatus,
    FaceAnalysisResult,
    AudioAnalysisResult,
    ProctoringTelemetryResult
)
from app.services.face_detector import face_detector
from app.services.audio_detector import audio_detector
from app.utils.image_processing import decode_base64_image
from app.utils.audio_processing import decode_audio_samples

class AttemptProctoringState:
    """
    Maintains per-attempt temporal state and debouncing timers.
    """
    def __init__(self, attempt_id: int):
        self.attempt_id = attempt_id
        self.consecutive_no_face = 0
        self.consecutive_multiple_faces = 0
        self.consecutive_speech = 0
        self.consecutive_bad_clarity = 0
        self.last_violation_time: Dict[str, float] = {}
        self.last_face_status: FaceStatus = FaceStatus.FACE_DETECTED
        self.last_voice_status: VoiceStatus = VoiceStatus.QUIET

    def is_cooldown_expired(self, violation_type: str) -> bool:
        now = time.time()
        last_time = self.last_violation_time.get(violation_type, 0.0)
        return (now - last_time) >= settings.VIOLATION_COOLDOWN_SECONDS

    def record_violation_reported(self, violation_type: str):
        self.last_violation_time[violation_type] = time.time()

class ProctoringEngine:
    """
    Core Proctoring Orchestrator. Coordinates computer vision, acoustic processing,
    temporal debouncing, and violation confirmation.
    """
    def __init__(self):
        self.sessions: Dict[int, AttemptProctoringState] = {}

    def get_or_create_session(self, attempt_id: Optional[int]) -> AttemptProctoringState:
        aid = attempt_id or 0
        if aid not in self.sessions:
            self.sessions[aid] = AttemptProctoringState(aid)
        return self.sessions[aid]

    def analyze_frame(
        self,
        image_base64: str,
        attempt_id: Optional[int] = None
    ) -> FaceAnalysisResult:
        """
        Processes a video frame and applies temporal confirmation filters.
        """
        img_np = decode_base64_image(image_base64)
        if img_np is None:
            return FaceAnalysisResult(
                status=FaceStatus.CAMERA_UNAVAILABLE,
                face_count=0,
                confidence=0.0,
                message="Unable to decode camera frame image."
            )

        result = face_detector.detect_faces(img_np)
        session = self.get_or_create_session(attempt_id)

        # 1. Candidate Away / No Face Temporal Tracking
        if result.status == FaceStatus.FACE_NOT_DETECTED:
            session.consecutive_no_face += 1
            session.consecutive_multiple_faces = 0
            
            # Confirmed absence after N consecutive frames
            if session.consecutive_no_face >= settings.FACE_ABSENCE_CONFIRMATION_FRAMES:
                if session.is_cooldown_expired("FACE_NOT_DETECTED"):
                    result.confirmed_violation = True
                    result.violation_type = "FACE_NOT_DETECTED"
                    result.violation_severity = "MEDIUM"
                    result.message = "Candidate face is not visible. Please return to the camera view immediately."
        
        # 2. Multiple Faces Temporal Tracking
        elif result.status == FaceStatus.MULTIPLE_FACES:
            session.consecutive_multiple_faces += 1
            session.consecutive_no_face = 0
            
            if session.consecutive_multiple_faces >= settings.FACE_MULTIPLE_CONFIRMATION_FRAMES:
                if session.is_cooldown_expired("MULTIPLE_FACES"):
                    result.confirmed_violation = True
                    result.violation_type = "MULTIPLE_FACES"
                    result.violation_severity = "HIGH"
        
        # 3. Face Detected / Restored
        elif result.status == FaceStatus.FACE_DETECTED:
            session.consecutive_no_face = 0
            session.consecutive_multiple_faces = 0
            session.consecutive_bad_clarity = 0
            result.confirmed_violation = False

        # 4. Face Not Clear
        elif result.status == FaceStatus.FACE_NOT_CLEAR:
            session.consecutive_no_face = 0
            session.consecutive_multiple_faces = 0
            session.consecutive_bad_clarity += 1
            
            if session.consecutive_bad_clarity >= (settings.FACE_ABSENCE_CONFIRMATION_FRAMES + 2):
                if session.is_cooldown_expired("FACE_NOT_CLEAR"):
                    result.confirmed_violation = True
                    result.violation_type = "FACE_NOT_CLEAR"
                    result.violation_severity = "LOW"

        session.last_face_status = result.status
        return result

    def analyze_audio(
        self,
        audio_base64: Optional[str] = None,
        audio_samples: Optional[list] = None,
        attempt_id: Optional[int] = None,
        sample_rate: int = 16000
    ) -> AudioAnalysisResult:
        """
        Processes audio input and applies temporal voice accumulation filters.
        """
        samples_np = decode_audio_samples(audio_base64, audio_samples)
        result = audio_detector.analyze_audio(samples_np, attempt_id, sample_rate)
        session = self.get_or_create_session(attempt_id)

        if result.status == VoiceStatus.SPEECH_DETECTED:
            session.consecutive_speech += 1
            
            # Require sustained speech (N frames) before flagging violation
            if session.consecutive_speech >= settings.SPEECH_SUSTAINED_FRAMES:
                if session.is_cooldown_expired("VOICE_DETECTED"):
                    result.confirmed_violation = True
                    result.violation_type = "VOICE_DETECTED"
                    result.violation_severity = "MEDIUM"
                    result.message = "Sustained human speech detected. Please maintain silence."
        else:
            # Fast decay of speech counter when silence/noise
            session.consecutive_speech = max(0, session.consecutive_speech - 1)
            result.confirmed_violation = False

        session.last_voice_status = result.status
        return result

    def process_telemetry(
        self,
        attempt_id: int,
        image_base64: Optional[str] = None,
        audio_samples: Optional[list] = None,
        audio_base64: Optional[str] = None,
        sample_rate: int = 16000,
        is_camera_active: bool = True,
        is_mic_active: bool = True
    ) -> ProctoringTelemetryResult:
        """
        Combines simultaneous video frame and audio chunk telemetry.
        """
        session = self.get_or_create_session(attempt_id)
        now_iso = datetime.now(timezone.utc).isoformat()

        # Check Hardware Stream Track States
        if not is_camera_active:
            face_res = FaceAnalysisResult(
                status=FaceStatus.CAMERA_UNAVAILABLE,
                face_count=0,
                confidence=0.0,
                message="Webcam stream is inactive or disconnected.",
                confirmed_violation=session.is_cooldown_expired("CAMERA_UNAVAILABLE"),
                violation_type="CAMERA_UNAVAILABLE",
                violation_severity="HIGH"
            )
        elif image_base64:
            face_res = self.analyze_frame(image_base64, attempt_id)
        else:
            face_res = FaceAnalysisResult(
                status=FaceStatus.FACE_DETECTED,
                face_count=1,
                confidence=0.90,
                message="Camera OK."
            )

        if not is_mic_active:
            audio_res = AudioAnalysisResult(
                status=VoiceStatus.MIC_UNAVAILABLE,
                is_speech=False,
                confidence=0.0,
                message="Microphone stream is inactive or disconnected.",
                confirmed_violation=session.is_cooldown_expired("MIC_UNAVAILABLE"),
                violation_type="MIC_UNAVAILABLE",
                violation_severity="MEDIUM"
            )
        elif audio_samples or audio_base64:
            audio_res = self.analyze_audio(audio_base64, audio_samples, attempt_id, sample_rate)
        else:
            audio_res = AudioAnalysisResult(
                status=VoiceStatus.QUIET,
                is_speech=False,
                confidence=0.0,
                message="Audio normal."
            )

        # Determine overall state and whether to trigger backend violation
        should_report = False
        v_type = None
        v_desc = None
        v_sev = None

        if face_res.confirmed_violation and face_res.violation_type:
            should_report = True
            v_type = face_res.violation_type
            v_desc = face_res.message
            v_sev = face_res.violation_severity or "MEDIUM"
            session.record_violation_reported(v_type)
        elif audio_res.confirmed_violation and audio_res.violation_type:
            should_report = True
            v_type = audio_res.violation_type
            v_desc = audio_res.message
            v_sev = audio_res.violation_severity or "MEDIUM"
            session.record_violation_reported(v_type)

        overall = "NORMAL"
        if should_report:
            overall = "VIOLATION"
        elif face_res.status in (FaceStatus.FACE_NOT_DETECTED, FaceStatus.FACE_NOT_CLEAR, FaceStatus.MULTIPLE_FACES) or audio_res.status == VoiceStatus.SPEECH_DETECTED:
            overall = "WARNING"

        return ProctoringTelemetryResult(
            overall_status=overall,
            face=face_res,
            audio=audio_res,
            should_report_violation=should_report,
            violation_type=v_type,
            violation_description=v_desc,
            violation_severity=v_sev,
            timestamp=now_iso
        )

proctoring_engine = ProctoringEngine()
