import { cloneSteps } from '../constants/cloneSteps'

const MOCK_ASSETS_TEMPLATES = [
  { type: 'css', originalUrl: '/css/main.css', localPath: 'assets/css/main_a8df12.css', size: 18420, status: 'downloaded' },
  { type: 'css', originalUrl: '/css/components.css', localPath: 'assets/css/components_5b1d2e.css', size: 24102, status: 'downloaded' },
  { type: 'js', originalUrl: '/js/app.js', localPath: 'assets/js/app_fe3b8c.js', size: 68301, status: 'downloaded' },
  { type: 'js', originalUrl: '/js/analytics.js', localPath: 'assets/js/analytics_1c2b3a.js', size: 8402, status: 'downloaded' },
  { type: 'image', originalUrl: '/images/logo.png', localPath: 'assets/images/logo_987fda.png', size: 12402, status: 'downloaded' },
  { type: 'image', originalUrl: '/images/hero.jpg', localPath: 'assets/images/hero_212c4e.jpg', size: 342104, status: 'downloaded' },
  { type: 'image', originalUrl: '/images/avatar.jpg', localPath: 'assets/images/avatar_92a34b.jpg', size: 18920, status: 'downloaded' },
  { type: 'font', originalUrl: '/fonts/inter-regular.woff2', localPath: 'assets/fonts/inter-regular_f8e4b8.woff2', size: 98204, status: 'downloaded' },
  { type: 'font', originalUrl: '/fonts/inter-bold.woff2', localPath: 'assets/fonts/inter-bold_3c8e9b.woff2', size: 104203, status: 'downloaded' }
]

const DEFAULT_DURATION = 14000 // 14 seconds to complete clone simulation

export function getMockJobs() {
  const data = localStorage.getItem('pm_mock_jobs')
  if (!data) {
    // Populate some default history
    const defaults = [
      {
        jobId: 'pm-job-demo1',
        url: 'https://react.dev',
        status: 'completed',
        progress: 100,
        currentStep: 'Snapshot Ready',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        finishedAt: new Date(Date.now() - 3600000 * 2 + 15000).toISOString(),
        duration: 15000,
        options: { scrollPage: true },
        metadata: {
          title: 'React – The library for web and native user interfaces',
          assetCount: 38,
          totalSize: 2410290,
          screenshotPath: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=600&auto=format&fit=crop'
        }
      },
      {
        jobId: 'pm-job-demo2',
        url: 'https://tailwindcss.com',
        status: 'completed',
        progress: 100,
        currentStep: 'Snapshot Ready',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        finishedAt: new Date(Date.now() - 3600000 * 24 + 18000).toISOString(),
        duration: 18000,
        options: { scrollPage: true },
        metadata: {
          title: 'Tailwind CSS - Rapidly build modern websites without ever leaving your HTML.',
          assetCount: 54,
          totalSize: 4892014,
          screenshotPath: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=600&auto=format&fit=crop'
        }
      }
    ]
    localStorage.setItem('pm_mock_jobs', JSON.stringify(defaults))
    return defaults
  }
  return JSON.parse(data)
}

export function saveMockJobs(jobs) {
  localStorage.setItem('pm_mock_jobs', JSON.stringify(jobs))
}

export function createMockJob(url, options = {}) {
  const jobs = getMockJobs()
  const jobId = 'pm-job-' + Math.random().toString(36).substring(2, 11)
  
  const newJob = {
    jobId,
    url,
    status: 'queued',
    progress: 0,
    currentStep: 'Validating URL',
    createdAt: new Date().toISOString(),
    finishedAt: null,
    duration: DEFAULT_DURATION,
    options
  }
  
  jobs.unshift(newJob)
  saveMockJobs(jobs)
  return newJob
}

