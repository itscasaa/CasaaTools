import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Lenis from 'lenis'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import FeaturesPage from './pages/FeaturesPage'
import WorkflowPage from './pages/WorkflowPage'
import EthicalUsePage from './pages/EthicalUsePage'
import FAQPage from './pages/FAQPage'
import DashboardPage from './pages/DashboardPage'
import ResultPage from './pages/ResultPage'
import HistoryPage from './pages/HistoryPage'
import ScannerPage from './pages/ScannerPage'
import StackScannerPage from './pages/StackScannerPage'
import PromptGeneratorPage from './pages/PromptGeneratorPage'
import ProjectScaffoldPage from './pages/ProjectScaffoldPage'
import RebuildPage from './pages/RebuildPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AppDashboardLayout from './components/layout/AppDashboardLayout'
import { SidebarProvider } from './components/ui/Sidebar'
import { GlobalCurtain } from './pages/PageTransition'

function AppContent() {
  const { user, initializing } = useAuth()

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
      smoothWheel: true
    })

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
    }
  }, [])

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#090a0f] flex items-center justify-center text-sm font-mono text-neutral-500">
        Memuat sesi...
      </div>
    )
  }

  return (
    <Routes>
      {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/workflow" element={<WorkflowPage />} />
        <Route path="/ethical-use" element={<EthicalUsePage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route 
          path="/login" 
          element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
        />
        <Route 
          path="/register" 
          element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} 
        />

        {/* Protected Private Routes */}
        <Route 
          element={
            <ProtectedRoute>
              <AppDashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/scanner" element={<ScannerPage />} />
          <Route path="/stack-scanner" element={<StackScannerPage />} />
          <Route path="/prompt-generator" element={<PromptGeneratorPage />} />
          <Route path="/project-scaffold" element={<ProjectScaffoldPage />} />
          <Route path="/rebuild" element={<RebuildPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route 
            path="/settings" 
            element={
              user?.role === 'admin' ? <SettingsPage /> : <Navigate to="/dashboard" replace />
            } 
          />
        </Route>

        <Route 
          path="/result/:jobId" 
          element={
            <ProtectedRoute>
              <ResultPage />
            </ProtectedRoute>
          } 
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <SidebarProvider>
        <Router>
          <AppContent />
        </Router>
      </SidebarProvider>
    </AuthProvider>
  )
}