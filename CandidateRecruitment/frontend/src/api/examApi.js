import axiosClient from './axiosClient';

export const examApi = {
  getExams: (params) => axiosClient.get('/admin/exams', { params }),
  getExamById: (id) => axiosClient.get(`/admin/exams/${id}`),
  createExam: (data) => axiosClient.post('/admin/exams', data),
  updateExam: (id, data) => axiosClient.put(`/admin/exams/${id}`, data),
  updateStatus: (id, status) => axiosClient.patch(`/admin/exams/${id}/status`, { status }),
  deleteExam: (id) => axiosClient.delete(`/admin/exams/${id}`),
};
