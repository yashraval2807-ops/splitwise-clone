// src/pages/groups/GroupDetailPage.jsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groupsApi } from '../../api/groups.api'
import { Layout } from '../../components/layout/Layout'
import { ExpenseCard } from '../../components/expenses/ExpenseCard'
import { ExpenseForm } from '../../components/expenses/ExpenseForm'
import { BalanceSummary } from '../../components/balances/BalanceSummary'
import { SettlementForm } from '../../components/balances/SettlementForm'
import { MemberList } from '../../components/groups/MemberList'
import { Modal } from '../../components/common/Modal'
import { Button } from '../../components/common/Button'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { EmptyState } from '../../components/common/EmptyState'
import { Badge } from '../../components/common/Badge'
import { useAuth } from '../../hooks/useAuth'

const GROUP_TYPE_EMOJI = { HOME: '🏠', TRIP: '✈️', COUPLE: '💑', OTHER: '👥' }

export function GroupDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showSettle, setShowSettle] = useState(false)
  const [activeTab, setActiveTab] = useState('expenses') // 'expenses' | 'balances' | 'members'

  const { data: group, isLoading, error } = useQuery({
    queryKey: ['group', id],
    queryFn: () => groupsApi.getById(id),
    select: (r) => r.data.data.group,
  })

  const deleteMutation = useMutation({
    mutationFn: () => groupsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      navigate('/groups')
    },
  })

  if (isLoading) return <Layout><LoadingSpinner className="py-20" /></Layout>
  if (error || !group) {
    return (
      <Layout>
        <EmptyState icon="❌" title="Group not found" description="This group doesn't exist or you don't have access." />
      </Layout>
    )
  }

  const emoji = GROUP_TYPE_EMOJI[group.type] || '👥'
  const isAdmin = group.members?.find((m) => m.user?.id === user?.id)?.role === 'ADMIN'
  const expenses = group.expenses || []

  return (
    <Layout>
      <div className="space-y-4">
        {/* Group header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{emoji}</span>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{group.name}</h1>
                {group.description && (
                  <p className="text-sm text-gray-500 mt-0.5">{group.description}</p>
                )}
                <Badge variant="gray">{group.type}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowSettle(true)} variant="secondary" size="sm">
                Settle Up
              </Button>
              <Button onClick={() => setShowAddExpense(true)} size="sm">
                + Add Expense
              </Button>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {['expenses', 'balances', 'members'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
              {tab === 'expenses' && expenses.length > 0 && (
                <span className="ml-1.5 text-xs bg-gray-200 text-gray-600 rounded-full px-1.5">
                  {expenses.length}
                </span>
              )}
              {tab === 'members' && (
                <span className="ml-1.5 text-xs bg-gray-200 text-gray-600 rounded-full px-1.5">
                  {group.members?.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-2xl border border-gray-100">
          {activeTab === 'expenses' && (
            <div>
              {expenses.length === 0 ? (
                <EmptyState
                  icon="🧾"
                  title="No expenses yet"
                  description="Add the first expense to start tracking."
                  action={
                    <Button onClick={() => setShowAddExpense(true)} size="sm">
                      Add Expense
                    </Button>
                  }
                />
              ) : (
                <div className="divide-y divide-gray-50">
                  {expenses.map((expense) => (
                    <ExpenseCard key={expense.id} expense={expense} groupId={id} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'balances' && (
            <div className="p-4">
              <BalanceSummary groupId={id} />
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setShowSettle(true)}
                >
                  Record a Settlement
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="p-4">
              <MemberList group={group} />
              {isAdmin && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this group? This cannot be undone.')) {
                        deleteMutation.mutate()
                      }
                    }}
                    className="text-sm text-red-500 hover:text-red-700 transition-colors"
                  >
                    Delete group
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        title="Add Expense"
        size="lg"
      >
        <ExpenseForm group={group} onClose={() => setShowAddExpense(false)} />
      </Modal>

      <Modal
        isOpen={showSettle}
        onClose={() => setShowSettle(false)}
        title="Settle Up"
      >
        <SettlementForm group={group} onClose={() => setShowSettle(false)} />
      </Modal>
    </Layout>
  )
}
