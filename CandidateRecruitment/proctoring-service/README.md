# Python AI Proctoring Microservice

> **Enterprise AI Video & Audio Proctoring Microservice for Candidate Examination Platform**

## 📑 Overview
This microservice delivers low-latency, production-grade Computer Vision and Acoustic Voice Activity Detection (VAD) for the Candidate Recruitment Examination platform.

```
React (Webcam / Audio Streams)
    ↓ (HTTP / Base64 Frame & Audio Chunk Telemetry)
FastAPI Python Microservice (:8000)
    ↓ (Confirmed Violation Events & Telemetry)
Java Spring Boot (:8080)
    ↓ (Audit Trail, Strike Rules, Optimistic Locking)
MySQL 8.0 Database
```

---

## 🚀 Key Features

### 1. Robust Computer Vision Face Detection
- **Multi-Cascade & Anthropometric Face Tracking:** Detects face presence with exact bounding boxes `[x, y, width, height, confidence]`.
- **Candidate Away Detection (`FACE_NOT_DETECTED`):** Confirms when a candidate physically leaves the camera.
- **Multiple Faces Detection (`MULTIPLE_FACES`):** Detects if more than one person enters the camera frame.
- **Position & Clarity Verification (`FACE_NOT_CLEAR`):** Detects when the candidate's face is heavily occluded, blurred, off-center, or too close/far.
- **Immediate Recovery:** Instant recovery to `FACE_DETECTED` when candidate returns, dismissing warnings without page reload.

### 2. Calibrated Acoustic VAD (Voice Activity Detection)
- **Dynamic Noise Floor Calibration:** Measures ambient background baseline to eliminate false violations from PC fans, AC hums, and microphone AGC line hiss.
- **Vocal Formant Bandpass (300Hz - 3400Hz):** Differentiates human speech from non-speech background sounds (keyboard typing, mouse clicks).
- **Time-Averaged Speech Accumulation:** Requires sustained speech before escalating to a violation.

### 3. Interactive System Proctoring Pre-Check
- 4-Step pre-assessment readiness wizard (System & Browser Check, Webcam & Face Alignment, Microphone & Room Silence Calibration, Security Agreement) before the exam timer begins.

---

## 🛠️ API Reference

- `GET /api/v1/health` — Microservice health status.
- `POST /api/v1/proctoring/analyze-frame` — Real-time frame face detection.
- `POST /api/v1/proctoring/analyze-audio` — Audio chunk voice activity analysis.
- `POST /api/v1/proctoring/calibrate-audio` — Ambient noise baseline calibration.
- `POST /api/v1/proctoring/telemetry` — Unified video and audio telemetry evaluation.

---

## 🚦 Local Startup

```bash
cd proctoring-service
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
