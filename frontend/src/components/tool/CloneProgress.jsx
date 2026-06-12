import React from 'react'
import { Progress } from '../ui/Progress'

export default function CloneProgress({ progress, currentStep }) {
  return (
    <div className="space-y-3.5 bg-black/20 p-5 rounded-xl border border-white/5">
      <div className="flex justify-between items-center text-xs font-semibold">
        <span className="text-gray-400">Current Phase:</span>
        <span className="text-blue-400 animate-pulse">{currentStep}</span>
      </div>
      <Progress value={progress} showLabel={true} variant="primary" />
    </div>
  )
}