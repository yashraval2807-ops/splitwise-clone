// src/utils/currency.js
export function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount)
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(num)
}

export function formatAmount(amount) {
  const num = Number(amount)
  if (isNaN(num)) return '0.00'
  return num.toFixed(2)
}
