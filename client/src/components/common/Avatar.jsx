// src/components/common/Avatar.jsx
export function Avatar({ name = '', avatarUrl = null, size = 'md' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' }
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  // Deterministic color from name
  const colors = [
    'bg-red-100 text-red-700', 'bg-orange-100 text-orange-700',
    'bg-amber-100 text-amber-700', 'bg-green-100 text-green-700',
    'bg-teal-100 text-teal-700', 'bg-blue-100 text-blue-700',
    'bg-indigo-100 text-indigo-700', 'bg-purple-100 text-purple-700',
  ]
  const colorIdx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length
  const color = colors[colorIdx]

  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={`${sizes[size]} rounded-full object-cover`} />
  }

  return (
    <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}>
      {initials || '?'}
    </div>
  )
}
