import os
import sys
from fastapi import FastAPI, HTTPException, Security, status, Depends, Request
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import numpy as np

from app.config import settings
from app.schemas.request_schemas import (
    AnalyzeFrameRequest,
    AnalyzeAudioRequest,
    ProctoringTelemetryRequest,
    CalibrateAudioRequest
)
from app.schemas.response_schemas import (
    FaceAnalysisResult,
    AudioAnalysisResult,
    ProctoringTelemetryResult,
    HealthResponse
)
from app.services.proctoring_engine import proctoring_engine
from app.services.audio_detector import audio_detector

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Enterprise AI Video & Audio Proctoring Microservice for Candidate Assessment Platform"
)

# Enable CORS for Frontend and Spring Boot
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def verify_api_key(api_key: str = Security(api_key_header)):
    # If API key is configured and client sent an invalid key, reject
    if settings.API_KEY and api_key and api_key != settings.API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or unauthorized Proctoring API Key."
        )
    return True

@app.get("/api/v1/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="UP",
        version=settings.APP_VERSION,
        models_ready=True,
        service="Candidate Recruitment AI Proctoring Engine"
    )

@app.post(
    "/api/v1/proctoring/analyze-frame",
    response_model=FaceAnalysisResult,
    dependencies=[Depends(verify_api_key)]
)
def analyze_frame(request: AnalyzeFrameRequest):
    """
    Evaluates a single camera image frame for face detection, centering, clarity, and multiple faces.
    """
    return proctoring_engine.analyze_frame(
        image_base64=request.image_base64,
        attempt_id=request.attempt_id
    )

@app.post(
    "/api/v1/proctoring/analyze-audio",
    response_model=AudioAnalysisResult,
    dependencies=[Depends(verify_api_key)]
)
def analyze_audio(request: AnalyzeAudioRequest):
    """
    Evaluates audio samples or base64 PCM chunk for human speech activity vs baseline noise.
    """
    return proctoring_engine.analyze_audio(
        audio_base64=request.audio_base64,
        audio_samples=request.audio_samples,
        attempt_id=request.attempt_id,
        sample_rate=request.sample_rate
    )

@app.post(
    "/api/v1/proctoring/calibrate-audio",
    dependencies=[Depends(verify_api_key)]
)
def calibrate_audio(request: CalibrateAudioRequest):
    """
    Calibrates baseline ambient noise floor for a candidate's environment.
    """
    samples_np = np.array(request.audio_samples, dtype=np.float32)
    baseline_db = audio_detector.calibrate_baseline(request.attempt_id, samples_np)
    return {
        "success": True,
        "baseline_noise_db": round(baseline_db, 1),
        "message": "Ambient noise floor successfully calibrated."
    }

@app.post(
    "/api/v1/proctoring/telemetry",
    response_model=ProctoringTelemetryResult,
    dependencies=[Depends(verify_api_key)]
)
def process_telemetry(request: ProctoringTelemetryRequest):
    """
    Unified endpoint processing synchronized video and audio proctoring data.
    """
    return proctoring_engine.process_telemetry(
        attempt_id=request.attempt_id,
        image_base64=request.image_base64,
        audio_samples=request.audio_samples,
        audio_base64=request.audio_base64,
        sample_rate=request.sample_rate,
        is_camera_active=request.is_camera_active,
        is_mic_active=request.is_mic_active
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
