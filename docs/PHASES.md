# CasaaTools — Development Phases

---

## Phase 0 — Project Scaffolding

**Status:** ✅ Completed

- [x] Create project folder structure
- [x] Create all placeholder files
- [x] Create README.md, .gitignore, .env.example
- [x] Create frontend scaffold (package.json, index.html, vite.config.js, tailwind.config.js, postcss.config.js)
- [x] Create backend scaffold (package.json, server.js)
- [x] Create backend directories and placeholder files (routes, controllers, services, utils, config, middleware)
- [x] Create backend output/, temp/, logs/ directories

---

## Phase 1 — Premium Landing Page UI

**Status:** ✅ Completed

- [x] Build responsive Navbar with logo and navigation
- [x] Build HeroSection with headline, subtitle, and CTA
- [x] Build UrlInputCard with URL input form and validation feedback
- [x] Build HowItWorks section
- [x] Build ShowcaseSection with visual preview cards
- [x] Build EthicalUseSection explaining allowed/not-allowed usage
- [x] Build Footer with links
- [x] Build FAQ accordion section
- [x] Style with Tailwind CSS dark theme with glassmorphism

---

## Phase 1.5 — Frontend QA & Polish

**Status:** ✅ Completed

- [x] CloneForm inline error display for rate-limited and duplicate-job states
- [x] Toast only for unexpected errors (suppressed for JOB_LIMIT_REACHED and RATE_LIMITED)
- [x] Duplicate submit prevention with submitLocked ref
- [x] UrlInputCard inline warning for active job conflicts
- [x] All error codes propagated from backend to frontend correctly

---

## Phase 2 — Backend API Foundation

**Status:** ✅ Completed

- [x] Express server with CORS, JSON body parser, request logger
- [x] `GET /api/health` endpoint
- [x] Error handling middleware
- [x] 404 handler
- [x] Rate limiting middleware (separate limiter per route type)

---

## Phase 3 — URL Validation & Security Basics

**Status:** ✅ Completed

- [x] URL format validation (must be valid HTTP/HTTPS)
- [x] Block localhost and 127.0.0.1
- [x] Block private IP ranges (10.x, 172.16–31.x, 192.168.x)
- [x] Block cloud metadata IP (169.254.169.254)
- [x] Block file://, ftp://, javascript:, data: protocols
- [x] Standardized error response format
- [x] validate-url middleware applied to clone route

---

## Phase 4 — Basic Browser Capture

**Status:** ✅ Completed

- [x] Playwright Chromium headless launch with safe configuration
- [x] Navigate to target URL with configurable timeout
- [x] Capture final rendered DOM (page.content())
- [x] Capture full-page screenshot
- [x] Capture page title
- [x] Save index.html, screenshot.png to job output folder
- [x] Network resource capture (page.on('response', ...))

---

## Phase 5 — Preview API + Frontend Integration

**Status:** ✅ Completed

- [x] `GET /preview/:jobId` endpoint serving rebuilt HTML
- [x] `GET /preview/:jobId/assets/*` endpoint serving local assets safely (path traversal protection)
- [x] Content-Security-Policy header on preview pages
- [x] PreviewFrame component with in-browser iframe preview
- [x] Tab-based switching between original screenshot and preview
- [x] Auto-scroll disclaimer shown in preview banner

---

## Phase 6 — ZIP Export

**Status:** ✅ Completed

- [x] ZIP generation using Archiver
- [x] Include index.html, index.original.html, screenshot.png, metadata.json, manifest.json
- [x] Include preview-screenshot.png, visual-diff.png when available
- [x] Include assets/ directory recursively
- [x] `GET /api/jobs/:jobId/download` endpoint streaming ZIP
- [x] DownloadCard component with download button and file list
- [x] Required file existence check (409 if incomplete)

---

## Phase 7 — Asset Discovery

**Status:** ✅ Completed

