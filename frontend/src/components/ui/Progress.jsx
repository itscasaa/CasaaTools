import React from 'react'

export const Progress = ({
  value = 0,
  className = '',
  variant = 'primary',
  showLabel = false,
  ...props
}) => {
  const cleanValue = Math.min(100, Math.max(0, value))

  const variants = {
    primary: 'bg-primary',
    secondary: 'bg-secondary'
  }

  return (
    <div className={`w-full ${className}`} {...props}>
      <div className="flex justify-between items-center mb-1.5 text-xs text-muted">
        {showLabel && (
          <>
            <span>Progress</span>
            <span className="font-semibold text-white">{Math.round(cleanValue)}%</span>
          </>
        )}
      </div>
      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out relative ${variants[variant]}`}
          style={{ width: `${cleanValue}%` }}
        >
          {/* Subtle glow edge effect */}
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/30 blur-xs" />
        </div>
      </div>
    </div>
  )
}
