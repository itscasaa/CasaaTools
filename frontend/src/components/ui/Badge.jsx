import React from 'react'

export const Badge = ({
  className = '',
  variant = 'neutral',
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold select-none border'

  const variants = {
    primary: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    secondary: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    error: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    neutral: 'bg-gray-500/10 border-white/5 text-gray-400',
    outline: 'border-border bg-transparent text-gray-300'
  }

  return (
    <span
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
