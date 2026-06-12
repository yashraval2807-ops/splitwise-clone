// src/components/expenses/ExpenseCard.jsx
import { Link } from 'react-router-dom'
import { Avatar } from '../common/Avatar'
import { Badge } from '../common/Badge'
import { formatCurrency } from '../../utils/currency'
import { formatDate } from '../../utils/dates'
import { useAuth } from '../../hooks/useAuth'

const SPLIT_LABELS = { EQUAL: 'Equal', UNEQUAL: 'Custom', PERCENTAGE: '%', SHARES: 'Shares' }
const SPLIT_COLORS = { EQUAL: 'blue', UNEQUAL: 'yellow', PERCENTAGE: 'green', SHARES: 'gray' }

export function ExpenseCard({ expense, groupId }) {
  const { user } = useAuth()

  // Find what this user owes / is owed for this expense
  const myUserSplit = expense.splits?.find((s) => s.user?.id === user?.id)
  const isPayer = expense.paidBy?.id === user?.id
  const myAmount = myUserSplit ? Number(myUserSplit.amount) : 0

  let balanceText = ''
  let balanceColor = 'text-gray-400'

  if (isPayer && myAmount < Number(expense.amount)) {
    const owedByOthers = Number(expense.amount) - myAmount
    balanceText = `you lent ${formatCurrency(owedByOthers)}`
    balanceColor = 'text-green-600'
  } else if (!isPayer && myAmount > 0) {
    balanceText = `you owe ${formatCurrency(myAmount)}`
    balanceColor = 'text-red-500'
  } else if (isPayer && myAmount === Number(expense.amount)) {
    balanceText = 'not involved'
    balanceColor = 'text-gray-400'
  }

  return (
    <Link
      to={`/groups/${groupId}/expenses/${expense.id}`}
      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors"
    >
      {/* Date column */}
      <div className="w-10 text-center flex-shrink-0">
        <div className="text-xs font-semibold text-brand-600 uppercase">
          {formatDate(expense.date).split(' ')[1]}
        </div>
        <div className="text-lg font-bold text-gray-800 leading-none">
          {formatDate(expense.date).split(' ')[0]}
        </div>
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate">{expense.title}</span>
          <Badge variant={SPLIT_COLORS[expense.splitType]}>
            {SPLIT_LABELS[expense.splitType]}
          </Badge>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <Avatar name={expense.paidBy?.name} size="sm" />
          <span className="text-xs text-gray-500">
            {isPayer ? 'You' : expense.paidBy?.name} paid
          </span>
          {expense._count?.comments > 0 && (
            <span className="text-xs text-gray-400 ml-1">
              💬 {expense._count.comments}
            </span>
          )}
        </div>
      </div>

      {/* Amount column */}
      <div className="text-right flex-shrink-0">
        <div className="font-semibold text-gray-900">{formatCurrency(expense.amount)}</div>
        <div className={`text-xs ${balanceColor}`}>{balanceText}</div>
      </div>
    </Link>
  )
}
