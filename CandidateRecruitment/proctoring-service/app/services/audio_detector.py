import numpy as np
from typing import Dict, Any, Optional
from app.config import settings
from app.schemas.response_schemas import VoiceStatus, AudioAnalysisResult
from app.utils.audio_processing import (
    compute_audio_rms_db,
    compute_vocal_energy_ratio,
    compute_zero_crossing_rate,
    decode_audio_samples
)

class RobustAudioDetector:
    """
    Real-time Acoustic Analysis & Speech Detection Engine.
    Accurately distinguishes silent rooms, ambient hardware/fan noise,
    and actual sustained human speech.
    """
    
    def __init__(self):
        # Per-attempt baseline noise floor cache: {attempt_id: baseline_db}
        self.noise_floors: Dict[int, float] = {}

    def calibrate_baseline(self, attempt_id: Optional[int], samples: np.ndarray) -> float:
        """
        Calibrates the baseline ambient noise level from a sample of quiet room audio.
        """
        if samples is None or len(samples) == 0:
            return -50.0
            
        measured_rms = compute_audio_rms_db(samples)
        # Store reasonable baseline between -70dB and -30dB
        calibrated_baseline = float(np.clip(measured_rms, -70.0, -28.0))
        
        if attempt_id is not None:
            self.noise_floors[attempt_id] = calibrated_baseline
            
        return calibrated_baseline

    def analyze_audio(
        self,
        samples: Optional[np.ndarray],
        attempt_id: Optional[int] = None,
        sample_rate: int = 16000
    ) -> AudioAnalysisResult:
        """
        Evaluates an audio chunk to detect presence of human speech vs silence/ambient noise.
        """
        if samples is None or len(samples) < 64:
            return AudioAnalysisResult(
                status=VoiceStatus.QUIET,
                is_speech=False,
                confidence=0.0,
                rms_db=-75.0,
                baseline_noise_db=-50.0,
                vocal_energy_ratio=0.0,
                message="No audio input / silent."
            )

        # 1. Compute acoustic metrics
        rms_db = compute_audio_rms_db(samples)
        vocal_ratio, spectral_flatness = compute_vocal_energy_ratio(samples, sample_rate)
        zcr = compute_zero_crossing_rate(samples)

        # Retrieve or initialize baseline noise floor
        baseline_db = self.noise_floors.get(attempt_id, -48.0) if attempt_id else -48.0
        
        # Slowly adapt noise floor if audio is quiet
        if rms_db < baseline_db:
            new_baseline = 0.95 * baseline_db + 0.05 * rms_db
            if attempt_id:
                self.noise_floors[attempt_id] = new_baseline
            baseline_db = new_baseline

        # Delta energy above noise floor
        delta_db = rms_db - baseline_db

        # 2. Distinguish: Silence vs Background Noise vs Speech
        # Human speech criteria:
        # - Decibels at least +14 dB above room noise floor
        # - Significant energy in vocal formant band (vocal_ratio > 0.38)
        # - Low spectral flatness (voiced speech has harmonics, not white noise)
        # - Reasonable zero crossing rate (0.02 to 0.35)
        is_speech_signal = (
            rms_db > -42.0 and
            delta_db >= settings.SPEECH_RMS_THRESHOLD_DB and
            vocal_ratio >= 0.35 and
            spectral_flatness < 0.65 and
            0.02 <= zcr <= 0.38
        )

        if is_speech_signal:
            conf = min(0.98, max(0.70, 0.50 + (delta_db / 30.0) * 0.4 + vocal_ratio * 0.2))
            return AudioAnalysisResult(
                status=VoiceStatus.SPEECH_DETECTED,
                is_speech=True,
                confidence=round(conf, 2),
                rms_db=round(rms_db, 1),
                baseline_noise_db=round(baseline_db, 1),
                vocal_energy_ratio=round(vocal_ratio, 3),
                message="Human speech / voice activity detected.",
                confirmed_violation=False,  # Engine will temporally confirm
                violation_type="VOICE_DETECTED",
                violation_severity="MEDIUM"
            )

        # Ambient / Keyboard / Fan Noise
        if delta_db > 8.0 and (spectral_flatness >= 0.65 or vocal_ratio < 0.30 or zcr > 0.40):
            return AudioAnalysisResult(
                status=VoiceStatus.BACKGROUND_NOISE,
                is_speech=False,
                confidence=0.15,
                rms_db=round(rms_db, 1),
                baseline_noise_db=round(baseline_db, 1),
                vocal_energy_ratio=round(vocal_ratio, 3),
                message="Ambient background noise / non-speech sound."
            )

        # Quiet / Normal Baseline
        return AudioAnalysisResult(
            status=VoiceStatus.QUIET,
            is_speech=False,
            confidence=0.0,
            rms_db=round(rms_db, 1),
            baseline_noise_db=round(baseline_db, 1),
            vocal_energy_ratio=round(vocal_ratio, 3),
            message="Microphone level normal and quiet."
        )

audio_detector = RobustAudioDetector()
