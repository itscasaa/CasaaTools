# CasaaTools — Project Scope

## What is CasaaTools?

CasaaTools is a **Website Snapshot & HTML Rebuilder**. It renders public or authorized web pages using a real browser engine (Playwright), captures the final rendered DOM and supporting assets, rewrites internal paths, and exports a local HTML snapshot package that can be previewed and downloaded.

## Main Project Goal

Build a modern web tool where users enter a URL and receive a complete offline-capable HTML snapshot of that page — including rendered DOM, CSS, JavaScript, images, fonts, and other assets — packaged into a downloadable ZIP archive.

## How It Works (Conceptual)

1. User submits a public URL
2. Backend launches a headless browser via Playwright
3. Page is fully rendered (including JavaScript, scroll-triggered content, lazy-loaded assets)
4. Final DOM is captured
5. All linked assets (CSS, JS, images, fonts, media) are discovered and downloaded
6. HTML and CSS paths are rewritten to point to local copies
7. Everything is packaged into a ZIP file
8. User can preview the snapshot and download the ZIP

## MVP Scope

### MVP Must Support

- Single URL input (HTTP/HTTPS only)
- Browser rendering via Playwright (headless Chromium)
- Full DOM capture after page load
- Screenshot capture
- Image, CSS, JavaScript, and font asset discovery and download
- HTML path rewriting (img src, link href, script src, etc.)
- CSS URL rewriting (url(), @import, @font-face)
- ZIP export containing index.html, assets, screenshot, and metadata.json
- Local preview of captured snapshot
- Visual comparison between original and captured snapshot
- Basic job system with status tracking
- Real-time progress feedback via polling
- Security measures: URL validation, rate limiting, timeout enforcement, SSRF prevention

### MVP Must Not Support

- Login bypass or authentication handling
- Paywall bypass
- Captcha solving or bypass
- Cloudflare challenge bypass
- Anti-bot detection bypass
- Private/dashboard pages that require authentication
- Backend system cloning (e.g., API-only pages)
- Multi-page crawling (future phase)
- Page content editing (future phase)

## Final Output Format

The ZIP export contains:

```
snapshot/
├── index.html          # Rebuilt HTML with local asset references
├── screenshot.png      # Full-page screenshot
├── metadata.json       # Job metadata (title, URL, timestamp, asset count, etc.)
├── assets/
│   ├── css/            # Downloaded stylesheets
│   ├── js/             # Downloaded scripts
│   ├── images/         # Downloaded images
│   ├── fonts/          # Downloaded font files
│   └── media/          # Downloaded video/audio files
└── manifest.json       # Complete asset manifest
```

## Ethical Use Scope

### Allowed

- Public pages owned by the user
- Public pages where the user has explicit written permission
- Authorized website analysis and debugging
- Static page snapshot for personal development/debugging use
- Offline archival of public content for personal reference

### Not Allowed

- Bypassing login forms or authentication
- Bypassing paywalls or subscription gates
- Bypassing captcha or bot detection challenges
- Bypassing Cloudflare or similar protection services
- Cloning private dashboards or authenticated portals
- Copying backend-facing API responses or admin panels
- Unauthorized copying or redistribution of copyrighted website content
- Any use that violates the target website's Terms of Service