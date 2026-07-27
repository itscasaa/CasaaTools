import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function ProtectedRoute({ children }) {
  const { user, initializing } = useAuth()

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#090a0f] flex items-center justify-center text-sm font-mono text-neutral-400">
        Memuat sesi...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
