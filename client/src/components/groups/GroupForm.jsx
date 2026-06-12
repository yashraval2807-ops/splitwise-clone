// src/components/groups/GroupForm.jsx
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { groupsApi } from '../../api/groups.api'
import { Button } from '../common/Button'
import { Input, Select, Textarea } from '../common/Input'

export function GroupForm({ onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', description: '', type: 'OTHER' })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => groupsApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      onClose()
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to create group'),
  })

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Group name is required'); return }
    mutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Group Name *"
        name="name"
        placeholder="e.g. Goa Trip 2024"
        value={form.name}
        onChange={handleChange}
        autoFocus
      />

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          name="description"
          placeholder="Optional description..."
          value={form.description}
          onChange={handleChange}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      <Select label="Group Type" name="type" value={form.type} onChange={handleChange}>
        <option value="OTHER">👥 Other</option>
        <option value="TRIP">✈️ Trip</option>
        <option value="HOME">🏠 Home</option>
        <option value="COUPLE">💑 Couple</option>
      </Select>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" loading={mutation.isPending}>
          Create Group
        </Button>
      </div>
    </form>
  )
}
