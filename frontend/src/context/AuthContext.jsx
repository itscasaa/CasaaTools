import React, { createContext, useContext, useState, useEffect } from 'react'
import { appConfig } from '../constants/appConfig'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('casaa_user')
    return saved ? JSON.parse(saved) : null
  })
  
  const [token, setToken] = useState(() => {
    return localStorage.getItem('casaa_token') || null
  })

  const [initializing, setInitializing] = useState(true)

  // Verify token and sync user on start
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('casaa_token')
      if (storedToken) {
        try {
          const response = await fetch(`${appConfig.apiBaseUrl}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          })
          const data = await response.json()
          if (response.ok && data.success) {
            setUser(data.data.user)
            localStorage.setItem('casaa_user', JSON.stringify(data.data.user))
          } else {
            // Token expired or invalid
            logout()
          }
        } catch (err) {
          console.error('Failed to verify token:', err)
        }
      }
      setInitializing(false)
    }

    initAuth()
  }, [])

  const register = async (name, email, password) => {
    if (!name || !email || !password) {
      throw new Error('Semua kolom pendaftaran harus diisi.')
    }

    const response = await fetch(`${appConfig.apiBaseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, password })
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || 'Registrasi gagal.')
    }

    const { user: newUser, token: userToken } = data.data
    
    setToken(userToken)
    setUser(newUser)
    localStorage.setItem('casaa_token', userToken)
    localStorage.setItem('casaa_user', JSON.stringify(newUser))
    return newUser
  }

  const login = async (email, password) => {
    if (!email || !password) {
      throw new Error('Email dan password harus diisi.')
    }

    const response = await fetch(`${appConfig.apiBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || 'Email atau password salah.')
    }

    const { user: loggedInUser, token: userToken } = data.data

    setToken(userToken)
    setUser(loggedInUser)
    localStorage.setItem('casaa_token', userToken)
    localStorage.setItem('casaa_user', JSON.stringify(loggedInUser))
    return loggedInUser
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('casaa_token')
    localStorage.removeItem('casaa_user')
  }

  // Get token helper for other API calls
  const getAuthHeader = () => {
    const activeToken = token || localStorage.getItem('casaa_token')
    return activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {}
  }

  return (
    <AuthContext.Provider value={{ user, setUser, token, register, login, logout, getAuthHeader, initializing }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
