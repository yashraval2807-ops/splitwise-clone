// src/utils/dates.js
import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function formatDate(dateStr) {
  if (!dateStr) return ''
  return format(parseISO(dateStr), 'dd MMM yyyy')
}

export function formatDateTime(dateStr) {
  if (!dateStr) return ''
  return format(parseISO(dateStr), 'dd MMM yyyy, h:mm a')
}

export function timeAgo(dateStr) {
  if (!dateStr) return ''
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true })
}
