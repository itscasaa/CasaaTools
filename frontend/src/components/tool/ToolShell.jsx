import React from 'react'
import { Cpu } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card'

export default function ToolShell({ children, title = 'Snapshot Rebuilder', description = 'Submit public URLs below to begin local package generation.' }) {
  return (
    <Card className="w-full max-w-4xl mx-auto overflow-hidden" glass={true}>
      <CardHeader className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
          <Cpu className="w-4.5 h-4.5" />
        </div>
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {children}
      </CardContent>
    </Card>
  )
}