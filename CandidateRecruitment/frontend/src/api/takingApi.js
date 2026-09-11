import axiosClient from './axiosClient';

export const takingApi = {
  getAssignedExams: () => axiosClient.get('/candidate/exams'),
  startExam: (examId) => axiosClient.post(`/candidate/exams/${examId}/start`),
  getAttemptState: (attemptId) => axiosClient.get(`/candidate/attempts/${attemptId}`),
  saveAnswer: (attemptId, data) => axiosClient.post(`/candidate/attempts/${attemptId}/answers`, data),
  saveDraftCode: (attemptId, data) => axiosClient.post(`/candidate/attempts/${attemptId}/draft-code`, data),
  submitExam: (attemptId, reason) => axiosClient.post(`/candidate/attempts/${attemptId}/submit`, { reason }),
};

export const codingApi = {
  runCode: (data) => axiosClient.post('/candidate/coding/run', data),
};

export const proctoringApi = {
  reportViolation: (attemptId, data) => axiosClient.post(`/candidate/attempts/${attemptId}/violations`, data),
};

export const resultApi = {
  getResults: (params) => axiosClient.get('/admin/results', { params }),
  getAttemptDetail: (attemptId) => axiosClient.get(`/admin/results/${attemptId}`),
  getDashboardStats: () => axiosClient.get('/admin/dashboard/stats'),
  getAuditLogs: (params) => axiosClient.get('/admin/dashboard/audit-logs', { params }),
  getAuditActions: () => axiosClient.get('/admin/dashboard/audit-actions'),
};
