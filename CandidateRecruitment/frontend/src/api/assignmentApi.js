import axiosClient from './axiosClient';

export const assignmentApi = {
  assignExam: (data) => axiosClient.post('/admin/assignments', data),
  reassignAssignment: (id, data) => axiosClient.post(`/admin/assignments/${id}/reassign`, data),
  getAssignments: (params) => axiosClient.get('/admin/assignments', { params }),
  deleteAssignment: (id) => axiosClient.delete(`/admin/assignments/${id}`),
};
