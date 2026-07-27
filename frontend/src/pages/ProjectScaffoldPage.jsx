import React, { useState } from 'react'
import { 
  Plus, FolderPlus, Download, Check, Sparkles, AlertTriangle, ArrowRight, RotateCcw,
  Code2, Database, ChevronRight, Terminal, Laptop
} from 'lucide-react'
import { Card, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { scaffoldApi } from '../services/scaffoldApi'

export default function ProjectScaffoldPage() {
  const [projectName, setProjectName] = useState('my-awesome-app')
  const [description, setDescription] = useState('')
  const [framework, setFramework] = useState('React')
  const [language, setLanguage] = useState('JavaScript')
  const [styling, setStyling] = useState('Tailwind CSS')
  const [selectedFolders, setSelectedFolders] = useState([
    'components', 'pages', 'hooks', 'utils'
  ])
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const folderOptions = [
    { id: 'components', label: 'components (Reusable UI Elements)' },
    { id: 'pages', label: 'pages (Route View Controllers)' },
    { id: 'hooks', label: 'hooks (Custom React Hooks)' },
    { id: 'context', label: 'context (State Providers)' },
    { id: 'utils', label: 'utils (Helper Logic)' },
    { id: 'services', label: 'services (API Interfaces)' },
    { id: 'styles', label: 'styles (Global CSS Assets)' }
  ]

  const handleToggleFolder = (folderId) => {
    if (selectedFolders.includes(folderId)) {
      setSelectedFolders(selectedFolders.filter(id => id !== folderId))
    } else {
      setSelectedFolders([...selectedFolders, folderId])
    }
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)

    const trimmedName = projectName.trim()
    if (!trimmedName) {
      setError('Please provide a project name.')
      return
    }

    setLoading(true)
    setStatusMessage('Configuring requirements and starting compiler...')

    try {
      setTimeout(() => {
        if (loading) setStatusMessage('Drafting configuration setups (package.json, bundlers)...')
      }, 2500)
      setTimeout(() => {
        if (loading) setStatusMessage('Structuring folder trees and creating boilerplate code files...')
      }, 5500)
      setTimeout(() => {
        if (loading) setStatusMessage('Creating ZIP archive and preparing download token...')
      }, 8500)

      const response = await scaffoldApi.generateScaffold({
        projectName: trimmedName,
        description: description.trim(),
        framework,
        language,
        styling,
        folders: selectedFolders
      })
      setResult(response)
    } catch (err) {
      setError(err.message || 'Failed to generate project structure.')
    } finally {
      setLoading(false)
      setStatusMessage('')
    }
  }

  const handleReset = () => {
    setProjectName('my-awesome-app')
    setDescription('')
    setFramework('React')
    setLanguage('JavaScript')
    setStyling('Tailwind CSS')
    setSelectedFolders(['components', 'pages', 'hooks', 'utils'])
    setResult(null)
    setError('')
  }

  // Nested directory tree builder helper
  const FileTree = ({ paths }) => {
    const buildTree = (paths) => {
      const root = {}
      paths.forEach(p => {
        const parts = p.split('/')
        let current = root
        parts.forEach((part, index) => {
          if (!current[part]) {
            current[part] = index === parts.length - 1 ? null : {}
          }
          current = current[part]
        })
      })
      return root
    }

    const tree = buildTree(paths)

    const renderTree = (node, depth = 0) => {
      if (!node) return null
      return Object.keys(node).sort((a, b) => {
        const aIsFile = node[a] === null
        const bIsFile = node[b] === null
        if (aIsFile && !bIsFile) return 1
        if (!aIsFile && bIsFile) return -1
        return a.localeCompare(b)
      }).map(key => {
        const isFile = node[key] === null
        return (
          <div key={key} className="select-none">
            <div className="flex items-center gap-2 py-1.5 hover:bg-white/5 px-2.5 rounded font-mono text-xs" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
              {isFile ? (
                <span className="text-neutral-500 text-sm">📄</span>
              ) : (
                <span className="text-indigo-400 text-sm">📁</span>
              )}
              <span className={isFile ? "text-neutral-300" : "text-neutral-200 font-semibold"}>{key}</span>
            </div>
            {!isFile && renderTree(node[key], depth + 1)}
          </div>
        )
      })
    }

    return (
      <div className="bg-[#07080d] border border-white/5 rounded-xl p-4 max-h-[380px] overflow-y-auto custom-scrollbar shadow-inner">
        {renderTree(tree)}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="text-center mb-8 select-none animate-fadeIn">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#F8FAFC] tracking-tight flex items-center justify-center gap-2.5">
          <FolderPlus className="w-8 h-8 text-indigo-400 animate-pulse" />
          Project Scaffold Generator
        </h1>
        <p className="mt-3 text-sm text-[#A1A1AA] max-w-xl mx-auto">
          Generate structural codebase skeletons with fully configured build setups and boilerplate components in a downloadable ZIP file.
        </p>
      </div>

      {/* Main Wizard Form Card */}
      {!result && (
        <Card className="w-full relative overflow-hidden" glass={true}>
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleGenerate} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Side fields */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Project Folder Name</label>
                    <Input
                      type="text"
                      placeholder="my-awesome-app"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                      disabled={loading}
                      error={!!error}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Description (Optional)</label>
                    <textarea
                      placeholder="e.g. A portfolio landing page with Vite, React, and Framer Motion"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={loading}
                      rows={3}
                      className="w-full bg-[#12131e]/50 border border-white/5 focus:border-indigo-500/50 rounded-lg p-3 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-0 transition-colors resize-none"
                    />
                  </div>
                </div>

                {/* Right Side Options */}
                <div className="space-y-4 bg-white/5 border border-white/10 p-5 rounded-xl">
                  <h3 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Laptop className="w-4 h-4" />
                    Stack Options
                  </h3>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-neutral-400 uppercase font-semibold">Framework</label>
                      <select
                        value={framework}
                        onChange={(e) => setFramework(e.target.value)}
                        disabled={loading}
                        className="w-full bg-[#0d0e14] border border-white/10 rounded-lg p-2 text-xs text-neutral-200 focus:outline-none"
                      >
                        <option value="React JS (Vite)">React JS (Vite)</option>
                        <option value="React JS (Webpack / CRA)">React JS (Webpack / CRA)</option>
                        <option value="Next.js (App Router)">Next.js (App Router)</option>
                        <option value="Next.js (Pages Router)">Next.js (Pages Router)</option>
                        <option value="Vue JS (Vite)">Vue JS (Vite)</option>
                        <option value="Nuxt.js (Vue)">Nuxt.js (Vue)</option>
                        <option value="Svelte (Vite)">Svelte (Vite)</option>
                        <option value="Astro Framework">Astro Framework</option>
                        <option value="Express.js (Node.js Backend)">Express.js (Node.js Backend)</option>
                        <option value="Plain HTML/CSS/JS (Vanilla)">Plain HTML/CSS/JS (Vanilla)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-neutral-400 uppercase font-semibold">Language</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        disabled={loading}
                        className="w-full bg-[#0d0e14] border border-white/10 rounded-lg p-2 text-xs text-neutral-200 focus:outline-none"
                      >
                        <option value="JavaScript">JavaScript</option>
                        <option value="TypeScript">TypeScript</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-neutral-400 uppercase font-semibold">Styling Engine</label>
                    <select
                      value={styling}
                      onChange={(e) => setStyling(e.target.value)}
                      disabled={loading}
                      className="w-full bg-[#0d0e14] border border-white/10 rounded-lg p-2 text-xs text-neutral-200 focus:outline-none"
                    >
                      <option value="Tailwind CSS">Tailwind CSS</option>
                      <option value="Sass / SCSS">Sass / SCSS</option>
                      <option value="CSS Modules">CSS Modules</option>
                      <option value="Styled Components">Styled Components</option>
                      <option value="Vanilla / Global CSS">Vanilla / Global CSS</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 3: Directories checkbox selection */}
              <div className="space-y-3 bg-[#0d0e14]/50 border border-white/5 p-5 rounded-xl">
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block">Include Boilerplate Folder Structures</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {folderOptions.map(folder => (
                    <label 
                      key={folder.id} 
                      className={`flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-all select-none ${
                        selectedFolders.includes(folder.id) 
                          ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300' 
                          : 'border-white/5 bg-[#090a0f] text-neutral-400 hover:border-white/10 hover:text-neutral-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFolders.includes(folder.id)}
                        onChange={() => handleToggleFolder(folder.id)}
                        disabled={loading}
                        className="hidden"
                      />
                      <span className="text-sm font-semibold">{selectedFolders.includes(folder.id) ? '✓' : '+'}</span>
                      <span>{folder.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end pt-3">
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  disabled={loading}
                  className="px-8 py-3 text-sm font-semibold flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500"
                >
                  <Sparkles className="w-4 h-4" />
                  {loading ? 'Compiling Boilerplate...' : 'Generate Project Scaffold'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Loading active pipeline wrapper */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-12 border border-white/5 rounded-2xl bg-[#0f111a]/40 space-y-4">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-neutral-900" />
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-indigo-500 animate-spin" />
            <FolderPlus className="w-6 h-6 text-indigo-400 animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-white">Scaffolding Engine Active</p>
            <p className="text-xs text-neutral-400 font-mono animate-pulse">{statusMessage || 'Preparing project settings...'}</p>
          </div>
        </div>
      )}

      {/* Success View */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
          {/* Left panel: File tree structure preview */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-indigo-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                Compiled Directory Structure
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="flex items-center gap-1.5 text-neutral-400 hover:text-white"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Form
              </Button>
            </div>
            <FileTree paths={result.fileList} />
          </div>

          {/* Right panel: Download and Setup commands instructions */}
          <div className="lg:col-span-5 space-y-5">
            <Card glass={true} className="border-indigo-500/20 bg-indigo-500/5">
              <CardContent className="p-6 space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-2 animate-bounce">
                  <Check className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white">Structure Generated!</h2>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Boilerplate folders and layout configs have been created successfully. Download the ZIP file below to start coding immediately.
                </p>

                <a 
                  href={scaffoldApi.getDownloadUrl(result.scaffoldId)}
                  download
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/10 mt-4 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download Project ZIP
                </a>
              </CardContent>
            </Card>

            {/* Quickstart console commands cheat sheet */}
            <div className="bg-[#05060b] border border-white/5 rounded-xl p-4 font-mono text-[11px] text-neutral-400 space-y-3.5 shadow-2xl">
              <span className="text-[10px] text-indigo-300 uppercase tracking-wider font-semibold block">Quick Setup Instructions:</span>
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-neutral-500 block"># 1. Unzip the scaffold file</span>
                  <span className="text-neutral-300 block">unzip scaffold-{result.scaffoldId}.zip -d {result.projectName}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-neutral-500 block"># 2. Enter folder & install requirements</span>
                  <span className="text-neutral-300 block">cd {result.projectName} && npm install</span>
                </div>
                <div className="space-y-1">
                  <span className="text-neutral-500 block"># 3. Start development compiler</span>
                  <span className="text-neutral-300 block">npm run dev</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
