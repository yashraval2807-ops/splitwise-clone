// src/api/expenses.api.js
import api from './axios'

export const expensesApi = {
  create: (groupId, data) => api.post(`/groups/${groupId}/expenses`, data),
  getAll: (groupId) => api.get(`/groups/${groupId}/expenses`),
  getById: (groupId, id) => api.get(`/groups/${groupId}/expenses/${id}`),
  update: (groupId, id, data) => api.put(`/groups/${groupId}/expenses/${id}`, data),
  delete: (groupId, id) => api.delete(`/groups/${groupId}/expenses/${id}`),
}
