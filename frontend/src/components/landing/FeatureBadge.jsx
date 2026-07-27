import React from 'react'
import { Check } from 'lucide-react'

export default function FeatureBadge({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-primary/5 border border-primary/20 text-[#60a5fa]">
      <Check className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
      {children}
    </span>
  )
}