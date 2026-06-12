// src/components/layout/Navbar.jsx
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Avatar } from '../common/Avatar'

export function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-4 sticky top-0 z-30">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 font-bold text-brand-600 text-lg mr-4">
        <span className="text-2xl">💸</span>
        <span className="hidden sm:block">SplitEase</span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-1 flex-1">
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/groups">Groups</NavLink>
        <NavLink to="/settlements">Settlements</NavLink>
      </div>

      {/* User menu */}
      {user && (
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-sm text-gray-600">{user.name}</span>
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  )
}

function NavLink({ to, children }) {
  const active = window.location.pathname === to
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  )
}
