import React from 'react'

export const Card = ({ className = '', glass = true, children, ...props }) => {
  return (
    <div
      className={`${
        glass 
          ? 'glass-card' 
          : 'bg-[#0A0A16] border border-[#14142B]'
      } rounded-3xl overflow-hidden shadow-2xl ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export const CardHeader = ({ className = '', children, ...props }) => {
  return (
    <div className={`p-6 pb-4 border-b border-white/[0.06] ${className}`} {...props}>
      {children}
    </div>
  )
}

export const CardTitle = ({ className = '', children, ...props }) => {
  return (
    <h3 className={`text-base font-bold text-[#F8FAFC] tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  )
}

export const CardDescription = ({ className = '', children, ...props }) => {
  return (
    <p className={`text-xs text-[#A1A1AA] mt-1 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  )
}

export const CardContent = ({ className = '', children, ...props }) => {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  )
}

export const CardFooter = ({ className = '', children, ...props }) => {
  return (
    <div className={`p-6 pt-4 border-t border-white/[0.06] bg-black/20 ${className}`} {...props}>
      {children}
    </div>
  )
}
