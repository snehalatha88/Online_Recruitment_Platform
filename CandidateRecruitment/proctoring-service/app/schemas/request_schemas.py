from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class AnalyzeFrameRequest(BaseModel):
    attempt_id: Optional[int] = Field(None, description="Current exam attempt ID")
    candidate_id: Optional[str] = Field(None, description="Candidate ID / Code")
    image_base64: str = Field(..., description="Base64 encoded JPEG / PNG image frame")
    client_timestamp: Optional[str] = Field(None, description="ISO timestamp from client")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class AnalyzeAudioRequest(BaseModel):
    attempt_id: Optional[int] = Field(None, description="Current exam attempt ID")
    candidate_id: Optional[str] = Field(None, description="Candidate ID / Code")
    audio_base64: Optional[str] = Field(None, description="Base64 encoded WAV/PCM audio chunk")
    audio_samples: Optional[List[float]] = Field(None, description="Float32 array of normalized audio samples [-1.0, 1.0]")
    sample_rate: int = Field(16000, description="Sampling rate in Hz")
    client_timestamp: Optional[str] = Field(None, description="ISO timestamp from client")

class ProctoringTelemetryRequest(BaseModel):
    attempt_id: int = Field(..., description="Current exam attempt ID")
    candidate_id: Optional[str] = Field(None, description="Candidate ID / Code")
    image_base64: Optional[str] = Field(None, description="Base64 encoded video frame")
    audio_samples: Optional[List[float]] = Field(None, description="Audio sample chunk")
    audio_base64: Optional[str] = Field(None, description="Base64 audio chunk")
    sample_rate: int = Field(16000, description="Sampling rate in Hz")
    is_camera_active: bool = Field(True, description="Whether camera stream is active in browser")
    is_mic_active: bool = Field(True, description="Whether mic stream is active in browser")
    client_timestamp: Optional[str] = Field(None, description="ISO timestamp from client")

class CalibrateAudioRequest(BaseModel):
    attempt_id: Optional[int] = Field(None, description="Current exam attempt ID")
    audio_samples: List[float] = Field(..., description="Background ambient noise sample for baseline calibration")
    sample_rate: int = Field(16000, description="Sampling rate in Hz")
