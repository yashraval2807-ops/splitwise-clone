// src/components/expenses/ExpenseForm.jsx
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi } from '../../api/expenses.api'
import { Button } from '../common/Button'
import { Input, Select } from '../common/Input'
import { SplitEditor } from './SplitEditor'
import { useAuth } from '../../hooks/useAuth'

const SPLIT_TYPES = [
  { value: 'EQUAL', label: '⚖️ Equal' },
  { value: 'UNEQUAL', label: '✏️ Exact amounts' },
  { value: 'PERCENTAGE', label: '% Percentage' },
  { value: 'SHARES', label: '🔢 Shares' },
]

export function ExpenseForm({ group, onClose }) {
  const { user } = useAuth()
  const qc = useQueryClient()

  const [form, setForm] = useState({
    title: '',
    amount: '',
    paidById: user?.id || '',
    splitType: 'EQUAL',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [splits, setSplits] = useState(
    group.members?.map((m) => ({
      userId: m.user?.id,
      name: m.user?.name,
      avatarUrl: m.user?.avatarUrl,
      amount: '',
      percentage: '',
      shares: 1,
      selected: true,
    })) || []
  )
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (payload) => expensesApi.create(group.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', group.id] })
      qc.invalidateQueries({ queryKey: ['expenses', group.id] })
      qc.invalidateQueries({ queryKey: ['group-balances', group.id] })
      onClose()
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to add expense'),
  })

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  function buildPayload() {
    const selectedSplits = splits.filter((s) => s.selected)
    if (selectedSplits.length === 0) return null

    const baseSplits = selectedSplits.map((s) => {
      const base = { userId: s.userId }
      if (form.splitType === 'UNEQUAL') return { ...base, amount: Number(s.amount) }
      if (form.splitType === 'PERCENTAGE') return { ...base, percentage: Number(s.percentage) }
      if (form.splitType === 'SHARES') return { ...base, shares: Number(s.shares) }
      return base // EQUAL needs no extra fields
    })

    return {
      title: form.title.trim(),
      amount: Number(form.amount),
      paidById: form.paidById,
      splitType: form.splitType,
      date: form.date,
      notes: form.notes.trim() || undefined,
      splits: baseSplits,
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.title.trim()) { setError('Title is required'); return }
    if (!form.amount || Number(form.amount) <= 0) { setError('Enter a valid amount'); return }
    if (!form.paidById) { setError('Select who paid'); return }

    const payload = buildPayload()
    if (!payload) { setError('Select at least one participant'); return }

    mutation.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title + Amount row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Input
            label="Description *"
            name="title"
            placeholder="e.g. Hotel, Dinner, Taxi"
            value={form.title}
            onChange={handleChange}
            autoFocus
          />
        </div>
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
        <Input
          label="Date"
          name="date"
          type="date"
          value={form.date}
          onChange={handleChange}
        />
      </div>

      {/* Paid by */}
      <Select label="Paid by *" name="paidById" value={form.paidById} onChange={handleChange}>
        {group.members?.map((m) => (
          <option key={m.user?.id} value={m.user?.id}>
            {m.user?.id === user?.id ? `${m.user?.name} (you)` : m.user?.name}
          </option>
        ))}
      </Select>

      {/* Split type */}
      <Select label="Split type" name="splitType" value={form.splitType} onChange={handleChange}>
        {SPLIT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </Select>

      {/* Split editor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Split between</label>
        <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
          <SplitEditor
            splitType={form.splitType}
            members={group.members}
            splits={splits}
            onSplitsChange={setSplits}
            totalAmount={form.amount}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          name="notes"
          placeholder="Optional note..."
          value={form.notes}
          onChange={handleChange}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" loading={mutation.isPending}>
          Add Expense
        </Button>
      </div>
    </form>
  )
}
