// src/components/groups/GroupCard.jsx
import { Link } from 'react-router-dom'
import { Badge } from '../common/Badge'
import { Avatar } from '../common/Avatar'

const GROUP_TYPE_EMOJI = { HOME: '🏠', TRIP: '✈️', COUPLE: '💑', OTHER: '👥' }

export function GroupCard({ group }) {
  const emoji = GROUP_TYPE_EMOJI[group.type] || '👥'

  return (
    <Link
      to={`/groups/${group.id}`}
      className="block bg-white rounded-xl border border-gray-100 hover:border-brand-200 hover:shadow-md transition-all p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl">{emoji}</span>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{group.name}</h3>
            {group.description && (
              <p className="text-xs text-gray-500 truncate mt-0.5">{group.description}</p>
            )}
          </div>
        </div>
        <Badge variant="gray">{group.type}</Badge>
      </div>

      <div className="mt-3 flex items-center justify-between">
        {/* Member avatars */}
        <div className="flex -space-x-2">
          {group.members?.slice(0, 5).map((m) => (
            <div key={m.id} className="ring-2 ring-white rounded-full">
              <Avatar name={m.user?.name} avatarUrl={m.user?.avatarUrl} size="sm" />
            </div>
          ))}
          {group.members?.length > 5 && (
            <div className="w-7 h-7 rounded-full bg-gray-200 ring-2 ring-white flex items-center justify-center text-xs text-gray-600 font-medium">
              +{group.members.length - 5}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{group.members?.length || 0} members</span>
          {group._count && (
            <span>{group._count.expenses} expenses</span>
          )}
        </div>
      </div>
    </Link>
  )
}
