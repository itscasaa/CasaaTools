import React from 'react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import { Chrome, FileCode, Layers, RefreshCw, Archive, Eye, Play, Sparkles, Terminal, Cpu, ShieldAlert, BadgeInfo } from 'lucide-react'

export default function FeaturesPage() {
  const details = [
    {
      badge: 'RENDER ENGINE',
      title: 'Browser-Based Headless Rendering',
      icon: <Chrome className="w-5 h-5 text-[#6D5DFB]" />,
      desc: 'CasaaTools launches an isolated headless Chromium instance via Playwright. Instead of a simple HTML fetch, it executes JavaScript, wait events, and loads external dependencies exactly like a user browser. This enables correct capture of modern React, Vue, Svelte, and client-generated layouts.',
      specs: [
        'Chromium headless runner isolation',
        'Automatic scroll-to-view triggers to resolve lazy-loaded images',
        'Configurable network idle timeout (up to 60s)',
        'Custom viewport configuration options (Desktop/Mobile)'
      ]
    },
    {
      badge: 'DOM RECONSTRUCTION',
      title: 'Final DOM OuterHTML Capture',
      icon: <FileCode className="w-5 h-5 text-[#8B5CF6]" />,
      desc: 'Instead of capturing original static HTML source, CasaaTools extracts the dynamically generated outerHTML of the page after scripts complete. It strips dynamic scripts that interfere with local preview while saving the complete structure, CSS styles, and inline asset markers.',
      specs: [
        'OuterHTML DOM state extraction',
        'Relative-to-absolute URI rewriting for links and paths',
        'Sanitization of tracking metrics and advertisement scripts',
        'Integration of local preview scripts'
      ]
    },
    {
      badge: 'ASSET PIPELINE',
      title: 'Asset Harvesting & Sniffing Engine',
      icon: <Layers className="w-5 h-5 text-[#a78bfa]" />,
      desc: 'Our asset downloader sniffs requests triggered during page load. It pulls stylesheets, javascript assets, web fonts (WOFF, WOFF2, TTF), and background media. It parses stylesheets to find `@import` files and inline background-images, ensuring no stylesheet dependency is left behind.',
      specs: [
        'CSS parser and dynamic stylesheet crawler',
        'Local saving of font binaries and inline base64 data',
        'Image converter and compiler (png, jpeg, webp, svg)',
        'Local assets directory structure compiler'
      ]
    },
    {
      badge: 'REBUILD PIPELINE',
      title: 'HTML Rebuilder & Path Resolver',
      icon: <RefreshCw className="w-5 h-5 text-[#6D5DFB]" />,
      desc: 'Rewrites absolute links (e.g. URLs pointing to remote domains) to local folder file points. If a page loads a resource from a CDN, CasaaTools downloads that resource and updates the HTML tag to look at the local `./assets/` subdirectory. This makes the rebuilt snapshot completely portable.',
      specs: [
        'Deep HTML tag replacement (img, link, script, source, iframe)',
        'Dynamic path nesting resolver for nested files',
        'Asset checksum checker to avoid redundant resource copies',
        'Local fallback structure for failed assets'
      ]
    },
    {
      badge: 'COMPILATION',
      title: 'ZIP Package Compilation',
      icon: <Archive className="w-5 h-5 text-[#8B5CF6]" />,
      desc: 'Presents the output as a downloadable, zip-compressed archive containing the complete structure. The package is optimized to be opened on any computer offline, without a web server or network connection.',
      specs: [
        'Single package export containing full asset directory',
        'Integration of both original captured DOM and local rebuilt HTML',
        'Job execution metadata file (metadata.json)',
        'Viewport screenshots and visual similarity reports'
      ]
    },
    {
      badge: 'ACCURACY SYSTEM',
      title: 'Visual Regression Compare Engine',
      icon: <Sparkles className="w-5 h-5 text-[#a78bfa]" />,
      desc: 'To ensure accuracy, the rebuilder takes a screenshot of the original live site, then launches the compiled offline package inside a sandbox and captures a second screenshot. It compares the two using a pixel-regression engine, outputting a similarity score and a highlighted visual diff image.',
      specs: [
        'Pixelmatch/regression comparison scoring',
        'Side-by-side live vs. offline visual review panel',
        'Highlighted overlay showing pixel displacement in red',
        'Similarity statistics compiled in the metadata report'
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-[#000000] text-neutral-200 flex flex-col relative overflow-hidden">
      <Navbar />

      {/* Background radial glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-[#6D5DFB]/10 to-transparent rounded-full blur-[90px] pointer-events-none z-0" />
      <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-gradient-to-br from-[#8B5CF6]/5 to-transparent rounded-full blur-[80px] pointer-events-none z-0" />

      <main className="flex-grow pt-32 pb-24 relative z-10">
        <div className="max-w-5xl mx-auto px-6">
          
          {/* Header Title Section */}
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6D5DFB]/10 border border-[#6D5DFB]/20">
              <span className="w-1 h-1 rounded-full bg-[#6D5DFB] animate-pulse" />
              <span className="text-[10px] font-bold text-purple-300 tracking-wider uppercase font-mono">Engine Specs & Capabilities</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl font-sans">
              Engineered for Complete<br />
              <span className="text-[#6D5DFB]">Rebuild Precision.</span>
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-xl mx-auto">
              Explore the detailed technical specifications and features that power the CasaaTools snapshot engine.
            </p>
          </div>

          {/* Detailed Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {details.map((item, idx) => (
              <div 
                key={idx}
                className="bg-[#0f111a]/30 border border-white/5 rounded-2xl p-6 md:p-8 hover:border-[#6D5DFB]/30 hover:shadow-[0_0_30px_rgba(109,93,251,0.05)] transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  {/* Top line with Icon & Badge */}
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-black/60 border border-white/5 flex items-center justify-center shadow-md">
                      {item.icon}
                    </div>
                    <span className="text-[9px] font-mono font-bold tracking-widest text-[#6D5DFB] uppercase bg-[#6D5DFB]/10 border border-[#6D5DFB]/20 px-2 py-0.5 rounded">
                      {item.badge}
                    </span>
                  </div>

                  {/* Text Description */}
                  <div className="space-y-2">
                    <h2 className="text-lg font-bold text-white font-sans">{item.title}</h2>
                    <p className="text-xs text-neutral-400 leading-relaxed">{item.desc}</p>
                  </div>

                  {/* Technical bullet points */}
                  <div className="border-t border-white/5 pt-4 space-y-2">
                    <h3 className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-wider">Specifications</h3>
                    <ul className="space-y-1.5">
                      {item.specs.map((spec, specIdx) => (
                        <li key={specIdx} className="flex items-start gap-2 text-[11px] text-neutral-400">
                          <span className="w-1 h-1 rounded-full bg-[#6D5DFB] mt-1.5 shrink-0" />
                          <span>{spec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
