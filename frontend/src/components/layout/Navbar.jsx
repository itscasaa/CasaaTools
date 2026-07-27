import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, LogOut } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [activeSection, setActiveSection] = useState('')
  const location = useLocation()
  const { user, logout } = useAuth()

  const publicPages = ['/', '/features', '/workflow', '/ethical-use', '/faq']
  const isPublicPage = publicPages.includes(location.pathname)

  const navLinks = isPublicPage
    ? [
        { href: '/', label: 'Home', isRoute: true },
        { href: '/features', label: 'Features', isRoute: true },
        { href: '/workflow', label: 'Workflow', isRoute: true },
        { href: '/ethical-use', label: 'Ethical Use', isRoute: true },
        { href: '/faq', label: 'FAQ', isRoute: true }
      ]
    : [
        { href: '/dashboard', label: 'Dashboard', isRoute: true },
        { href: '/scanner', label: 'Scanner', isRoute: true },
        { href: '/history', label: 'History', isRoute: true }
      ]

  const handleLinkClick = (href, isRoute, e) => {
    setMobileMenuOpen(false)
  }

  return (
    <header className="fixed top-5 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-4xl z-50 transition-all duration-300">
      
      {/* Sleek Translucent Glass Container - Styled to fit tech-neon theme */}
      <div className="bg-[#090a0f]/75 backdrop-blur-xl border border-white/5 rounded-full p-1.5 flex items-center justify-between shadow-2xl shadow-black/80 relative">
        
        {/* Left Side: Dark gradient circle with custom neon Saturn SVG */}
        <Link 
          to="/" 
          className="w-10 h-10 rounded-full bg-gradient-to-br from-neutral-900 to-black border border-white/10 flex items-center justify-center text-white shadow-md select-none hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shrink-0 ml-0.5"
          aria-label="Home"
        >
          <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="planetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#d946ef" />
              </linearGradient>
            </defs>
            <g transform="rotate(-20 12 12)">
              {/* Back part of the ring */}
              <path 
                d="M 2 12 A 10 3.5 0 0 1 22 12" 
                stroke="#a78bfa" 
                strokeWidth="1.8" 
                strokeLinecap="round" 
                opacity="0.8"
              />
              {/* Planet sphere body with white stroke mask */}
              <circle 
                cx="12" 
                cy="12" 
                r="5.5" 
                fill="url(#planetGrad)" 
                stroke="#121212" 
                strokeWidth="1.2" 
              />
              {/* Front part of the ring */}
              <path 
                d="M 2 12 A 10 3.5 0 0 0 22 12" 
                stroke="#ffffff" 
                strokeWidth="1.8" 
                strokeLinecap="round" 
              />
            </g>
          </svg>
        </Link>

        {/* Center: Navigation Links (Desktop Only) with sliding active/hover capsule */}
        <nav className="hidden md:flex items-center gap-7 px-4">
          {navLinks.map((link, index) => {
            const isActive = location.pathname === link.href;

            const linkClass = `relative z-10 block py-1.5 px-3 text-[13px] font-medium tracking-wide transition-colors duration-200 select-none cursor-pointer ${
              isActive ? 'text-white' : 'text-neutral-400 hover:text-white'
            }`;

            return (
              <div 
                key={link.label} 
                className="relative"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {link.isRoute ? (
                  <Link
                    to={link.href}
                    className={linkClass}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    href={link.href}
                    onClick={(e) => handleLinkClick(link.href, false, e)}
                    className={linkClass}
                  >
                    {link.label}
                  </a>
                )}

                {/* Active Capsule Indicator */}
                {isActive && (
                  <motion.span
                    layoutId="activePill"
                    className="absolute inset-0 bg-white/5 border border-white/10 rounded-full z-0"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}

                {/* Hover Capsule Indicator */}
                {hoveredIndex === index && !isActive && (
                  <motion.span
                    layoutId="hoverPill"
                    className="absolute inset-0 bg-white/[0.03] border border-white/[0.05] rounded-full z-0"
                    transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                  />
                )}
              </div>
            )
          })}
        </nav>

        {/* Right Side: Themed Gradient CTA Button & Mobile Menu Toggle */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="hidden md:flex items-center gap-2 mr-0.5">
              {/* User Email Pill (Sleek dark glass look) */}
              <Link 
                to="/dashboard" 
                className="rounded-full bg-white/5 border border-white/10 text-neutral-300 hover:text-white px-4.5 h-10 flex items-center justify-center text-xs font-semibold hover:bg-white/10 active:scale-95 transition-all duration-200 shadow-sm shrink-0"
                title={`Dashboard (${user.email})`}
              >
                {user.email.length > 22 ? `${user.email.slice(0, 20)}...` : user.email}
              </Link>
              {/* Logout button */}
              <button 
                onClick={logout}
                className="p-2 text-neutral-400 hover:text-red-400 transition-colors duration-150 rounded-full hover:bg-neutral-800/40"
                title="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link 
              to="/login" 
              className="hidden md:flex rounded-full bg-gradient-to-r from-[#6D5DFB] to-[#8B5CF6] hover:from-[#5B4CE2] hover:to-[#7C3AED] text-white px-5 h-10 items-center justify-center text-xs font-semibold shadow-md shadow-[#6D5DFB]/15 active:scale-95 transition-all duration-200 shrink-0 mr-0.5"
            >
              Sign In
            </Link>
          )}

          {/* Hamburger Menu Icon (Mobile Only) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-850/50 transition-all duration-200 outline-none mr-1"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer (Matches theme) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="md:hidden mt-2 mx-1 p-5 rounded-3xl bg-[#090a0f]/95 backdrop-blur-xl border border-white/5 shadow-2xl flex flex-col gap-4 relative z-40"
          >
            {user && (
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-1">
                <div className="flex flex-col">
                  <div className="text-xs font-bold text-white leading-none">{user.name}</div>
                  <div className="text-[10px] text-neutral-400 mt-1 leading-none truncate max-w-[200px]">{user.email}</div>
                </div>
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false)
                    logout()
                  }}
                  className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-red-400 py-1 px-2.5 rounded-full bg-neutral-800/60 border border-white/5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar</span>
                </button>
              </div>
            )}

            <div className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.href;

                const itemClass = `px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive ? 'text-white bg-gradient-to-r from-blue-600 to-violet-600' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                }`;

                if (link.isRoute) {
                  return (
                    <Link
                      key={link.label}
                      to={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={itemClass}
                    >
                      {link.label}
                    </Link>
                  )
                }
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={(e) => handleLinkClick(link.href, false, e)}
                    className={itemClass}
                  >
                    {link.label}
                  </a>
                )
              })}
            </div>

            {!user && (
              <Link 
                to="/login" 
                onClick={() => setMobileMenuOpen(false)}
                className="w-full mt-2"
              >
                <button className="w-full rounded-xl py-3 text-xs font-semibold bg-gradient-to-r from-[#6D5DFB] to-[#8B5CF6] hover:from-[#5B4CE2] hover:to-[#7C3AED] text-white active:scale-95 transition-all">
                  Sign In
                </button>
              </Link>
            )}

            {user && (
              <Link 
                to="/dashboard" 
                onClick={() => setMobileMenuOpen(false)}
                className="w-full mt-2"
              >
                <button className="w-full rounded-xl py-3 text-xs font-semibold bg-gradient-to-r from-[#6D5DFB] to-[#8B5CF6] hover:from-[#5B4CE2] hover:to-[#7C3AED] text-white active:scale-95 transition-all">
                  Dashboard
                </button>
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </header>
  )
}