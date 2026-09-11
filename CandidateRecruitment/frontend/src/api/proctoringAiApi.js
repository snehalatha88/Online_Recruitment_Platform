import axios from 'axios';

const aiClient = axios.create({
  baseURL: import.meta.env.VITE_AI_PROCTORING_URL || '/ai-proctoring',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'default-proctoring-secret-key-2026',
  },
  timeout: 5000,
});

export const proctoringAiApi = {
  checkHealth: async () => {
    try {
      const res = await aiClient.get('/health');
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.message || 'AI Proctoring Service Unreachable' };
    }
  },

  analyzeFrame: async ({ imageBase64, attemptId, metadata = {} }) => {
    try {
      const res = await aiClient.post('/proctoring/analyze-frame', {
        image_base64: imageBase64,
        attempt_id: attemptId,
        client_timestamp: new Date().toISOString(),
        metadata,
      });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  analyzeAudio: async ({ audioSamples, audioBase64, attemptId, sampleRate = 16000 }) => {
    try {
      const res = await aiClient.post('/proctoring/analyze-audio', {
        audio_samples: audioSamples,
        audio_base64: audioBase64,
        attempt_id: attemptId,
        sample_rate: sampleRate,
        client_timestamp: new Date().toISOString(),
      });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  calibrateAudio: async ({ audioSamples, attemptId, sampleRate = 16000 }) => {
    try {
      const res = await aiClient.post('/proctoring/calibrate-audio', {
        audio_samples: audioSamples,
        attempt_id: attemptId,
        sample_rate: sampleRate,
      });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  sendTelemetry: async (telemetryPayload) => {
    try {
      const res = await aiClient.post('/proctoring/telemetry', {
        ...telemetryPayload,
        client_timestamp: new Date().toISOString(),
      });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
