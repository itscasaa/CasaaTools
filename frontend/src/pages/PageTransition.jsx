import React, { useState, useEffect } from 'react'
import { motion, useAnimation } from 'framer-motion'

const PATH_TITLES = {
  '/': 'HOME',
  '/features': 'FEATURES',
  '/workflow': 'WORKFLOW',
  '/ethical-use': 'ETHICAL USE',
  '/faq': 'F.A.Q',
  '/login': 'SIGN IN',
  '/register': 'SIGN UP'
}

// 1. The Global Curtain that handles the screen transition overlay at the root of the app
export function GlobalCurtain({ pathname }) {
  const title = PATH_TITLES[pathname] || 'CASAA'
  
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080
  })

  useEffect(() => {
    function handleResize() {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const { width, height } = dimensions
  
  const controls = useAnimation()
  const pathControls = useAnimation()
  const textControls = useAnimation()

  // Curves matching Olivier Larose layout metrics (5 nodes each)
  const initialPath = `M0 300 L${width} 300 L${width} ${height + 300} L0 ${height + 300} Z`
  const exitPath = `M0 300 Q${width/2} 0 ${width} 300 L${width} ${height + 300} L0 ${height + 300} Z`
  const entryPath = `M0 300 L${width} 300 L${width} ${height + 300} Q${width/2} ${height} 0 ${height + 300} Z`

  useEffect(() => {
    async function runSequence() {
      // 1. Reset state to bottom of screen with leading edge curved up
      controls.set({ top: "100vh" })
      pathControls.set({ d: exitPath })
      textControls.set({ y: 80, opacity: 0 })

      // 2. Slide up to cover screen, flattening the top edge
      await Promise.all([
        controls.start({ top: "-300px", transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } }),
        pathControls.start({ d: initialPath, transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } }),
        textControls.start({ y: 0, opacity: 1, transition: { duration: 0.6, delay: 0.2, ease: [0.76, 0, 0.24, 1] } })
      ])

      // 3. Hold/Settle for 0.45s so the page title is readable
      await new Promise(r => setTimeout(r, 450))

      // 4. Slide up and off top, morphing trailing bottom edge into concave hammock curve
      await Promise.all([
        controls.start({ top: `-${height + 600}px`, transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } }),
        pathControls.start({ d: entryPath, transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } }),
        textControls.start({ y: -80, opacity: 0, transition: { duration: 0.6, ease: [0.76, 0, 0.24, 1] } })
      ])
    }

    runSequence()
  }, [pathname, width, height])

  return (
    <div className="fixed inset-0 z-[99999] pointer-events-none w-screen h-screen">
      {/* SVG Container wrapping the morphing curtain path */}
      <motion.svg 
        animate={controls}
        className="absolute left-0 w-screen h-[calc(100vh+600px)] fill-[#0f1015]"
      >
        <motion.path 
          animate={pathControls}
        />
      </motion.svg>

      {/* Center Screen Text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={textControls}
          className="text-white text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-[0.25em] font-sans flex items-center gap-4 select-none"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          <span className="w-3.5 h-3.5 rounded-full bg-blue-500 animate-pulse" />
          {title}
        </motion.div>
      </div>
    </div>
  )
}

// 2. The page content wrapper component (no overflow-hidden to preserve sticky/parallax overlapping animations)
export default function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1.0, ease: [0.76, 0, 0.24, 1], delay: 0.8 }} // Content reveals when curtain is holding
      className="w-full min-h-screen flex flex-col justify-between"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {children}
    </motion.div>
  )
}