- [x] Parse HTML with Cheerio: img[src], img[srcset], link[stylesheet], script[src], link[icon], video/audio[src], source[srcset], meta og:image, inline style url(), style tag url()
- [x] Merge with Playwright network resource captures
- [x] Deduplicate by normalized URL
- [x] Classify asset type: stylesheet, script, image, font, media, html, data, other
- [x] Generate suggestedLocalPath with safe sanitized filenames
- [x] Deduplicate filename conflicts with counter suffixes
- [x] Output manifest.json with full asset catalog and summary

---

## Phase 8 — Asset Downloader

**Status:** ✅ Completed

- [x] Concurrent asset download using p-limit (max 5 simultaneous)
- [x] Per-asset size limit (10 MB default)
- [x] Total asset count limit (200 default)
- [x] Total output size limit (500 MB default)
- [x] Download to typed subfolders: assets/css/, assets/js/, assets/images/, assets/fonts/, assets/media/, assets/other/
- [x] Track status per asset: downloaded, failed, skipped
- [x] Update manifest.json with localPath, sizeBytes, downloadedAt, error fields
- [x] AssetList frontend component showing full catalog from manifest.json
- [x] Asset rewrite status badges (HTML Rewritten, CSS Rewritten, Downloaded only, Failed, Skipped)

---

## Phase 9 — HTML Path Rewriter

**Status:** ✅ Completed

- [x] Rewrite img[src], img[srcset], link[href], script[src], source[src/srcset], video/audio[src], meta og:image, inline style url() to local paths
- [x] Backup original as index.original.html
- [x] Only rewrite when asset was successfully downloaded
- [x] Track rewrite count and skipped count
- [x] Mark rewrittenInHtml on each asset entry in manifest.json

---

## Phase 10 — CSS URL Rewriter

**Status:** ✅ Completed

- [x] Parse all downloaded CSS files
- [x] Rewrite url(...) patterns to relative local paths
- [x] Handle data URIs (leave as-is)
- [x] Track rewrite count per file
- [x] Mark rewrittenInCss on each asset entry in manifest.json

---

## Phase 11 — Animation & Library Detector

**Status:** ✅ Completed

- [x] Detect GSAP, ScrollTrigger, Lenis, Locomotive Scroll, AOS, Anime.js, Three.js, Lottie, Framer Motion
- [x] Detect React, Vue, Angular, Next.js, Nuxt
- [x] Detect Swiper, Splide, jQuery
- [x] Check window globals, HTML DOM markers, network URLs, script filenames
- [x] Confidence levels: high (window global), medium (network/html marker), low (filename match)
- [x] Store detected libraries in metadata.json intelligence field
- [x] Display detected libraries in ResultPanel capture intelligence bar

---

## Phase 12 — Visual Compare

**Status:** ✅ Completed

- [x] Capture original page screenshot during browser phase
- [x] Capture local preview screenshot using Playwright
- [x] Compare screenshots using pixelmatch pixel diff
- [x] Generate visual match score (percentage)
- [x] Generate visual-diff.png highlighting changed pixels
- [x] Store score, differentPixels, dimensions in metadata.json
- [x] VisualCompareCard component with diff/original/preview tabs
- [x] Score badge with color-coded thresholds (≥95% = green, ≥80% = blue)

---

## Phase 13 — Async Job System & Progress Polling

**Status:** ✅ Completed

- [x] In-memory job map (jobId → jobState)
- [x] job.json persistence per job output folder
- [x] `POST /api/clone` returns 202 immediately, runs pipeline in background
- [x] `GET /api/jobs/:jobId` returns real-time status, progress, currentStep, logs
- [x] `GET /api/jobs` returns list sorted newest first
- [x] `DELETE /api/jobs/:jobId` removes output folder safely
- [x] Frontend polls at 2-second intervals while job is running
- [x] ProcessTimeline component showing step-by-step log
- [x] CloneProgress component with animated progress bar
- [x] 15-step pipeline with labeled progress percentages

---

## Phase 14 — Job Recovery, Error Sanitization & History UI

**Status:** ✅ Completed

