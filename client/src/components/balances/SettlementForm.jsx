// src/components/balances/SettlementForm.jsx
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { settlementsApi } from '../../api/settlements.api'
import { Button } from '../common/Button'
import { Input, Select } from '../common/Input'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency } from '../../utils/currency'

export function SettlementForm({ group, suggestedAmount = '', suggestedTo = '', onClose }) {
  const { user } = useAuth()
  const qc = useQueryClient()

  const otherMembers = group.members?.filter((m) => m.user?.id !== user?.id) || []

  const [form, setForm] = useState({
    receivedById: suggestedTo || otherMembers[0]?.user?.id || '',
    amount: suggestedAmount || '',
    notes: '',
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      settlementsApi.create({
        groupId: group.id,
        receivedById: form.receivedById,
        amount: Number(form.amount),
        notes: form.notes.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-balances', group.id] })
      qc.invalidateQueries({ queryKey: ['group-simplified', group.id] })
      qc.invalidateQueries({ queryKey: ['settlements'] })
      qc.invalidateQueries({ queryKey: ['overall-balances'] })
      onClose()
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to record settlement'),
  })

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.receivedById) { setError('Select who you paid'); return }
    if (!form.amount || Number(form.amount) <= 0) { setError('Enter a valid amount'); return }
    mutation.mutate()
  }

  const recipient = group.members?.find((m) => m.user?.id === form.receivedById)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-brand-50 rounded-xl p-3 text-center">
        <p className="text-sm text-brand-700">
          Recording a payment <span className="font-semibold">from you</span> to{' '}
          <span className="font-semibold">{recipient?.user?.name || '...'}</span>
        </p>
      </div>

      <Select
        label="Paid to *"
        name="receivedById"
        value={form.receivedById}
        onChange={handleChange}
      >
        <option value="">Select person...</option>
        {otherMembers.map((m) => (
          <option key={m.user?.id} value={m.user?.id}>
            {m.user?.name}
          </option>
        ))}
      </Select>

      <Input
        label="Amount (₹) *"
        name="amount"
        type="number"
        min="0.01"
        step="0.01"
        placeholder="0.00"
        value={form.amount}
        onChange={handleChange}
      />

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Note (optional)</label>
        <textarea
          name="notes"
          placeholder="e.g. Cash, GPay, UPI..."
          value={form.notes}
          onChange={handleChange}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" loading={mutation.isPending}>
          Record Payment
        </Button>
      </div>
    </form>
  )
}
