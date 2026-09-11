from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum

class FaceStatus(str, Enum):
    FACE_DETECTED = "FACE_DETECTED"
    FACE_NOT_DETECTED = "FACE_NOT_DETECTED"
    FACE_NOT_CLEAR = "FACE_NOT_CLEAR"
    MULTIPLE_FACES = "MULTIPLE_FACES"
    CAMERA_UNAVAILABLE = "CAMERA_UNAVAILABLE"

class VoiceStatus(str, Enum):
    QUIET = "QUIET"
    SPEECH_DETECTED = "SPEECH_DETECTED"
    BACKGROUND_NOISE = "BACKGROUND_NOISE"
    MIC_UNAVAILABLE = "MIC_UNAVAILABLE"
    AUDIO_ERROR = "AUDIO_ERROR"

class ViolationType(str, Enum):
    FACE_NOT_DETECTED = "FACE_NOT_DETECTED"
    FACE_NOT_CLEAR = "FACE_NOT_CLEAR"
    MULTIPLE_FACES = "MULTIPLE_FACES"
    VOICE_DETECTED = "VOICE_DETECTED"
    CAMERA_UNAVAILABLE = "CAMERA_UNAVAILABLE"
    MIC_UNAVAILABLE = "MIC_UNAVAILABLE"

class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int
    confidence: float
    is_primary: bool = True

class FaceAnalysisResult(BaseModel):
    status: FaceStatus
    face_count: int
    confidence: float
    bounding_boxes: List[BoundingBox] = []
    is_centered: bool = True
    center_offset_x: float = 0.0
    center_offset_y: float = 0.0
    coverage_ratio: float = 0.0
    is_clear: bool = True
    clarity_score: float = 100.0
    message: str
    confirmed_violation: bool = False
    violation_type: Optional[ViolationType] = None
    violation_severity: Optional[str] = None

class AudioAnalysisResult(BaseModel):
    status: VoiceStatus
    is_speech: bool = False
    confidence: float = 0.0
    rms_db: float = -60.0
    baseline_noise_db: float = -50.0
    vocal_energy_ratio: float = 0.0
    message: str
    confirmed_violation: bool = False
    violation_type: Optional[ViolationType] = None
    violation_severity: Optional[str] = None

class ProctoringTelemetryResult(BaseModel):
    overall_status: str  # "NORMAL" | "WARNING" | "VIOLATION"
    face: FaceAnalysisResult
    audio: AudioAnalysisResult
    should_report_violation: bool = False
    violation_type: Optional[ViolationType] = None
    violation_description: Optional[str] = None
    violation_severity: Optional[str] = None
    timestamp: str

class HealthResponse(BaseModel):
    status: str
    version: str
    models_ready: bool
    service: str
