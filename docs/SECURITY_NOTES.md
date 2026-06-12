# PageMirror — Security Notes

> All security protections listed here are implemented and active in the current codebase. They apply in both development and production modes.

---

## URL Validation — Always Blocked

The following URL patterns are **rejected at the validation layer** before any browser process is launched:

| Pattern | Reason |
|---|---|
| `localhost` | Internal/local access |
| `127.0.0.1` | Loopback address |
| `0.0.0.0` | All-interface bind |
| `10.x.x.x` | Private IP range (Class A) |
| `172.16.0.0 – 172.31.255.255` | Private IP range (Class B) |
| `192.168.x.x` | Private IP range (Class C) |
| `169.254.169.254` | Cloud metadata IP (AWS, GCP, Azure) |
| `file://` | Local filesystem access — SSRF risk |
| `ftp://` | FTP protocol |
| `javascript:` | Code injection risk |
| `data:` | Inline data URI |

**Implementation:** `middleware/validate-url.middleware.js` + `utils/security.util.js`

---

## Rate Limits

Three separate rate limiters are active:

| Limiter | Dev Mode | Prod Mode | Config Keys |
|---|---|---|---|
| Clone submit (POST /api/clone) | 100/15min | 20/15min | `DEV_CLONE_RATE_LIMIT_MAX`, `PROD_CLONE_RATE_LIMIT_MAX` |
| Job status poll (GET /api/jobs/:jobId) | 5000/15min | 600/15min | `DEV_POLL_RATE_LIMIT_MAX`, `PROD_POLL_RATE_LIMIT_MAX` |
| Preview serving (GET /preview/*) | 5000/15min | 1000/15min | `DEV_PREVIEW_RATE_LIMIT_MAX`, `PROD_PREVIEW_RATE_LIMIT_MAX` |

Flip between modes: `APP_MODE=development` or `APP_MODE=production` in `.env`.

---

## Resource Limits

| Limit | Default | Config Key |
|---|---|---|
| Page load timeout | 30,000 ms | `PLAYWRIGHT_NAV_TIMEOUT` |
| Auto-scroll max duration | 15,000 ms | `AUTO_SCROLL_MAX_DURATION_MS` |
| Max asset file size | 10 MB | `MAX_ASSET_SIZE_BYTES` |
| Max assets per job | 200 files | `MAX_ASSETS_PER_JOB` |
| Max total output size | 500 MB | `MAX_TOTAL_OUTPUT_BYTES` |
| Max concurrent jobs | 2 | `MAX_CONCURRENT_JOBS` |
| Stale job timeout | 30 min | `JOB_STALE_AFTER_MINUTES` |

---

## SSRF Prevention

SSRF (Server-Side Request Forgery) is the primary security risk. Protection layers:

1. URL validation rejects private/internal patterns **before** Playwright is invoked
2. Cloud metadata IP (169.254.169.254) specifically blocked
3. Playwright launched in sandboxed headless mode (`--no-sandbox` avoided in production)
4. Page load timeout prevents long-running requests
5. Output directory isolated per jobId — no shared state between jobs

---

## Error Sanitization

Raw errors from Playwright, Node.js, or internal services are **never** exposed to clients:

- Stack traces are logged internally only — never included in API responses
- Internal file paths are stripped from error messages
- Playwright/Chromium error dumps are normalized to safe user-facing messages
- Failed job errors are mapped via `sanitizeJobError()` in `job.service.js`

Error categories and codes:
- `CAPTURE_TIMEOUT` — Page load timed out
- `DNS_LOOKUP_FAILED` — Domain could not be resolved
- `NAVIGATION_FAILED` — Browser navigation error
- `CAPTURE_FAILED` — Generic failure fallback
- `JOB_INTERRUPTED` — Server restart during job
- `JOB_STALE` — Job timed out silently

---

## Output & Path Security

- Output files stored per jobId in `backend/output/<jobId>/`
- `getJobOutputDir(jobId)` validates jobId format and resolves path safely
- Preview asset endpoint checks that resolved path remains within `output/<jobId>/assets/`
- Screenshot, preview-screenshot, visual-diff endpoints use `getJobOutputDir` for safe resolution
- ZIP generation validates required files exist before streaming (409 if incomplete)
- Delete job validates path before calling `fs.remove`

---

## What This Project Must Not Support

| Feature | Reason |
|---|---|
| Login/password bypass | Ethical violation |
| Captcha solving | Anti-bot bypass |
| Paywall bypass | Terms of Service violation |
| Cloudflare challenge bypass | Anti-bot protection bypass |
| Private dashboard cloning | Authentication bypass |
| Cookie/session injection | Impersonation |
| Form auto-fill/submission | Action automation |

These features **must never be implemented** in any phase.

---

## Data Handling

- No user accounts or authentication in current version (MVP)
- No cookies, sessions, or tokens stored
- No database — job data stored in per-job JSON files under `backend/output/`
- Logs may contain submitted URLs — log rotation should be configured for production
- Environment variables must never be committed to version control (`.gitignore` configured)
- Future token system config keys exist in `.env.example` but are not active (`ENABLE_ACCOUNT_TOKENS=false`)

---

## Production Deployment Checklist (Phase 20)

When deploying to production:
- [ ] Use HTTPS with valid SSL certificate
- [ ] Set `APP_MODE=production` in `.env`
- [ ] Set up Nginx as reverse proxy (TLS termination)
- [ ] Run Node.js process as non-root user
- [ ] Enable firewall (UFW) — ports 80/443 + SSH only
- [ ] Set up output cleanup cron (delete outputs older than N days)
- [ ] Monitor logs for abuse patterns
- [ ] Configure additional rate limiting at Nginx level
- [ ] Install Playwright system dependencies for headless Chromium