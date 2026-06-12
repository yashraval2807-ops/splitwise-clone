// src/pages/DashboardPage.jsx
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { balancesApi } from '../api/balances.api'
import { groupsApi } from '../api/groups.api'
import { useAuth } from '../hooks/useAuth'
import { Layout } from '../components/layout/Layout'
import { Avatar } from '../components/common/Avatar'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { EmptyState } from '../components/common/EmptyState'
import { formatCurrency } from '../utils/currency'

export function DashboardPage() {
  const { user } = useAuth()

  const { data: balances = [], isLoading: balLoading } = useQuery({
    queryKey: ['overall-balances'],
    queryFn: () => balancesApi.getOverall(),
    select: (r) => r.data.data.balances,
  })

  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.getAll(),
    select: (r) => r.data.data.groups,
  })

  // Compute totals
  const totalOwed = balances
    .filter((b) => b.netAmount > 0)
    .reduce((sum, b) => sum + b.netAmount, 0)

  const totalOwing = balances
    .filter((b) => b.netAmount < 0)
    .reduce((sum, b) => sum + Math.abs(b.netAmount), 0)

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hi, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Here's your balance overview</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
              You are owed
            </p>
            <p className="text-2xl font-bold text-green-700 mt-1">
              {balLoading ? '...' : formatCurrency(totalOwed)}
            </p>
            <p className="text-xs text-green-600 mt-0.5">
              by {balances.filter((b) => b.netAmount > 0).length} people
            </p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">
              You owe
            </p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {balLoading ? '...' : formatCurrency(totalOwing)}
            </p>
            <p className="text-xs text-red-500 mt-0.5">
              to {balances.filter((b) => b.netAmount < 0).length} people
            </p>
          </div>
        </div>

        {/* Per-person balances */}
        {!balLoading && balances.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">People</h2>
            <div className="divide-y divide-gray-50">
              {balances.map((b) => (
                <div key={b.withUserId} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Avatar name={b.withUserName} avatarUrl={b.withUserAvatar} size="sm" />
                    <span className="text-sm text-gray-800">{b.withUserName}</span>
                  </div>
                  <div className="text-right">
                    {b.netAmount > 0 ? (
                      <div>
                        <span className="text-xs text-gray-500 block">owes you</span>
                        <span className="text-sm font-semibold text-green-600">
                          {formatCurrency(b.netAmount)}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs text-gray-500 block">you owe</span>
                        <span className="text-sm font-semibold text-red-500">
                          {formatCurrency(Math.abs(b.netAmount))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!balLoading && balances.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <span className="text-3xl">🎉</span>
            <p className="text-gray-600 font-medium mt-2">All settled up!</p>
            <p className="text-gray-400 text-sm mt-1">
              No outstanding balances across all groups.
            </p>
          </div>
        )}

        {/* Groups quick access */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Your Groups</h2>
            <Link to="/groups" className="text-sm text-brand-600 hover:underline">
              View all
            </Link>
          </div>

          {groupsLoading && <LoadingSpinner className="py-4" />}

          {!groupsLoading && groups.length === 0 && (
            <EmptyState
              icon="👥"
              title="No groups yet"
              description="Create a group to start splitting expenses"
              action={
                <Link
                  to="/groups"
                  className="text-sm text-brand-600 hover:underline font-medium"
                >
                  Create your first group →
                </Link>
              }
            />
          )}

          <div className="grid gap-2">
            {groups.slice(0, 4).map((g) => (
              <Link
                key={g.id}
                to={`/groups/${g.id}`}
                className="flex items-center justify-between bg-white rounded-xl border border-gray-100 hover:border-brand-200 transition-colors px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span>{g.type === 'TRIP' ? '✈️' : g.type === 'HOME' ? '🏠' : '👥'}</span>
                  <span className="font-medium text-gray-800 text-sm">{g.name}</span>
                </div>
                <span className="text-xs text-gray-400">{g.members?.length} members</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
