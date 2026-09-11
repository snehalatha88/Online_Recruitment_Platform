import axiosClient from './axiosClient';

export const candidateApi = {
  getCandidates: (params) => axiosClient.get('/admin/candidates', { params }),
  getCandidateById: (id) => axiosClient.get(`/admin/candidates/${id}`),
  createCandidate: (data) => axiosClient.post('/admin/candidates', data),
  updateCandidate: (id, data) => axiosClient.put(`/admin/candidates/${id}`, data),
  toggleStatus: (id, status) => axiosClient.patch(`/admin/candidates/${id}/status`, { status }),
  resetPassword: (id, newPassword) => axiosClient.post(`/admin/candidates/${id}/reset-password`, { newPassword }),
  deleteCandidate: (id) => axiosClient.delete(`/admin/candidates/${id}`),
  getDepartments: () => axiosClient.get('/admin/candidates/departments'),
  getCandidateExamDetails: (id) => axiosClient.get(`/admin/candidates/${id}/exam-details`),
};
