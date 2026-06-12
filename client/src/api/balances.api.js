// src/api/balances.api.js
import api from './axios'

export const balancesApi = {
  getGroupBalances: (groupId) => api.get(`/groups/${groupId}/balances`),
  getGroupSimplified: (groupId) => api.get(`/groups/${groupId}/balances/simplified`),
  getOverall: () => api.get('/balances'),
}
