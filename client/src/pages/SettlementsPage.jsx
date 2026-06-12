// src/pages/SettlementsPage.jsx
import { useQuery } from '@tanstack/react-query'
import { settlementsApi } from '../api/settlements.api'
import { Layout } from '../components/layout/Layout'
import { Avatar } from '../components/common/Avatar'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { EmptyState } from '../components/common/EmptyState'
import { formatCurrency } from '../utils/currency'
import { formatDate } from '../utils/dates'
import { useAuth } from '../hooks/useAuth'

export function SettlementsPage() {
  const { user } = useAuth()

  const { data: settlements = [], isLoading } = useQuery({
    queryKey: ['settlements'],
    queryFn: () => settlementsApi.getAll(),
    select: (r) => r.data.data.settlements,
  })

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Settlements</h1>
          <p className="text-sm text-gray-500 mt-0.5">All recorded payments</p>
        </div>

        {isLoading && <LoadingSpinner className="py-12" />}

        {!isLoading && settlements.length === 0 && (
          <EmptyState
            icon="🤝"
            title="No settlements yet"
            description="When you record payments between group members, they'll appear here."
          />
        )}

        <div className="space-y-2">
          {settlements.map((s) => {
            const iPaid = s.paidBy?.id === user?.id
            return (
              <div
                key={s.id}
                className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3"
              >
                {/* Icon */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  iPaid ? 'bg-red-50' : 'bg-green-50'
                }`}>
                  <span className="text-base">{iPaid ? '↗️' : '↙️'}</span>
                </div>

                {/* Description */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">
                    {iPaid ? (
                      <>
                        You paid{' '}
                        <span className="font-medium">{s.receivedBy?.name}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium">{s.paidBy?.name}</span> paid you
                      </>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {s.group && (
                      <span className="text-xs text-gray-400">in {s.group.name}</span>
                    )}
                    <span className="text-xs text-gray-400">{formatDate(s.settledAt)}</span>
                    {s.notes && (
                      <span className="text-xs text-gray-400 italic">· {s.notes}</span>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <span className={`font-semibold text-sm flex-shrink-0 ${
                  iPaid ? 'text-red-500' : 'text-green-600'
                }`}>
                  {iPaid ? '-' : '+'}{formatCurrency(s.amount)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
