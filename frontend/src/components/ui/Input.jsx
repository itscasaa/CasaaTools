import React from 'react'

export const Input = React.forwardRef(({
  className = '',
  type = 'text',
  error = false,
  icon = null,
  disabled = false,
  ...props
}, ref) => {
  return (
    <div className="relative w-full">
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#71717A]">
          {icon}
        </div>
      )}
      <input
        ref={ref}
        type={type}
        disabled={disabled}
        className={`w-full bg-white/[0.02] border backdrop-blur ${
          error 
            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' 
            : 'border-white/[0.08] focus:border-[#6D5DFB] focus:ring-[#6D5DFB]/20 hover:border-white/[0.15]'
        } ${
          icon ? 'pl-11' : 'pl-4'
        } pr-4 py-3 rounded-xl text-sm text-[#F8FAFC] placeholder-[#71717A] transition-all duration-300 outline-none focus:ring-4 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
    </div>
  )
})

Input.displayName = 'Input'
