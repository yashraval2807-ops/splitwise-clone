// src/api/settlements.api.js
import api from './axios'

export const settlementsApi = {
  create: (data) => api.post('/settlements', data),
  getAll: () => api.get('/settlements'),
  getGroupSettlements: (groupId) => api.get(`/groups/${groupId}/settlements`),
}
