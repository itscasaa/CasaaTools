import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Layers, Menu, X, ArrowUpRight } from 'lucide-react'
import { Button } from '../ui/Button'
import { appConfig } from '../../constants/appConfig'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  const navLinks = [
    { href: '/', label: 'Home', isRoute: true },
    { href: '/history', label: 'History', isRoute: true },
    { href: '/scanner', label: 'Scanner', isRoute: true },
    { href: '#features', label: 'Features' },
    { href: '#workflow', label: 'Workflow' },
    { href: '#showcase', label: 'Showcase' },
    { href: '#faq', label: 'FAQ' }
  ]

  const handleLinkClick = (href, isRoute, e) => {
    setMobileMenuOpen(false)
    if (isRoute) return

    if (href.startsWith('#')) {
      e.preventDefault()
      if (location.pathname !== '/') {
        window.location.href = '#/' + href
      } else {
        const element = document.getElementById(href === '#' ? 'root' : href.slice(1))
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  return (
    <header className="fixed top-5 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-5xl z-50 transition-all duration-300">
      
      {/* Floating Pill Container */}
      <div className="bg-[#05050A]/70 backdrop-blur-xl border border-white/[0.08] rounded-full px-5 py-2.5 flex items-center justify-between shadow-2xl shadow-black/60 relative">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 group shrink-0 pl-1">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-[#6D5DFB] to-[#8B5CF6] shadow-lg shadow-[#6D5DFB]/15 group-hover:scale-105 transition-all duration-300">
            <Layers className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-sm font-bold text-[#F8FAFC] tracking-wide">
            {appConfig.name}
          </span>
        </Link>

        {/* Centered Navigation Links (Desktop Only) */}
        <nav className="hidden md:flex items-center gap-7 bg-white/[0.02] border border-white/[0.04] px-6 py-2 rounded-full">
          {navLinks.map((link) => {
            if (link.isRoute) {
              const isActive = location.pathname === link.href
              return (
                <Link
                  key={link.label}
                  to={link.href}
                  className={`text-xs font-semibold ${
                    isActive ? 'text-blue-400' : 'text-[#A1A1AA]'
                  } hover:text-[#F8FAFC] transition-colors duration-200 outline-none`}
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
                className="text-xs font-semibold text-[#A1A1AA] hover:text-[#F8FAFC] transition-colors duration-200 outline-none"
              >
                {link.label}
              </a>
            )
          })}
        </nav>

        {/* Action Button & Mobile Menu Toggle */}
        <div className="flex items-center gap-2">
          {/* CTA Launch Button */}
          <Button
            onClick={() => {
              const formEl = document.getElementById('url-tool-card')
              formEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
            variant="primary"
            size="sm"
            className="hidden sm:inline-flex rounded-full text-xs font-semibold tracking-wide"
          >
            Launch Tool
            <ArrowUpRight className="ml-1 w-3.5 h-3.5" />
          </Button>

          {/* Hamburger Menu Icon (Mobile Only) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-full text-[#A1A1AA] hover:text-white hover:bg-white/5 transition-all duration-200 outline-none"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer (Glass panel) */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 mx-1 p-5 rounded-3xl bg-[#05050A]/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl flex flex-col gap-4 animate-fade-in relative z-40">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => {
              if (link.isRoute) {
                const isActive = location.pathname === link.href
                return (
                  <Link
                    key={link.label}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold ${
                      isActive ? 'text-blue-400 bg-white/5' : 'text-[#A1A1AA]'
                    } hover:text-white hover:bg-white/5 transition-all duration-200`}
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
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#A1A1AA] hover:text-white hover:bg-white/5 transition-all duration-200"
                >
                  {link.label}
                </a>
              )
            })}
          </div>
          <Button
            onClick={() => {
              setMobileMenuOpen(false)
              const formEl = document.getElementById('url-tool-card')
              formEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
            variant="primary"
            className="w-full rounded-xl py-3 text-xs"
          >
            Launch Tool
          </Button>
        </div>
      )}

    </header>
  )
}