- [x] On server startup: recover interrupted (queued/running) jobs as failed
- [x] Periodic stale job detection (30-minute timeout, checks every 5 minutes)
- [x] sanitizeJobError: maps raw Playwright/Node errors to safe user-facing messages
- [x] No stack traces, no internal paths, no Chromium dumps in API responses
- [x] HistoryPage with sortable job table (completed, failed, running)
- [x] Quick preview/download icons on completed rows
- [x] Delete job button with confirmation dialog
- [x] StatusBadge for queued/running/completed/failed states
- [x] metadata.json fallback for old jobs without job.json
- [x] Inline error display in history rows for failed jobs

---

## Phase 14.5 — Dev Mode Backend Stabilization

**Status:** ✅ Completed

- [x] Separate rate limiters: clone submit (100/15min dev), poll (5000/15min dev), preview (5000/15min dev)
- [x] Production limits: clone (20/15min), poll (600/15min), preview (1000/15min)
- [x] Flip with `APP_MODE=development` / `APP_MODE=production`
- [x] JOB_LIMIT_REACHED and RATE_LIMITED errors suppress toast, show inline warning
- [x] Future token system placeholder config keys added (.env, limits.config.js)

---

## Phase 15 — Auto Scroll & Lazy Load Capture

**Status:** ✅ Completed

- [x] Gradual viewport scrolling (configurable stepPx, delayMs)
- [x] Stop conditions: page bottom, position unchanged for 3 consecutive steps, max duration (15s)
- [x] Network listener remains active during scroll (lazy-loaded assets captured)
- [x] POST_SCROLL_WAIT_MS delay before final DOM capture
- [x] Optional back-to-top before screenshot
- [x] Auto-scroll errors handled gracefully — job continues even if scroll fails
- [x] capture.autoScroll metrics saved to metadata.json and manifest.json
- [x] "Triggering lazy-loaded content" step shown at 22% in ProcessTimeline
- [x] Auto-scroll status bar shown in ResultPanel capture intelligence section

---

## Phase 16 — Full System QA & Production Readiness Prep

**Status:** ✅ Completed

- [x] All backend files reviewed (controllers, services, middleware, config)
- [x] All frontend files reviewed (pages, components, hooks, services)
- [x] All docs reviewed and updated to match current implementation
- [x] Frontend production build: zero errors, zero warnings
- [x] Error middleware: removed stack trace from API responses
- [x] Dead code: removed unused getJobAssets mock from jobApi.js
- [x] Frontend copy: updated stale feature descriptions and FAQ answers
- [x] End-to-end test matrix: all 7 scenarios passed
- [x] Error sanitization verified: no stack traces, no internal paths in API responses
- [x] Response format consistency confirmed: all routes use { success, data } / { success, error }
- [x] Status consistency confirmed: queued/running/completed/failed (done normalized to completed at API boundary)
- [x] SSRF protections verified: localhost, private IP, file://, metadata IP all blocked
- [x] Path traversal prevention verified: preview assets, screenshots, ZIPs all safe

---

## Phase 17 — AI Snapshot Report with Groq

**Status:** 🔮 Planned

- [ ] Send captured HTML + metadata to Groq LLM
- [ ] Generate structured AI report: page summary, tech stack analysis, accessibility notes
- [ ] Display AI report in ResultPanel

---

## Phase 18 — Optional Login & Token System

**Status:** 🔮 Planned

- [ ] User authentication (email/password or OAuth)
- [ ] Token balance system (e.g., 5 tokens per account)
- [ ] Token consumed per snapshot job
- [ ] Token refund on internal server failures
- [ ] Account dashboard for token balance and history

---

## Phase 19 — Optional Multi-Page Crawl

**Status:** 🔮 Planned

- [ ] Crawl same-domain links up to configurable depth
- [ ] Max pages per crawl limit
- [ ] Organized multi-page ZIP output
- [ ] Skip login, logout, admin, and dynamic routes

---

## Phase 20 — Production Deployment

**Status:** 🔮 Planned

- [ ] Ubuntu VPS setup with Node.js 20+
- [ ] Nginx reverse proxy with SSL
- [ ] PM2 process management
- [ ] Output cleanup cron job
- [ ] Firewall and log rotation