export function getJobState(jobId) {
  const jobs = getMockJobs()
  const jobIndex = jobs.findIndex(j => j.jobId === jobId)
  
  if (jobIndex === -1) return null
  
  const job = jobs[jobIndex]
  
  // If it's already completed or failed, return it as-is
  if (job.status === 'completed' || job.status === 'failed') {
    return job
  }
  
  const elapsed = Date.now() - new Date(job.createdAt).getTime()
  const progress = Math.min(99, Math.floor((elapsed / job.duration) * 100))
  
  // Determine current step index based on progress
  const stepCount = cloneSteps.length - 1 // skip the last 'ready' step for raw percentage
  const currentStepIndex = Math.min(stepCount - 1, Math.floor((progress / 100) * stepCount))
  const activeStep = cloneSteps[currentStepIndex]
  
  job.progress = progress
  job.status = 'running'
  job.currentStep = activeStep.label
  
  // Build dynamic step log details
  job.logs = cloneSteps.map((step, idx) => {
    if (idx < currentStepIndex) {
      return { step: step.id, status: 'done', message: `${step.label} successfully completed.` }
    } else if (idx === currentStepIndex) {
      return { step: step.id, status: 'active', message: `Currently processing: ${step.description}` }
    } else {
      return { step: step.id, status: 'pending', message: 'Waiting to start...' }
    }
  })
  
  // If duration exceeded, finalize it
  if (elapsed >= job.duration) {
    job.progress = 100
    job.status = 'completed'
    job.currentStep = 'Snapshot Ready'
    job.finishedAt = new Date(new Date(job.createdAt).getTime() + job.duration).toISOString()
    
    // Add completed logs
    job.logs = cloneSteps.map(step => ({
      step: step.id,
      status: 'done',
      message: `${step.label} completed.`
    }))
    
    // Parse hostname for neat title
    let hostName = 'Target Site'
    try {
      hostName = new URL(job.url).hostname
    } catch(e){}
    
    job.metadata = {
      title: `${hostName.charAt(0).toUpperCase() + hostName.slice(1)} - Clean rebuilt offline snapshot.`,
      assetCount: Math.floor(Math.random() * 40) + 15,
      totalSize: Math.floor(Math.random() * 3000000) + 800000,
      screenshotPath: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop'
    }
    
    // Save state back to history
    jobs[jobIndex] = job
    saveMockJobs(jobs)
  }
  
  return job
}

export function getMockAssetsForJob(jobId) {
  // Generate slightly dynamic assets based on jobId seed
  const count = (jobId.charCodeAt(jobId.length - 1) % 4) + 5
  return MOCK_ASSETS_TEMPLATES.slice(0, count)
}

export function getMockHtmlForJob(jobId, url) {
  let hostname = 'example.com'
  try {
    hostname = new URL(url).hostname
  } catch(e){}
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${hostname.charAt(0).toUpperCase() + hostname.slice(1)} - Local Offline Snapshot</title>
    <!-- Rebuilt local stylesheets -->
    <link rel="stylesheet" href="assets/css/main_a8df12.css">
    <link rel="stylesheet" href="assets/css/components_5b1d2e.css">
</head>
<body class="bg-slate-900 text-white font-sans">
    <header class="p-6 border-b border-white/10 flex items-center justify-between">
        <div class="flex items-center gap-3">
            <img src="assets/images/logo_987fda.png" alt="Logo" class="w-8 h-8">
            <span class="font-bold text-xl">${hostname}</span>
        </div>
        <nav class="hidden md:flex gap-6 text-sm text-slate-300">
            <a href="#" class="hover:text-white">Features</a>
            <a href="#" class="hover:text-white">Pricing</a>
            <a href="#" class="hover:text-white">Docs</a>
        </nav>
    </header>
    <main class="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 class="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Welcome to ${hostname}
        </h1>
        <p class="text-lg text-slate-400 max-w-xl mx-auto mb-10">
            This is a clean, local snapshot captured by PageMirror. All scripts, fonts, and stylesheets are loaded locally for archival reference.
        </p>
        <div class="flex justify-center gap-4">
            <button class="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium">Get Started</button>
            <button class="border border-white/10 hover:bg-white/5 px-6 py-3 rounded-lg font-medium">Learn More</button>
        </div>
        <div class="mt-16 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
            <img src="assets/images/hero_212c4e.jpg" alt="Hero banner" class="w-full h-auto">
        </div>
    </main>
    <footer class="p-8 border-t border-white/10 text-center text-xs text-slate-500">
        <p>&copy; 2026 ${hostname}. Captured using PageMirror Rebuilder.</p>
    </footer>
    <!-- Rebuilt local scripts -->
    <script src="assets/js/app_fe3b8c.js"></script>
    <script src="assets/js/analytics_1c2b3a.js"></script>
</body>
</html>`
}
