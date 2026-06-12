// src/components/expenses/SplitEditor.jsx
// Handles the dynamic split input UI for all 4 split types.
// Parent passes: splitType, members, splits (state), onSplitsChange, totalAmount

import { useEffect } from 'react'
import { Avatar } from '../common/Avatar'
import { formatCurrency } from '../../utils/currency'

export function SplitEditor({ splitType, members, splits, onSplitsChange, totalAmount }) {
  // When splitType or members change, reset splits to sensible defaults
  useEffect(() => {
    if (!members?.length) return
    const reset = members.map((m) => ({
      userId: m.user?.id || m.userId,
      name: m.user?.name || m.name,
      avatarUrl: m.user?.avatarUrl || m.avatarUrl,
      amount: '',
      percentage: '',
      shares: 1,
      selected: true,
    }))
    onSplitsChange(reset)
  }, [splitType]) // eslint-disable-line

  function updateSplit(userId, field, value) {
    onSplitsChange((prev) =>
      prev.map((s) => (s.userId === userId ? { ...s, [field]: value } : s))
    )
  }

  function toggleSelected(userId) {
    onSplitsChange((prev) =>
      prev.map((s) => (s.userId === userId ? { ...s, selected: !s.selected } : s))
    )
  }

  const selected = splits.filter((s) => s.selected)
  const total = Number(totalAmount) || 0

  // ── EQUAL: preview per-person amount ─────────────────────────────────────
  function EqualRow({ split }) {
    const perPerson = selected.length > 0 ? total / selected.length : 0
    return (
      <SplitRow
        split={split}
        onToggle={() => toggleSelected(split.userId)}
        rightContent={
          split.selected ? (
            <span className="text-sm font-medium text-brand-600">
              {formatCurrency(perPerson)}
            </span>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )
        }
      />
    )
  }

  // ── UNEQUAL: manual amount input ──────────────────────────────────────────
  function UnequalRow({ split }) {
    const sum = selected.reduce((a, s) => a + (Number(s.amount) || 0), 0)
    const remaining = total - sum
    return (
      <SplitRow
        split={split}
        onToggle={() => toggleSelected(split.userId)}
        rightContent={
          split.selected ? (
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={split.amount}
              onChange={(e) => updateSplit(split.userId, 'amount', e.target.value)}
              className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )
        }
      />
    )
  }

  // ── PERCENTAGE: percentage input ──────────────────────────────────────────
  function PercentageRow({ split }) {
    const amount = total * ((Number(split.percentage) || 0) / 100)
    return (
      <SplitRow
        split={split}
        onToggle={() => toggleSelected(split.userId)}
        rightContent={
          split.selected ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="0"
                value={split.percentage}
                onChange={(e) => updateSplit(split.userId, 'percentage', e.target.value)}
                className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-500">%</span>
              <span className="text-xs text-gray-400 ml-1">= {formatCurrency(amount)}</span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )
        }
      />
    )
  }

  // ── SHARES: share count input ─────────────────────────────────────────────
  function SharesRow({ split }) {
    const totalShares = selected.reduce((a, s) => a + (Number(s.shares) || 0), 0)
    const amount = totalShares > 0 ? total * ((Number(split.shares) || 0) / totalShares) : 0
    return (
      <SplitRow
        split={split}
        onToggle={() => toggleSelected(split.userId)}
        rightContent={
          split.selected ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1"
                step="1"
                value={split.shares}
                onChange={(e) => updateSplit(split.userId, 'shares', e.target.value)}
                className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <span className="text-xs text-gray-400">shares = {formatCurrency(amount)}</span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )
        }
      />
    )
  }

  // ── Summary footer ────────────────────────────────────────────────────────
  function SummaryFooter() {
    if (splitType === 'EQUAL') {
      return (
        <p className="text-xs text-gray-500 text-right">
          {formatCurrency(total)} ÷ {selected.length} = {formatCurrency(selected.length > 0 ? total / selected.length : 0)} each
        </p>
      )
    }
    if (splitType === 'UNEQUAL') {
      const sum = selected.reduce((a, s) => a + (Number(s.amount) || 0), 0)
      const diff = total - sum
      const ok = Math.abs(diff) < 0.01
      return (
        <p className={`text-xs text-right ${ok ? 'text-green-600' : 'text-red-500'}`}>
          {ok ? '✓ Amounts match total' : `${formatCurrency(Math.abs(diff))} ${diff > 0 ? 'remaining' : 'over'}`}
        </p>
      )
    }
    if (splitType === 'PERCENTAGE') {
      const sum = selected.reduce((a, s) => a + (Number(s.percentage) || 0), 0)
      const ok = Math.abs(sum - 100) < 0.01
      return (
        <p className={`text-xs text-right ${ok ? 'text-green-600' : 'text-red-500'}`}>
          {sum.toFixed(1)}% total {ok ? '✓' : `(need ${(100 - sum).toFixed(1)}% more)`}
        </p>
      )
    }
    if (splitType === 'SHARES') {
      const total_shares = selected.reduce((a, s) => a + (Number(s.shares) || 0), 0)
      return <p className="text-xs text-gray-500 text-right">Total: {total_shares} shares</p>
    }
    return null
  }

  const RowComponent = { EQUAL: EqualRow, UNEQUAL: UnequalRow, PERCENTAGE: PercentageRow, SHARES: SharesRow }[splitType] || EqualRow

  return (
    <div className="space-y-1">
      {splits.map((split) => (
        <RowComponent key={split.userId} split={split} />
      ))}
      <div className="pt-1 border-t border-gray-100">
        <SummaryFooter />
      </div>
    </div>
  )
}

function SplitRow({ split, onToggle, rightContent }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${split.selected ? '' : 'opacity-40'}`}>
      <input
        type="checkbox"
        checked={split.selected}
        onChange={onToggle}
        className="w-4 h-4 accent-brand-600 cursor-pointer"
      />
      <Avatar name={split.name} avatarUrl={split.avatarUrl} size="sm" />
      <span className="flex-1 text-sm text-gray-800">{split.name}</span>
      {rightContent}
    </div>
  )
}
