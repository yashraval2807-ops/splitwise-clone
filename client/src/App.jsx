// src/App.jsx
// Top-level component: providers + route definitions.
//
// PROVIDER ORDER MATTERS:
// 1. QueryClientProvider — React Query must wrap everything that uses useQuery
// 2. AuthProvider — provides auth state; SocketProvider needs it
// 3. SocketProvider — needs auth token; must be inside AuthProvider
// 4. Router — BrowserRouter must wrap all <Route> usage

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import { useAuth } from './hooks/useAuth'
import { PageLoader } from './components/common/LoadingSpinner'

import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { GroupsPage } from './pages/groups/GroupsPage'
import { GroupDetailPage } from './pages/groups/GroupDetailPage'
import { ExpenseDetailPage } from './pages/expenses/ExpenseDetailPage'
import { SettlementsPage } from './pages/SettlementsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30, // 30 seconds
      refetchOnWindowFocus: true,
    },
  },
})

// Protects routes that require authentication
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  return children
}

// Redirects logged-in users away from auth pages
function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (user) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/groups" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
      <Route path="/groups/:id" element={<ProtectedRoute><GroupDetailPage /></ProtectedRoute>} />
      <Route
        path="/groups/:groupId/expenses/:expenseId"
        element={<ProtectedRoute><ExpenseDetailPage /></ProtectedRoute>}
      />
      <Route path="/settlements" element={<ProtectedRoute><SettlementsPage /></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <AppRoutes />
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
