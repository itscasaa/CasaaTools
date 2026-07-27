import React, { createContext, useContext, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PanelLeft, Menu, X } from 'lucide-react'

// Create context
const SidebarContext = createContext(null)

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

export function SidebarProvider({ 
  children, 
  defaultOpen = true, 
  open: controlledOpen, 
  onOpenChange 
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [openMobile, setOpenMobile] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const isControlled = controlledOpen !== undefined
  const activeOpen = isControlled ? controlledOpen : open

  // Update open state
  const handleOpenChange = (value) => {
    if (onOpenChange) {
      onOpenChange(value)
    }
    if (!isControlled) {
      setOpen(value)
    }
  }

  // Toggle function
  const toggleSidebar = () => {
    if (isMobile) {
      setOpenMobile(prev => !prev)
    } else {
      handleOpenChange(!activeOpen)
    }
  }

  // Monitor screen width for mobile view
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setOpenMobile(false)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeOpen, isMobile])

  return (
    <SidebarContext.Provider
      value={{
        open: activeOpen,
        setOpen: handleOpenChange,
        openMobile,
        setOpenMobile,
        isMobile,
        toggleSidebar
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export const Sidebar = React.forwardRef(({ className = '', children, ...props }, ref) => {
  const { open, openMobile, setOpenMobile, isMobile } = useSidebar()

  if (isMobile) {
    return (
      <AnimatePresence>
        {openMobile && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenMobile(false)}
              className="fixed inset-0 bg-black z-40 md:hidden"
            />
            {/* Drawer */}
            <motion.aside
              ref={ref}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              data-lenis-prevent="true"
              className={`fixed left-0 top-0 bottom-0 w-64 bg-[#090a0f] border-r border-white/5 z-50 flex flex-col p-4 ${className}`}
              {...props}
            >
              {/* Close Button */}
              <div className="flex justify-end mb-2">
                <button 
                  onClick={() => setOpenMobile(false)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {children}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    )
  }

  return (
    <motion.aside
      ref={ref}
      initial={false}
      animate={{ width: open ? 256 : 64 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      data-lenis-prevent="true"
      className={`h-screen sticky top-0 bg-[#090a0f] border-r border-white/5 flex flex-col shrink-0 overflow-x-hidden ${className}`}
      {...props}
    >
      {children}
    </motion.aside>
  )
})
Sidebar.displayName = 'Sidebar'

export function SidebarHeader({ children, className = '' }) {
  const { open } = useSidebar()
  return (
    <div className={`border-b border-white/5 shrink-0 flex items-center min-h-[72px] transition-all duration-200 ${
      open ? 'p-4 justify-start' : 'p-2 justify-center'
    } ${className}`}>
      {children}
    </div>
  )
}

export function SidebarContent({ children, className = '' }) {
  const { open } = useSidebar()
  return (
    <div 
      data-lenis-prevent="true"
      className={`flex-1 overflow-y-auto overflow-x-hidden py-4 transition-all duration-200 ${
        open ? 'px-3 space-y-6' : 'px-2 space-y-4'
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function SidebarFooter({ children, className = '' }) {
  const { open } = useSidebar()
  return (
    <div className={`border-t border-white/5 shrink-0 bg-[#090a0f] transition-all duration-200 ${
      open ? 'p-4 space-y-2' : 'p-2 space-y-1.5'
    } ${className}`}>
      {children}
    </div>
  )
}

export function SidebarGroup({ children, className = '' }) {
  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      {children}
    </div>
  )
}

export function SidebarGroupLabel({ children, className = '' }) {
  const { open } = useSidebar()
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={`px-3 text-[10px] font-bold text-neutral-500 tracking-wider uppercase font-mono mb-2 select-none truncate ${className}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function SidebarMenu({ children, className = '' }) {
  return (
    <nav className={`space-y-1 w-full ${className}`}>
      {children}
    </nav>
  )
}

export function SidebarMenuItem({ children, className = '' }) {
  return (
    <div className={`w-full ${className}`}>
      {children}
    </div>
  )
}

export const SidebarMenuButton = React.forwardRef(({ 
  children, 
  asChild = false, 
  className = '', 
  isActive = false, 
  ...props 
}, ref) => {
  const { open } = useSidebar()
  
  const baseClasses = `flex items-center rounded-xl text-xs font-semibold select-none transition-all duration-150 border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/50 ${
    isActive 
      ? 'bg-[#0f111a] border-white/10 text-white shadow-sm' 
      : 'border-transparent text-neutral-400 hover:text-white hover:bg-white/[0.02]'
  } ${open ? 'w-full px-3 py-2.5 justify-start gap-3' : 'w-10 h-10 justify-center mx-auto'} ${className}`

  if (asChild) {
    const child = React.Children.only(children)
    return React.cloneElement(child, {
      ref,
      className: `${baseClasses} ${child.props.className || ''}`,
      ...props
    })
  }

  return (
    <button ref={ref} className={baseClasses} {...props}>
      {children}
    </button>
  )
})
SidebarMenuButton.displayName = 'SidebarMenuButton'

export function SidebarTrigger({ className = '' }) {
  const { open, toggleSidebar, isMobile } = useSidebar()

  if (isMobile) {
    return (
      <button
        onClick={toggleSidebar}
        className={`p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 ${className}`}
        title="Toggle Menu"
      >
        <Menu className="w-5 h-5" />
      </button>
    )
  }

  return (
    <button
      onClick={toggleSidebar}
      className={`p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-200 ${className}`}
      title="Toggle Sidebar (Ctrl+B)"
    >
      <PanelLeft className="w-4 h-4" />
    </button>
  )
}

export function SidebarInset({ children, className = '' }) {
  return (
    <div className={`flex-1 flex flex-col min-w-0 bg-[#090a0f] ${className}`}>
      {children}
    </div>
  )
}
