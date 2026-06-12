import React, { useEffect } from 'react'
import { X, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react'

export const Toast = ({
  message = '',
  type = 'info', // success, warning, error, info
  show = false,
  onClose = () => {},
  duration = 5000,
  className = ''
}) => {
  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [show, duration, onClose])

  if (!show) return null

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400" />,
    info: <AlertCircle className="w-5 h-5 text-blue-400" />
  }

  const borders = {
    success: 'border-emerald-500/20 bg-emerald-500/5',
    warning: 'border-amber-500/20 bg-amber-500/5',
    error: 'border-rose-500/20 bg-rose-500/5',
    info: 'border-blue-500/20 bg-blue-500/5'
  }

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:bottom-5 md:right-5 z-50 max-w-[calc(100vw-32px)] md:max-w-[420px] w-full flex items-start justify-between gap-3 p-4 rounded-xl border glass-panel shadow-2xl animate-slide-in ${borders[type]} ${className}`}>
      <div className="flex items-start gap-3 flex-1 text-left">
        <div className="shrink-0 mt-0.5">
          {icons[type]}
        </div>
        <p className="text-xs font-medium text-white leading-relaxed">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 outline-none shrink-0"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
