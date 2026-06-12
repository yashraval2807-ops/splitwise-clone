// src/components/chat/ChatWindow.jsx
// Real-time comment thread for an expense.
// On mount: joins the expense room via socket, fetches existing comments.
// On new_comment event: appends to list instantly without re-fetching.

import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { commentsApi } from '../../api/comments.api'
import { useSocket } from '../../hooks/useSocket'
import { useAuth } from '../../hooks/useAuth'
import { Avatar } from '../common/Avatar'
import { Button } from '../common/Button'
import { timeAgo } from '../../utils/dates'
import { LoadingSpinner } from '../common/LoadingSpinner'

export function ChatWindow({ expenseId }) {
  const { user } = useAuth()
  const { socket } = useSocket()
  const qc = useQueryClient()
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', expenseId],
    queryFn: () => commentsApi.getAll(expenseId),
    select: (r) => r.data.data.comments,
  })

  // Join socket room and listen for new comments
  useEffect(() => {
    if (!socket) return

    socket.emit('join_expense', { expenseId })

    socket.on('new_comment', (comment) => {
      // Optimistically append to query cache
      qc.setQueryData(['comments', expenseId], (old) => {
        if (!old) return old
        const existing = old.data.data.comments
        // Avoid duplicates (REST response + socket event)
        if (existing.find((c) => c.id === comment.id)) return old
        return {
          ...old,
          data: {
            ...old.data,
            data: { comments: [...existing, comment] },
          },
        }
      })
    })

    return () => {
      socket.emit('leave_expense', { expenseId })
      socket.off('new_comment')
    }
  }, [socket, expenseId]) // eslint-disable-line

  // Scroll to bottom when comments change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  async function handleSend(e) {
    e.preventDefault()
    if (!content.trim()) return
    setSending(true)
    try {
      await commentsApi.create(expenseId, content.trim())
      setContent('')
      // The socket event will update the list; REST response is the source of truth
      qc.invalidateQueries({ queryKey: ['comments', expenseId] })
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send comment')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        💬 Comments
        {comments.length > 0 && (
          <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
            {comments.length}
          </span>
        )}
      </h3>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0 max-h-64 pr-1">
        {isLoading && <LoadingSpinner className="py-4" />}
        {!isLoading && comments.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">
            No comments yet. Start the conversation!
          </p>
        )}
        {comments.map((c) => (
          <MessageBubble key={c.id} comment={c} isMe={c.user?.id === user?.id} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend(e)
            }
          }}
        />
        <Button type="submit" size="sm" loading={sending} disabled={!content.trim()}>
          Send
        </Button>
      </form>
    </div>
  )
}

function MessageBubble({ comment, isMe }) {
  return (
    <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
      <Avatar name={comment.user?.name} avatarUrl={comment.user?.avatarUrl} size="sm" />
      <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        {!isMe && (
          <span className="text-xs text-gray-500 font-medium">{comment.user?.name}</span>
        )}
        <div
          className={`px-3 py-2 rounded-2xl text-sm ${
            isMe
              ? 'bg-brand-600 text-white rounded-tr-sm'
              : 'bg-gray-100 text-gray-800 rounded-tl-sm'
          }`}
        >
          {comment.content}
        </div>
        <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
      </div>
    </div>
  )
}
