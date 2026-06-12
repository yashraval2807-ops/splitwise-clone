// src/components/groups/MemberList.jsx
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { groupsApi } from '../../api/groups.api'
import { Avatar } from '../common/Avatar'
import { Badge } from '../common/Badge'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { useAuth } from '../../hooks/useAuth'

export function MemberList({ group }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const myRole = group.members?.find((m) => m.user?.id === user?.id)?.role
  const isAdmin = myRole === 'ADMIN'

  const addMutation = useMutation({
    mutationFn: () => groupsApi.addMember(group.id, email.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', group.id] })
      setEmail('')
      setShowAdd(false)
      setError('')
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to add member'),
  })

  const removeMutation = useMutation({
    mutationFn: (userId) => groupsApi.removeMember(group.id, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', group.id] }),
    onError: (err) => alert(err.response?.data?.message || 'Failed to remove member'),
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Members ({group.members?.length || 0})
        </h3>
        {isAdmin && (
          <Button size="sm" variant="ghost" onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? 'Cancel' : '+ Add'}
          </Button>
        )}
      </div>

      {showAdd && (
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
          <Input
            placeholder="Email address"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError('') }}
            type="email"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <Button
            size="sm"
            className="w-full"
            loading={addMutation.isPending}
            onClick={() => addMutation.mutate()}
          >
            Add Member
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {group.members?.map((m) => (
          <div key={m.id} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Avatar name={m.user?.name} avatarUrl={m.user?.avatarUrl} size="sm" />
              <div>
                <span className="text-sm font-medium text-gray-800">{m.user?.name}</span>
                {m.user?.id === user?.id && (
                  <span className="ml-1 text-xs text-gray-400">(you)</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {m.role === 'ADMIN' && <Badge variant="blue">Admin</Badge>}
              {isAdmin && m.user?.id !== user?.id && (
                <button
                  onClick={() => removeMutation.mutate(m.user.id)}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors"
                  title="Remove member"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
