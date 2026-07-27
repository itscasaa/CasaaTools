import React, { useState } from 'react'
import { User, Lock, Calendar, ShieldAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { appConfig } from '../constants/appConfig'

export default function ProfilePage() {
  const { user, setUser, getAuthHeader } = useAuth()

  // Profile Form State
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [profileLoading, setProfileLoading] = useState(false)

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Feedback notifications
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')
  const [showToast, setShowToast] = useState(false)

  const showFeedback = (message, type = 'success') => {
    setToastMessage(message)
    setToastType(type)
    setShowToast(true)
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) {
      showFeedback('Nama dan email harus diisi.', 'error')
      return
    }

    setProfileLoading(true)
    try {
      const response = await fetch(`${appConfig.apiBaseUrl}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ name, email })
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Gagal memperbarui profil.')
      }

      // Update global context & local storage
      const updatedUser = data.data.user
      setUser(updatedUser)
      localStorage.setItem('casaa_user', JSON.stringify(updatedUser))

      showFeedback('Profil Anda berhasil diperbarui.')
    } catch (err) {
      showFeedback(err.message, 'error')
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) {
      showFeedback('Semua kolom kata sandi harus diisi.', 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      showFeedback('Konfirmasi kata sandi baru tidak cocok.', 'error')
      return
    }

    if (newPassword.length < 6) {
      showFeedback('Kata sandi baru minimal harus 6 karakter.', 'error')
      return
    }

    setPasswordLoading(true)
    try {
      const response = await fetch(`${appConfig.apiBaseUrl}/api/auth/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ currentPassword, newPassword })
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Gagal memperbarui kata sandi.')
      }

      // Clear input fields
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      showFeedback('Kata sandi Anda berhasil diperbarui.')
    } catch (err) {
      showFeedback(err.message, 'error')
    } finally {
      setPasswordLoading(false)
    }
  }

  // Formatting date
  const joinedDate = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-'

  return (
    <>
      <div className="space-y-6">
        
        {/* Page Header */}
        <div className="select-none">
          <h1 className="text-xl font-bold text-white tracking-tight font-sans">
            Profile Settings
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Manage your personal credentials, identity info, and login configuration.
          </p>
        </div>

        {/* Outer Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Summary Card (4 cols) */}
          <div className="lg:col-span-4 bg-[#0f111a] border border-white/5 rounded-xl p-6 flex flex-col items-center text-center space-y-6">
            
            {/* Avatar Circle */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white text-3xl font-extrabold border border-white/10 select-none shadow-xl shadow-blue-500/10">
              {user?.name?.slice(0, 2).toUpperCase() || 'US'}
            </div>

            <div className="space-y-1">
              <h2 className="text-md font-bold text-white tracking-tight truncate max-w-full">
                {user?.name}
              </h2>
              <p className="text-xs text-neutral-400 truncate max-w-full font-mono">
                {user?.email}
              </p>
            </div>

            <div className="w-full border-t border-white/5 pt-4 space-y-3 font-sans text-xs text-left">
              <div className="flex justify-between items-center py-1">
                <span className="text-neutral-500 font-medium">Access Level</span>
                <span className={`font-bold px-2 py-0.5 rounded border text-[10px] uppercase font-mono tracking-wider ${
                  user?.role === 'admin' 
                    ? 'text-blue-400 bg-blue-950/20 border-blue-900/30' 
                    : 'text-amber-400 bg-amber-950/20 border-amber-900/30'
                }`}>
                  {user?.role === 'admin' ? 'Administrator' : 'Standard User'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-neutral-500 font-medium">Account ID</span>
                <span className="text-neutral-300 font-mono text-[10px]">
                  {user?.id}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-neutral-500 font-medium">Joined Date</span>
                <span className="text-neutral-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                  {joinedDate}
                </span>
              </div>
            </div>

          </div>

          {/* Right Forms Area (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Form 1: Identity Profile Details */}
            <div className="bg-[#0f111a] border border-white/5 rounded-xl p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <User className="w-4 h-4 text-blue-500" />
                <h3 className="text-xs font-bold text-white tracking-wider uppercase font-sans">
                  Identity Details
                </h3>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="pname" className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">
                      Full Name
                    </label>
                    <input
                      id="pname"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#12131e]/50 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                      placeholder="e.g. John Doe"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="pemail" className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">
                      Email Address
                    </label>
                    <input
                      id="pemail"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#12131e]/50 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                      placeholder="user@gmail.com"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    loading={profileLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-xs font-semibold"
                  >
                    Save Profile
                  </Button>
                </div>
              </form>
            </div>

            {/* Form 2: Change Password */}
            <div className="bg-[#0f111a] border border-white/5 rounded-xl p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Lock className="w-4 h-4 text-blue-500" />
                <h3 className="text-xs font-bold text-white tracking-wider uppercase font-sans">
                  Change Password
                </h3>
              </div>

              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="currpass" className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">
                    Current Password
                  </label>
                  <input
                    id="currpass"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-[#12131e]/50 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="newpass" className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">
                      New Password
                    </label>
                    <input
                      id="newpass"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-[#12131e]/50 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                      placeholder="Min 6 characters"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="confpass" className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">
                      Confirm New Password
                    </label>
                    <input
                      id="confpass"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#12131e]/50 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                      placeholder="Repeat password"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    loading={passwordLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-xs font-semibold"
                  >
                    Update Password
                  </Button>
                </div>
              </form>
            </div>

          </div>

        </div>

      </div>

      {/* Toast popup alerts */}
      <Toast
        message={toastMessage}
        type={toastType}
        show={showToast}
        onClose={() => setShowToast(false)}
      />
    </>
  )
}
