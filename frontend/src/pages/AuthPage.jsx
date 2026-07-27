import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Layers, ArrowRight, Lock, Mail, User, ShieldCheck } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { appConfig } from '../constants/appConfig'

export default function AuthPage() {
  const { login, register } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  
  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // UI states
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (isLogin) {
        await login(email, password)
      } else {
        await register(name, email, password)
        setSuccess('Akun berhasil dibuat! Mengalihkan...')
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#000000] text-neutral-200 flex flex-col justify-center items-center px-6 py-12 relative overflow-hidden">
      
      {/* Background Subtle Grid Texture */}
      <div className="absolute inset-0 bg-dots opacity-20 pointer-events-none z-0" />
      
      {/* Centered glowing purple orb behind card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-gradient-to-br from-[#6D5DFB]/10 to-transparent rounded-full blur-[80px] pointer-events-none z-0" />
      
      <div className="w-full max-w-md relative z-10 space-y-8">
        
        {/* Brand / Logo */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-black border border-white/10 shadow-lg shadow-[#6D5DFB]/5">
            <Layers className="w-6 h-6 text-[#6D5DFB]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight font-sans">
              {appConfig.name}
            </h2>
            <p className="text-xs text-neutral-500 mt-1 font-sans">
              {appConfig.tagline}
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-[#0f111a]/40 border border-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl shadow-black/80 hover:border-[#6D5DFB]/20 transition-all duration-300">
          
          {/* Tab Selector */}
          <div className="flex border-b border-white/5 pb-4 mb-6">
            <button
              onClick={() => {
                setIsLogin(true)
                setError('')
                setSuccess('')
              }}
              className={`flex-1 pb-2 text-sm font-semibold text-center transition-colors duration-200 outline-none ${
                isLogin ? 'text-white border-b-2 border-[#6D5DFB]' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Masuk
            </button>
            <button
              onClick={() => {
                setIsLogin(false)
                setError('')
                setSuccess('')
              }}
              className={`flex-1 pb-2 text-sm font-semibold text-center transition-colors duration-200 outline-none ${
                !isLogin ? 'text-white border-b-2 border-[#6D5DFB]' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Daftar Akun
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 text-xs bg-red-950/40 border border-red-900/60 text-red-400 rounded-lg">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 text-xs bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 rounded-lg flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Name Input (Register Only) */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-400" htmlFor="name">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama Lengkap"
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#6D5DFB] focus:ring-1 focus:ring-[#6D5DFB] transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-400" htmlFor="email">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#6D5DFB] focus:ring-1 focus:ring-[#6D5DFB] transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-400" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#6D5DFB] focus:ring-1 focus:ring-[#6D5DFB] transition-all"
                />
              </div>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full rounded-xl py-3 font-semibold text-sm tracking-wide bg-gradient-to-r from-[#6D5DFB] to-[#8B5CF6] hover:from-[#5B4CE2] hover:to-[#7C3AED] shadow-xl shadow-[#6D5DFB]/15 text-white transition-all duration-200 mt-2 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {loading ? (
                <span>Memuat...</span>
              ) : (
                <>
                  <span>{isLogin ? 'Masuk' : 'Daftar Sekarang'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Privacy Note */}
          <p className="text-[10px] text-neutral-600 text-center mt-6 leading-relaxed">
            Dengan mendaftar, Anda menyetujui Ketentuan Penggunaan dan Kebijakan Privasi {appConfig.name}. Akun disimpan secara lokal di peramban Anda.
          </p>

        </div>

      </div>
    </div>
  )
}
