// src/components/balances/BalanceSummary.jsx
import { useQuery } from '@tanstack/react-query'
import { balancesApi } from '../../api/balances.api'
import { Avatar } from '../common/Avatar'
import { formatCurrency } from '../../utils/currency'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { useAuth } from '../../hooks/useAuth'

export function BalanceSummary({ groupId }) {
  const { user } = useAuth()

  const { data: balData, isLoading: balLoading } = useQuery({
    queryKey: ['group-balances', groupId],
    queryFn: () => balancesApi.getGroupBalances(groupId),
    select: (r) => r.data.data.balances,
  })

  const { data: simpData, isLoading: simpLoading } = useQuery({
    queryKey: ['group-simplified', groupId],
    queryFn: () => balancesApi.getGroupSimplified(groupId),
    select: (r) => r.data.data.transactions,
  })

  if (balLoading || simpLoading) return <LoadingSpinner className="py-6" />

  const nonZero = balData?.filter((b) => Math.abs(b.netAmount) > 0.005) || []

  return (
    <div className="space-y-4">
      {/* Member balances */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Balances
        </h3>
        {balData?.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">No expenses yet</p>
        )}
        <div className="space-y-2">
          {balData?.map((b) => (
            <div key={b.userId} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar name={b.name} avatarUrl={b.avatarUrl} size="sm" />
                <span className="text-sm text-gray-700">
                  {b.userId === user?.id ? 'You' : b.name}
                </span>
              </div>
              <span
                className={`text-sm font-semibold ${
                  b.netAmount > 0
                    ? 'text-green-600'
                    : b.netAmount < 0
                    ? 'text-red-500'
                    : 'text-gray-400'
                }`}
              >
                {b.netAmount > 0
                  ? `+${formatCurrency(b.netAmount)}`
                  : b.netAmount < 0
                  ? `-${formatCurrency(Math.abs(b.netAmount))}`
                  : 'settled up'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Simplified settlements */}
      {simpData && simpData.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Suggested Settlements
          </h3>
          <div className="space-y-2">
            {simpData.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-sm bg-amber-50 rounded-lg px-3 py-2">
                <Avatar name={t.fromName} size="sm" />
                <span className="text-gray-700">
                  <span className="font-medium">
                    {t.from === user?.id ? 'You' : t.fromName}
                  </span>
                  {' → '}
                  <span className="font-medium">
                    {t.to === user?.id ? 'you' : t.toName}
                  </span>
                </span>
                <span className="ml-auto font-semibold text-amber-700">
                  {formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {nonZero.length === 0 && (
        <div className="text-center py-2">
          <span className="text-2xl">🎉</span>
          <p className="text-sm text-gray-500 mt-1">Everyone is settled up!</p>
        </div>
      )}
    </div>
  )
}
