import React from 'react'
import { Badge } from '../ui/Badge'
import { CheckCircle2, AlertCircle, Loader2, Hourglass } from 'lucide-react'

export default function StatusBadge({ status = 'queued' }) {
  const configs = {
    queued: { variant: 'neutral', label: 'Queued', icon: <Hourglass className="w-3 h-3" /> },
    running: { variant: 'primary', label: 'Running', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    completed: { variant: 'success', label: 'Completed', icon: <CheckCircle2 className="w-3 h-3" /> },
    done: { variant: 'success', label: 'Completed', icon: <CheckCircle2 className="w-3 h-3" /> },
    failed: { variant: 'error', label: 'Failed', icon: <AlertCircle className="w-3 h-3" /> }
  }

  const current = configs[status] || configs.queued

  return (
    <Badge variant={current.variant} className="flex gap-1 items-center px-3 py-1">
      {current.icon}
      <span>{current.label}</span>
    </Badge>
  )
}