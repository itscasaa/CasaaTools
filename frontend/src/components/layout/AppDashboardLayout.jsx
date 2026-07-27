import React, { useState } from 'react'
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { 
  LayoutDashboard, ShieldAlert, History, User, Settings, HelpCircle, 
  Search, Bell, RefreshCw, Moon, LogOut, Phone, Mail, MessageSquare, ChevronRight, Menu, X, Plus,
  Cpu, Sparkles, FolderPlus
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { 
  SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, 
  SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, 
  SidebarTrigger, SidebarInset, useSidebar 
} from '../ui/Sidebar'
import { motion, AnimatePresence } from 'framer-motion'

function InnerLayout({ children, activePage: propActivePage }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { open, isMobile } = useSidebar()
  const [searchQuery, setSearchQuery] = useState('')

  // Automatically calculate activePage based on current URL path
  let activePage = propActivePage
  if (!activePage) {
    const pathname = location.pathname
    if (pathname.includes('/rebuild')) activePage = 'rebuild'
    else if (pathname.includes('/stack-scanner')) activePage = 'stack-scanner'
    else if (pathname.includes('/prompt-generator')) activePage = 'prompt-generator'
    else if (pathname.includes('/project-scaffold')) activePage = 'project-scaffold'
    else if (pathname.includes('/scanner')) activePage = 'scanner'
    else if (pathname.includes('/history')) activePage = 'history'
    else if (pathname.includes('/profile')) activePage = 'profile'
    else if (pathname.includes('/settings')) activePage = 'settings'
    else activePage = 'overview' // Default overview /dashboard
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const settingsItems = [
    { id: 'profile', label: 'Profile', path: '/profile', icon: User },
    ...(user?.role === 'admin' ? [{ id: 'settings', label: 'Settings', path: '/settings', icon: Settings }] : []),
    { id: 'help', label: 'Help Centre', path: '/', icon: HelpCircle }
  ]

  const navItems = {
    dashboards: [
      { id: 'overview', label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
      { id: 'rebuild', label: 'Rebuilder', path: '/rebuild', icon: Plus },
      { id: 'stack-scanner', label: 'Stack Scanner', path: '/stack-scanner', icon: Cpu },
      { id: 'prompt-generator', label: 'Prompt Generator', path: '/prompt-generator', icon: Sparkles },
      { id: 'project-scaffold', label: 'Project Scaffold', path: '/project-scaffold', icon: FolderPlus },
      { id: 'scanner', label: 'Scanner', path: '/scanner', icon: ShieldAlert },
      { id: 'history', label: 'History', path: '/history', icon: History }
    ],
    settings: settingsItems
  }

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-neutral-200 w-full relative">
      
      {/* Sleek architectural grid layout background */}
      <div className="absolute inset-0 bg-dots opacity-[0.15] pointer-events-none z-0" />
      
      {/* Left Sidebar */}
      <Sidebar className="z-30 relative shrink-0">
        
        {/* Header Profile */}
        <SidebarHeader>
          <div className={`flex items-center overflow-hidden ${open ? 'gap-3 w-full' : 'justify-center mx-auto'}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white font-bold border border-white/10 shrink-0 select-none">
              {user?.name?.slice(0, 2).toUpperCase() || 'US'}
            </div>
            {open && (
              <motion.div 
                initial={false}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="min-w-0 flex flex-col justify-center"
              >
                <div className="text-xs font-semibold text-white truncate leading-tight select-none">{user?.name || 'User Sesi'}</div>
                <div className="text-[10px] text-neutral-500 truncate font-mono mt-0.5 select-none">{user?.email || 'user@example.com'}</div>
              </motion.div>
            )}
          </div>
        </SidebarHeader>

        {/* Search Bar - hidden on collapsed */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 border-b border-white/5 shrink-0"
            >
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#12131e]/50 border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Links */}
        <SidebarContent>
          
          {/* Group: Dashboards */}
          <SidebarGroup>
            <SidebarGroupLabel>Dashboards</SidebarGroupLabel>
            <SidebarMenu>
              {navItems.dashboards.map(item => {
                const Icon = item.icon
                const isActive = activePage === item.id
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton isActive={isActive} asChild>
                      <Link to={item.path}>
                        <Icon className="w-4 h-4 shrink-0" />
                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 'auto' }}
                              exit={{ opacity: 0, width: 0 }}
                              className="truncate whitespace-nowrap text-xs font-medium"
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>

          {/* Group: Settings */}
          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarMenu>
              {navItems.settings.map(item => {
                const Icon = item.icon
                const isActive = activePage === item.id
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton isActive={isActive} asChild>
                      <Link to={item.path}>
                        <Icon className="w-4 h-4 shrink-0" />
                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 'auto' }}
                              exit={{ opacity: 0, width: 0 }}
                              className="truncate whitespace-nowrap text-xs font-medium"
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>

        </SidebarContent>

        {/* Bottom brand logo / Logout */}
        <SidebarFooter>
          {/* Custom Brand matching navbar logo */}
          <div className={`flex items-center rounded-xl bg-white/[0.01] border border-white/5 select-none ${open ? 'p-2 gap-2.5 justify-start' : 'p-1 justify-center'}`}>
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neutral-900 to-black border border-white/10 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="planetGradLayout" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <g transform="rotate(-20 12 12)">
                  <circle cx="12" cy="12" r="6" fill="url(#planetGradLayout)" />
                  <path d="M 2 12 A 10 3.5 0 0 0 22 12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                </g>
              </svg>
            </div>
            {open && (
              <motion.span 
                initial={false}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="text-[10px] font-bold text-white tracking-widest font-sans uppercase truncate"
              >
                CasaaTools
              </motion.span>
            )}
          </div>
          
          <button 
            onClick={handleLogout}
            className={`flex items-center rounded-xl text-xs font-semibold text-neutral-400 hover:text-red-400 hover:bg-red-500/[0.05] transition-all border border-transparent ${open ? 'w-full p-2.5 gap-3 justify-start' : 'w-10 h-10 justify-center mx-auto'}`}
            title="Sign Out"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {open && (
              <motion.span
                initial={false}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="truncate whitespace-nowrap text-xs"
              >
                Sign Out
              </motion.span>
            )}
          </button>
        </SidebarFooter>
      </Sidebar>

      {/* Main content body */}
      <SidebarInset>
        {/* Top Breadcrumb Bar */}
        <header className="h-14 md:h-16 border-b border-white/5 px-4 md:px-6 flex items-center justify-between shrink-0 select-none bg-[#090a0f]/40 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <SidebarTrigger />
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 tracking-wide font-sans truncate">
              <span className="hidden sm:inline">Dashboards</span>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-600 hidden sm:block" />
              <span className="text-white capitalize truncate">{activePage}</span>
            </div>
          </div>

          {/* Top Right Quick Actions */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <button 
              onClick={() => window.location.reload()}
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-white/5 transition-all"
              title="Refresh Page"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button 
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-white/5 transition-all relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 border border-[#090a0f]" />
            </button>
            <div className="w-px h-5 bg-white/10" />
            <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-neutral-300 select-none uppercase">
              {user?.name?.slice(0, 1) || 'U'}
            </div>
          </div>
        </header>

        {/* Children Content Panel */}
        <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0 relative z-10">
          <div className="max-w-[1600px] mx-auto w-full">
            {children || <Outlet />}
          </div>
        </div>
      </SidebarInset>

    </div>
  )
}

export default function AppDashboardLayout({ children, activePage }) {
  return (
    <InnerLayout children={children} activePage={activePage} />
  )
}
