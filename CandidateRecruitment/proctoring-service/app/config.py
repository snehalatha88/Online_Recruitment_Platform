import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "Agivant AI Proctoring Service"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    
    # Server settings
    HOST: str = os.getenv("PROCTORING_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PROCTORING_PORT", "8000"))
    API_KEY: str = os.getenv("PROCTORING_API_KEY", "default-proctoring-secret-key-2026")
    DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")
    
    # Face Detection Thresholds
    FACE_MIN_CONFIDENCE: float = float(os.getenv("FACE_MIN_CONFIDENCE", "0.45"))
    FACE_ABSENCE_CONFIRMATION_FRAMES: int = int(os.getenv("FACE_ABSENCE_CONFIRMATION_FRAMES", "3"))
    FACE_MULTIPLE_CONFIRMATION_FRAMES: int = int(os.getenv("FACE_MULTIPLE_CONFIRMATION_FRAMES", "2"))
    FACE_BLUR_THRESHOLD: float = float(os.getenv("FACE_BLUR_THRESHOLD", "30.0"))
    FACE_MIN_COVERAGE_RATIO: float = float(os.getenv("FACE_MIN_COVERAGE_RATIO", "0.012"))
    FACE_MAX_COVERAGE_RATIO: float = float(os.getenv("FACE_MAX_COVERAGE_RATIO", "0.85"))
    
    # Audio & Speech Detection Thresholds
    AUDIO_SAMPLE_RATE: int = int(os.getenv("AUDIO_SAMPLE_RATE", "16000"))
    SPEECH_RMS_THRESHOLD_DB: float = float(os.getenv("SPEECH_RMS_THRESHOLD_DB", "14.0"))
    SPEECH_SUSTAINED_FRAMES: int = int(os.getenv("SPEECH_SUSTAINED_FRAMES", "3"))
    
    # Cooldown
    VIOLATION_COOLDOWN_SECONDS: int = int(os.getenv("VIOLATION_COOLDOWN_SECONDS", "8"))

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
