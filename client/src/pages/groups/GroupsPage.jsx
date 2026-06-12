// src/pages/groups/GroupsPage.jsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { groupsApi } from '../../api/groups.api'
import { Layout } from '../../components/layout/Layout'
import { GroupCard } from '../../components/groups/GroupCard'
import { GroupForm } from '../../components/groups/GroupForm'
import { Modal } from '../../components/common/Modal'
import { Button } from '../../components/common/Button'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'

export function GroupsPage() {
  const [showCreate, setShowCreate] = useState(false)

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.getAll(),
    select: (r) => r.data.data.groups,
  })

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Groups</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {groups.length} group{groups.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>+ New Group</Button>
        </div>

        {isLoading && <LoadingSpinner className="py-12" />}

        {!isLoading && groups.length === 0 && (
          <EmptyState
            icon="👥"
            title="No groups yet"
            description="Create your first group to start tracking shared expenses with friends."
            action={
              <Button onClick={() => setShowCreate(true)}>Create a Group</Button>
            }
          />
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
        </div>
      </div>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create a Group"
      >
        <GroupForm onClose={() => setShowCreate(false)} />
      </Modal>
    </Layout>
  )
}
