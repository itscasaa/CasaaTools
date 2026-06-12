import React from 'react'

export const Button = React.forwardRef(({
  className = '',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  type = 'button',
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-[#6D5DFB]/50 active:scale-95 disabled:pointer-events-none disabled:opacity-40 select-none'
  
  const variants = {
    primary: 'bg-gradient-to-r from-[#6D5DFB] to-[#8B5CF6] text-white hover:opacity-90 active:from-[#5B4CE2] active:to-[#7C3AED] shadow-xl shadow-[#6D5DFB]/15',
    secondary: 'bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.15] text-[#F8FAFC] active:bg-white/[0.12] backdrop-blur',
    outline: 'border border-white/10 hover:bg-white/5 active:bg-white/10 text-gray-300 hover:text-white',
    ghost: 'text-gray-400 hover:bg-white/5 hover:text-white active:bg-white/10',
    danger: 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 active:bg-red-500/30'
  }

  const sizes = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base'
  }

  return (
    <button
      ref={ref}
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  )
})

Button.displayName = 'Button'
