// In development with Vite proxy, use relative URLs (empty base).
// In production, set VITE_API_BASE_URL to the full backend URL.
const getDynamicApiBase = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/casaatools')) {
    return '/casaatools'
  }
  return ''
}

export const appConfig = {
  apiBaseUrl: getDynamicApiBase(),
  name: 'CasaaTools',
  tagline: 'Website Snapshot & HTML Rebuilder',
  version: '0.1.0',
  githubUrl: 'https://github.com/casaatools/casaatools',
  limits: {
    maxRequestsPerMin: 10,
    maxAssetSizeMb: 10,
    maxAssetsPerJob: 200,
    jobTimeoutMs: 120000,
  },
  ethics: {
    allowed: [
      'Public pages owned by the user',
      'Public pages with explicit owner permission',
      'Authorized website analysis and debugging',
      'Static offline website archival for reference'
    ],
    prohibited: [
      'Bypassing login or session authentication checks',
      'Bypassing subscription-based paywalls',
      'Solving or bypassing CAPTCHAs and bot shields',
      'Scraping private user dashboards or portals',
      'Mass redistributing copyrighted page content'
    ]
  }
}
