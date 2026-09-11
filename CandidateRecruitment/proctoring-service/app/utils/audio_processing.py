import base64
import struct
import numpy as np
from typing import List, Tuple, Optional

def decode_audio_samples(
    audio_base64: Optional[str] = None,
    audio_samples: Optional[List[float]] = None
) -> Optional[np.ndarray]:
    """
    Converts either base64 PCM/WAV or a list of float32 samples into a 1D numpy array of float32.
    """
    if audio_samples is not None and len(audio_samples) > 0:
        return np.array(audio_samples, dtype=np.float32)
        
    if not audio_base64:
        return None
        
    try:
        if "," in audio_base64:
            audio_base64 = audio_base64.split(",", 1)[1]
            
        raw_bytes = base64.b64decode(audio_base64)
        
        # Check if WAV header is present (starts with 'RIFF')
        if raw_bytes.startswith(b'RIFF') and len(raw_bytes) > 44:
            raw_bytes = raw_bytes[44:]  # Skip 44-byte WAV header
            
        # Try converting 16-bit PCM to float32
        sample_count = len(raw_bytes) // 2
        if sample_count > 0:
            int16_samples = struct.unpack(f"<{sample_count}h", raw_bytes[:sample_count * 2])
            float_samples = np.array(int16_samples, dtype=np.float32) / 32768.0
            return float_samples
            
        return None
    except Exception:
        return None

def compute_audio_rms_db(samples: np.ndarray) -> float:
    """
    Calculates Root Mean Square (RMS) energy in decibels (dBFS).
    Returns value typically from -80.0 dB (silent) to 0.0 dB (maximum).
    """
    if len(samples) == 0:
        return -80.0
        
    rms = np.sqrt(np.mean(samples ** 2) + 1e-12)
    rms_db = 20.0 * np.log10(rms + 1e-12)
    return float(np.clip(rms_db, -80.0, 0.0))

def compute_vocal_energy_ratio(samples: np.ndarray, sample_rate: int = 16000) -> Tuple[float, float]:
    """
    Calculates the proportion of energy concentrated in the human vocal formant band (250Hz - 3400Hz)
    versus total spectral energy.
    Returns: (vocal_ratio, spectral_flatness)
    """
    if len(samples) < 128:
        return 0.0, 1.0
        
    # Apply Hanning window
    windowed = samples * np.hanning(len(samples))
    
    # Compute FFT magnitude spectrum
    fft_vals = np.abs(np.fft.rfft(windowed))
    freqs = np.fft.rfftfreq(len(samples), 1.0 / sample_rate)
    
    # Vocal formant mask: 250 Hz to 3400 Hz
    vocal_mask = (freqs >= 250) & (freqs <= 3400)
    
    vocal_energy = np.sum(fft_vals[vocal_mask] ** 2)
    total_energy = np.sum(fft_vals ** 2) + 1e-12
    
    vocal_ratio = float(vocal_energy / total_energy)
    
    # Spectral flatness (geometric mean / arithmetic mean): High for white noise, low for voiced speech
    power_spectrum = fft_vals ** 2 + 1e-12
    geometric_mean = np.exp(np.mean(np.log(power_spectrum)))
    arithmetic_mean = np.mean(power_spectrum)
    spectral_flatness = float(geometric_mean / arithmetic_mean) if arithmetic_mean > 0 else 1.0
    
    return vocal_ratio, spectral_flatness

def compute_zero_crossing_rate(samples: np.ndarray) -> float:
    """
    Calculates Zero Crossing Rate (ZCR).
    Voice typically has moderate ZCR (0.04 - 0.25), whereas high hiss has > 0.4.
    """
    if len(samples) < 2:
        return 0.0
    zero_crossings = np.sum(np.abs(np.diff(np.sign(samples)))) / (2.0 * len(samples))
    return float(zero_crossings)
