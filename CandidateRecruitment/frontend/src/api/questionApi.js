import axiosClient from './axiosClient';

export const questionApi = {
  getQuestions: (params) => axiosClient.get('/admin/questions', { params }),
  getQuestionById: (id) => axiosClient.get(`/admin/questions/${id}`),
  createQuestion: (data) => axiosClient.post('/admin/questions', data),
  updateQuestion: (id, data) => axiosClient.put(`/admin/questions/${id}`, data),
  deleteQuestion: (id) => axiosClient.delete(`/admin/questions/${id}`),
  getCategories: () => axiosClient.get('/admin/questions/categories'),
};
