# PageMirror — API Reference

> All endpoints are implemented and active. The backend runs on port 5000 by default.

---

## Response Format

All API responses follow this consistent envelope:

**Success:**
```json
{
  "success": true,
  "data": {}
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "message": "Human-readable message",
    "code": "ERROR_CODE"
  }
}
```

---

## `GET /api/health`

**Purpose:** Server health check.

**Response (200):**
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2026-06-05T01:00:00.000Z",
  "uptime": 123.45
}
```

---

## `POST /api/clone`

**Purpose:** Submit a URL for snapshotting. Returns a job ID immediately (202 Accepted). Job runs asynchronously.

**Rate Limited:** Yes (per IP — see `DEV_CLONE_RATE_LIMIT_MAX` / `PROD_CLONE_RATE_LIMIT_MAX`)

**Request:**
```json
{
  "url": "https://example.com"
}
```

**Response (202) — Job accepted:**
```json
{
  "success": true,
  "message": "Snapshot job created.",
  "data": {
    "jobId": "pm-job-abc123",
    "status": "queued",
    "progress": 0,
    "currentStep": "Queued",
    "url": "https://example.com"
  }
}
```

**Response (400) — URL validation error:**
```json
{
  "success": false,
  "error": {
    "message": "Only HTTP and HTTPS URLs are allowed.",
    "code": "INVALID_URL"
  }
}
```

**Response (403) — Blocked URL (SSRF/private IP):**
```json
{
  "success": false,
  "error": {
    "message": "Localhost URLs are not allowed.",
    "code": "INVALID_URL"
  }
}
```

**Response (429) — Concurrent job limit:**
```json
{
  "success": false,
  "error": {
    "message": "A snapshot job is already running. Please wait until it finishes.",
    "code": "JOB_LIMIT_REACHED"
  }
}
```

**Response (429) — Rate limited:**
```json
{
  "success": false,
  "error": {
    "message": "Too many snapshot submissions. Please wait a moment and try again.",
    "code": "RATE_LIMITED"
  }
}
```

---

## `GET /api/jobs/:jobId`

**Purpose:** Get the current status, progress, and metadata of a snapshot job.

**Rate Limited:** Yes (generous polling limit — `DEV_POLL_RATE_LIMIT_MAX` / `PROD_POLL_RATE_LIMIT_MAX`)

**Response (200) — Running:**
```json
{
  "success": true,
  "data": {
    "jobId": "pm-job-abc123",
    "url": "https://example.com",
    "status": "running",
    "progress": 55,
    "currentStep": "Downloading assets",
    "logs": [
      { "time": "...", "step": "Launching browser", "message": "..." },
      { "time": "...", "step": "Downloading assets", "message": "..." }
    ],
    "createdAt": "2026-06-05T01:00:00.000Z",
    "finishedAt": null
  }
}
```

**Response (200) — Completed:**
```json
{
  "success": true,
  "data": {
    "jobId": "pm-job-abc123",
    "status": "completed",
    "progress": 100,
    "currentStep": "Completed",
    "title": "Example Domain",
    "assetSummary": { "total": 6, "downloaded": 5, "failed": 0, "skipped": 1 },
    "rewrite": { "htmlRewritten": 5, "htmlSkipped": 1, "cssRewritten": 2 },
    "intelligence": { "libraries": {...}, "summary": {...} },
    "visualCompare": { "status": "completed", "score": 93.35, "differentPixels": 12450 },
    "files": { "html": true, "originalHtml": true, "screenshot": true },
    "durationMs": 5089,
    "links": {
      "screenshot": "/api/jobs/pm-job-abc123/screenshot",
      "previewScreenshot": "/api/jobs/pm-job-abc123/preview-screenshot",
      "visualDiff": "/api/jobs/pm-job-abc123/visual-diff",
      "preview": "/preview/pm-job-abc123",
      "download": "/api/jobs/pm-job-abc123/download",
      "manifest": "/api/jobs/pm-job-abc123/manifest"
    }
  }
}
```

**Response (200) — Failed:**
```json
{
  "success": true,
  "data": {
    "jobId": "pm-job-abc123",
    "status": "failed",
    "progress": 15,
    "currentStep": "Launching browser",
    "error": {
      "message": "The target domain name could not be resolved.",
      "code": "DNS_LOOKUP_FAILED"
    }
  }
}
```

**Response (404):**
```json
{
  "success": false,
  "error": {
    "message": "Job not found.",
    "code": "JOB_NOT_FOUND"
  }
}
```

---

## `GET /api/jobs`

**Purpose:** List all snapshot jobs (newest first).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "jobId": "pm-job-abc123",
        "url": "https://example.com",
        "status": "completed",
        "title": "Example Domain",
        "progress": 100,
        "score": 93.35,
        "assetSummary": { "total": 6, "downloaded": 5 },
        "createdAt": "2026-06-05T01:00:00.000Z",
        "finishedAt": "2026-06-05T01:00:05.000Z",
        "links": { "preview": "/preview/pm-job-abc123", "download": "/api/jobs/pm-job-abc123/download" }
      }
    ]
  }
}
```

