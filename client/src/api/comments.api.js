// src/api/comments.api.js
import api from './axios'

export const commentsApi = {
  getAll: (expenseId) => api.get(`/expenses/${expenseId}/comments`),
  create: (expenseId, content) => api.post(`/expenses/${expenseId}/comments`, { content }),
  delete: (expenseId, commentId) => api.delete(`/expenses/${expenseId}/comments/${commentId}`),
}
