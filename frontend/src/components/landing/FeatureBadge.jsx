import React from 'react'
import { Check } from 'lucide-react'

export default function FeatureBadge({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 shadow-lg shadow-indigo-500/5 transition-all duration-200 hover:bg-indigo-500/15">
      <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
      {children}
    </span>
  )
}