---

## `DELETE /api/jobs/:jobId`

**Purpose:** Permanently delete a job's output directory.

**Response (200):**
```json
{
  "success": true,
  "message": "Job sandbox folder deleted successfully."
}
```

---

## `GET /api/jobs/:jobId/download`

**Purpose:** Download the completed snapshot as a ZIP archive.

**Response (200):**
- Content-Type: `application/zip`
- Content-Disposition: `attachment; filename="pagemirror-<jobId>.zip"`
- Body: Binary ZIP stream

**Response (409):** Required files not yet ready (job still running or incomplete)

---

## `GET /api/jobs/:jobId/screenshot`

**Purpose:** Serve the original full-page screenshot.

**Response (200):** `Content-Type: image/png`

---

## `GET /api/jobs/:jobId/preview-screenshot`

**Purpose:** Serve the preview screenshot (of the rebuilt local HTML).

**Response (200):** `Content-Type: image/png`

---

## `GET /api/jobs/:jobId/visual-diff`

**Purpose:** Serve the pixelmatch visual diff overlay image.

**Response (200):** `Content-Type: image/png`

---

## `GET /api/jobs/:jobId/manifest`

**Purpose:** Fetch the full asset catalog manifest.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "jobId": "pm-job-abc123",
    "url": "https://example.com",
    "phase": "finalized",
    "summary": { "total": 6, "stylesheet": 1, "script": 2, "image": 2, "font": 1 },
    "assets": [
      {
        "id": "asset_001",
        "type": "image",
        "originalUrl": "https://example.com/hero.jpg",
        "localPath": "assets/images/hero.jpg",
        "status": "downloaded",
        "sizeBytes": 45234,
        "rewrittenInHtml": true
      }
    ]
  }
}
```

---

## `GET /preview/:jobId`

**Purpose:** Serve the rebuilt snapshot HTML page for in-browser preview.

**Response (200):** `Content-Type: text/html`

---

## `GET /preview/:jobId/assets/*`

**Purpose:** Serve local snapshot assets inside the preview iframe.

**Security:** Path traversal prevention — assets must resolve within `output/<jobId>/assets/`

---

## Error Codes Reference

| Code | HTTP | Meaning |
|---|---|---|
| `INVALID_URL` | 400/403 | URL failed validation or SSRF check |
| `JOB_LIMIT_REACHED` | 429 | Too many concurrent active jobs |
| `RATE_LIMITED` | 429 | Too many requests from this IP |
| `JOB_NOT_FOUND` | 404 | No job exists with given ID |
| `INVALID_JOB_ID` | 400 | Job ID has unsafe characters |
| `REQUIRED_FILE_MISSING` | 409 | ZIP requested but required files missing |
| `CAPTURE_FAILED` | — | Generic capture failure |
| `CAPTURE_TIMEOUT` | — | Page load timed out |
| `DNS_LOOKUP_FAILED` | — | Domain could not be resolved |
| `NAVIGATION_FAILED` | — | Browser failed to navigate to URL |
| `JOB_INTERRUPTED` | — | Job was interrupted by server restart |
| `JOB_STALE` | — | Job exceeded stale timeout (30 min default) |
| `ROUTE_NOT_FOUND` | 404 | Endpoint does not exist |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |