# CasaaTools — Website Snapshot & HTML Rebuilder

CasaaTools is a modern web tool for capturing public web pages and rebuilding them as local HTML snapshots. Users enter a URL, the system renders it using browser automation (Playwright), captures the final rendered DOM along with all assets (CSS, JS, images, fonts, media), then rebuilds the page into a downloadable ZIP package.

## Stack

**Frontend** — React.js, Tailwind CSS, Lucide Icons, Vite, React Router DOM  
**Backend** — Node.js, Express.js, Playwright (Chromium), Cheerio, fs-extra, Archiver, pixelmatch, mime-types, p-limit

## Current Phase Status

| Phase | Description | Status |
|---|---|---|
| Phase 0 | Project Scaffolding | ✅ Completed |
| Phase 1 | Premium Landing Page UI | ✅ Completed |
| Phase 1.5 | Frontend QA & Polish | ✅ Completed |
| Phase 2 | Backend API Foundation | ✅ Completed |
| Phase 3 | URL Validation & Security Basics | ✅ Completed |
| Phase 4 | Basic Browser Capture | ✅ Completed |
| Phase 5 | Preview API + Frontend Integration | ✅ Completed |
| Phase 6 | ZIP Export | ✅ Completed |
| Phase 7 | Asset Discovery | ✅ Completed |
| Phase 8 | Asset Downloader | ✅ Completed |
| Phase 9 | HTML Path Rewriter | ✅ Completed |
| Phase 10 | CSS URL Rewriter | ✅ Completed |
| Phase 11 | Animation & Library Detector | ✅ Completed |
| Phase 12 | Visual Compare | ✅ Completed |
| Phase 13 | Async Job System & Progress Polling | ✅ Completed |
| Phase 14 | Job Recovery, Error Sanitization & History UI | ✅ Completed |
| Phase 14.5 | Dev Mode Backend Stabilization | ✅ Completed |
| Phase 15 | Auto Scroll & Lazy Load Capture | ✅ Completed |
| Phase 16 | Full System QA & Production Readiness Prep | ✅ Completed |
| Phase 17 | AI Snapshot Report with Groq | 🔮 Planned |
| Phase 18 | Optional Login & Token System | 🔮 Planned |
| Phase 19 | Optional Multi-Page Crawl | 🔮 Planned |
| Phase 20 | Production Deployment | 🔮 Planned |

## What CasaaTools Does Today

1. **URL Submission** — Submit any public HTTP/HTTPS URL
2. **Browser Capture** — Full-page Playwright/Chromium render with JavaScript execution
3. **Auto-Scroll** — Gradual viewport scrolling to trigger lazy-loaded content
4. **Asset Discovery** — HTML + network resource scan for images, CSS, JS, fonts, media
5. **Asset Download** — Parallel download of all assets into organized local folders
6. **HTML Rewrite** — All HTML asset references rewritten to local paths
7. **CSS Rewrite** — All `url(...)` references in CSS rewritten to local paths
8. **Library Detection** — Detects GSAP, Framer Motion, React, Vue, AOS, Three.js, Lottie, jQuery, and more
9. **Visual Compare** — Pixel-level screenshot comparison (original vs rebuilt preview) with diff image
10. **Preview** — Live in-browser preview of the rebuilt snapshot
11. **ZIP Export** — Complete downloadable archive of all rebuilt files
12. **Job History** — View, preview, download, or delete past snapshots
13. **Async Pipeline** — Non-blocking job system with real-time progress polling
14. **Error Recovery** — Sanitized error messages; stale/interrupted jobs automatically recovered

## ZIP Output Contents

```
casaatools-<jobId>.zip
├── index.html                  # Rebuilt HTML with rewritten local asset paths
├── index.original.html         # Original captured DOM (before rewriting)
├── screenshot.png              # Full-page original screenshot
├── preview-screenshot.png      # Screenshot of the rebuilt local preview
├── visual-diff.png             # Pixelmatch diff overlay image
├── metadata.json               # Capture metadata, asset summary, visual compare scores
├── manifest.json               # Full asset catalog with download statuses
└── assets/
    ├── css/                    # Downloaded stylesheet files
    ├── js/                     # Downloaded script files
    ├── images/                 # Downloaded image files
    ├── fonts/                  # Downloaded font files
    ├── media/                  # Downloaded audio/video files
    └── other/                  # Other discovered resources
```

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Server health check |
| `/api/clone` | POST | Submit URL for snapshot |
| `/api/jobs` | GET | List all snapshot history |
| `/api/jobs/:jobId` | GET | Get job status and metadata |
| `/api/jobs/:jobId` | DELETE | Delete a snapshot and its files |
| `/api/jobs/:jobId/download` | GET | Stream ZIP archive |
| `/api/jobs/:jobId/screenshot` | GET | Serve original screenshot |
| `/api/jobs/:jobId/preview-screenshot` | GET | Serve preview screenshot |
| `/api/jobs/:jobId/visual-diff` | GET | Serve visual diff image |
| `/api/jobs/:jobId/manifest` | GET | Get asset manifest JSON |
| `/preview/:jobId` | GET | Serve rebuilt HTML preview |
| `/preview/:jobId/assets/*` | GET | Serve local preview assets |

## Security

- SSRF protection active at all times (blocks localhost, private IPs, cloud metadata, file://, ftp://)
- No stack traces in API responses
- Path traversal prevention on all file serving endpoints
- Separate rate limits for clone submit, job polling, and preview serving
- Dev mode uses relaxed rate limits; flip `APP_MODE=production` to activate strict limits

## Folder Structure

```
pagemirror/
├── README.md
├── .gitignore
├── .env.example
├── docs/                    # Project documentation
│   ├── PROJECT_SCOPE.md
│   ├── PHASES.md
│   ├── API_PLAN.md
│   └── SECURITY_NOTES.md
├── frontend/                # React + Vite frontend
│   ├── package.json
│   └── src/
│       ├── pages/           # HomePage, ResultPage, HistoryPage
│       ├── components/      # layout/, landing/, tool/, result/, ui/
│       ├── services/        # cloneApi.js, jobApi.js
│       ├── utils/           # formatBytes, formatDate
│       ├── hooks/           # useCloneJob, usePolling
│       └── constants/       # appConfig
└── backend/                 # Node.js + Express backend
    ├── package.json
    ├── server.js
    ├── routes/
    ├── controllers/         # clone, preview, job controllers
    ├── services/            # browser, snapshot, asset-discovery, asset-downloader,
    │                        #   rewrite-html, rewrite-css, animation-detector,
    │                        #   visual-compare, zip, job, preview
    ├── utils/
    ├── config/              # app.config.js, limits.config.js, playwright.config.js
    ├── middleware/           # error, rate-limit, validate-url
    └── output/              # Job output snapshots (per jobId)
```

## Ethical Use

This project is intended **only** for:
- Public pages owned by the user
- Public pages with explicit permission
- Authorized website analysis and debugging
- Static snapshot and personal archival purposes

**Not** for: bypassing login, paywalls, captcha, Cloudflare, anti-bot protection, authentication, or private content access.

See [docs/SECURITY_NOTES.md](docs/SECURITY_NOTES.md) for full security rules and restrictions."# CasaaTools" 
