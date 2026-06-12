import React from 'react'

export const Tabs = ({
  tabs = [],
  activeTab = '',
  onChange = () => {},
  className = '',
  ...props
}) => {
  return (
    <div className={`flex border-b border-border/60 overflow-x-auto ${className}`} {...props}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-medium transition-all duration-200 whitespace-nowrap outline-none focus-visible:bg-white/5 ${
              isActive 
                ? 'border-blue-500 text-blue-400 font-semibold' 
                : 'border-transparent text-gray-400 hover:text-white hover:border-border'
            }`}
          >
            {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
