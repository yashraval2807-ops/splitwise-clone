// src/pages/expenses/ExpenseDetailPage.jsx
import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi } from '../../api/expenses.api'
import { Layout } from '../../components/layout/Layout'
import { ChatWindow } from '../../components/chat/ChatWindow'
import { Avatar } from '../../components/common/Avatar'
import { Badge } from '../../components/common/Badge'
import { Button } from '../../components/common/Button'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { formatCurrency } from '../../utils/currency'
import { formatDate } from '../../utils/dates'
import { useAuth } from '../../hooks/useAuth'

const SPLIT_LABELS = { EQUAL: 'Equal split', UNEQUAL: 'Custom amounts', PERCENTAGE: 'By percentage', SHARES: 'By shares' }
const SPLIT_COLORS = { EQUAL: 'blue', UNEQUAL: 'yellow', PERCENTAGE: 'green', SHARES: 'gray' }

export function ExpenseDetailPage() {
  const { groupId, expenseId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: expense, isLoading } = useQuery({
    queryKey: ['expense', groupId, expenseId],
    queryFn: () => expensesApi.getById(groupId, expenseId),
    select: (r) => r.data.data.expense,
  })

  const deleteMutation = useMutation({
    mutationFn: () => expensesApi.delete(groupId, expenseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', groupId] })
      qc.invalidateQueries({ queryKey: ['group-balances', groupId] })
      navigate(`/groups/${groupId}`)
    },
  })

  if (isLoading) return <Layout><LoadingSpinner className="py-20" /></Layout>
  if (!expense) return <Layout><p className="text-center py-10 text-gray-500">Expense not found.</p></Layout>

  const isPayer = expense.paidBy?.id === user?.id
  const myUserSplit = expense.splits?.find((s) => s.user?.id === user?.id)
  const myAmount = myUserSplit ? Number(myUserSplit.amount) : 0
  const canDelete = isPayer || expense.paidBy?.id === user?.id

  return (
    <Layout>
      <div className="space-y-4 max-w-2xl mx-auto">
        {/* Back button */}
        <Link
          to={`/groups/${groupId}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← Back to group
        </Link>

        {/* Expense header card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{expense.title}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{formatDate(expense.date)}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(expense.amount, expense.currency)}
              </p>
              <Badge variant={SPLIT_COLORS[expense.splitType]}>
                {SPLIT_LABELS[expense.splitType]}
              </Badge>
            </div>
          </div>

          {/* Paid by */}
          <div className="flex items-center gap-2 py-3 border-t border-gray-50">
            <span className="text-sm text-gray-500">Paid by</span>
            <Avatar name={expense.paidBy?.name} size="sm" />
            <span className="text-sm font-medium text-gray-800">
              {isPayer ? 'You' : expense.paidBy?.name}
            </span>
          </div>

          {/* Your share highlight */}
          {myUserSplit && (
            <div
              className={`rounded-xl px-4 py-3 mt-2 ${
                isPayer && myAmount < Number(expense.amount)
                  ? 'bg-green-50 border border-green-100'
                  : !isPayer
                  ? 'bg-red-50 border border-red-100'
                  : 'bg-gray-50'
              }`}
            >
              {isPayer && myAmount < Number(expense.amount) ? (
                <p className="text-sm text-green-700">
                  You paid {formatCurrency(expense.amount)} and are owed{' '}
                  <strong>{formatCurrency(Number(expense.amount) - myAmount)}</strong>
                </p>
              ) : !isPayer ? (
                <p className="text-sm text-red-600">
                  Your share: <strong>{formatCurrency(myAmount)}</strong>
                </p>
              ) : (
                <p className="text-sm text-gray-500">You paid for yourself only</p>
              )}
            </div>
          )}

          {/* Notes */}
          {expense.notes && (
            <p className="text-sm text-gray-500 italic mt-3 border-t border-gray-50 pt-3">
              "{expense.notes}"
            </p>
          )}
        </div>

        {/* Split breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Split Breakdown
          </h2>
          <div className="space-y-2">
            {expense.splits?.map((split) => {
              const isMe = split.user?.id === user?.id
              const isThePayer = split.user?.id === expense.paidBy?.id
              const pct = expense.splitType === 'PERCENTAGE' && split.percentage
                ? ` (${split.percentage}%)`
                : ''
              const sharesStr = expense.splitType === 'SHARES' && split.shares
                ? ` (${split.shares} share${split.shares !== 1 ? 's' : ''})`
                : ''

              return (
                <div key={split.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <Avatar name={split.user?.name} size="sm" />
                    <span className="text-sm text-gray-700">
                      {isMe ? 'You' : split.user?.name}
                      {isThePayer && (
                        <span className="ml-1 text-xs text-brand-600 font-medium">(paid)</span>
                      )}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(split.amount)}{pct}{sharesStr}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Percentage bar visualization for PERCENTAGE type */}
          {expense.splitType === 'PERCENTAGE' && (
            <div className="mt-3 flex rounded-full overflow-hidden h-2">
              {expense.splits?.map((split, i) => {
                const colors = ['bg-blue-400', 'bg-green-400', 'bg-yellow-400', 'bg-purple-400', 'bg-red-400']
                return (
                  <div
                    key={split.id}
                    style={{ width: `${split.percentage}%` }}
                    className={colors[i % colors.length]}
                    title={`${split.user?.name}: ${split.percentage}%`}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Real-time chat */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <ChatWindow expenseId={expenseId} />
        </div>

        {/* Delete button */}
        {canDelete && (
          <div className="text-center">
            <button
              onClick={() => {
                if (window.confirm('Delete this expense? This cannot be undone.')) {
                  deleteMutation.mutate()
                }
              }}
              className="text-sm text-red-400 hover:text-red-600 transition-colors"
            >
              Delete expense
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
