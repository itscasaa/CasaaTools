import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '../.env') })
dotenv.config()

// Add SCANNER_ prefix fallback support (SCANNER_ takes precedence if set)
export const scannerConfig = {
  // Concurrency (Requirement 9.1)
  MAX_CONCURRENT_SCANS: parseInt(process.env.SCANNER_MAX_CONCURRENT || process.env.MAX_CONCURRENT_SCANS || '2', 10),

  // Timeouts (Requirements 9.3)
  LIGHTHOUSE_TIMEOUT_MS: parseInt(process.env.SCANNER_LIGHTHOUSE_TIMEOUT_MS || process.env.LIGHTHOUSE_TIMEOUT_MS || '120000', 10),
  CODEQL_TIMEOUT_MS: parseInt(process.env.SCANNER_CODEQL_TIMEOUT_MS || process.env.CODEQL_TIMEOUT_MS || '600000', 10),

  // Stale detection (Requirement 9.4 implied via lifecycle)
  SCAN_STALE_AFTER_MINUTES: parseInt(process.env.SCANNER_STALE_AFTER_MINUTES || process.env.SCAN_STALE_AFTER_MINUTES || '30', 10),

  // Repository limits (Requirement 9.4)
  MAX_REPO_SIZE_MB: parseInt(process.env.SCANNER_MAX_REPO_SIZE_MB || process.env.MAX_REPO_SIZE_MB || '200', 10),

  // Cleanup (Requirements 10.1, 10.2)
  SCAN_OUTPUT_MAX_AGE_DAYS: parseInt(process.env.SCANNER_CLEANUP_MAX_AGE_DAYS || process.env.SCAN_OUTPUT_MAX_AGE_DAYS || '7', 10),
  CLEANUP_INTERVAL_MS: parseInt(process.env.SCANNER_CLEANUP_INTERVAL_MS || process.env.CLEANUP_INTERVAL_MS || '3600000', 10),

  // Directories
  SCAN_OUTPUT_DIR: process.env.SCANNER_OUTPUT_DIR || process.env.SCAN_OUTPUT_DIR || './output',
  WORKSPACE_DIR: process.env.SCANNER_WORKSPACE_DIR || process.env.WORKSPACE_DIR || './workspaces',

  // Registered workspaces (JSON array in env)
  REGISTERED_WORKSPACES: JSON.parse(process.env.SCANNER_REGISTERED_WORKSPACES || process.env.REGISTERED_WORKSPACES || '[]'),

  // Maximum redirects to follow during preflight SSRF check
  MAX_REDIRECTS: parseInt(process.env.SCANNER_MAX_REDIRECTS || process.env.MAX_REDIRECTS || '5', 10),

  // Chrome path override for Lighthouse
  CHROME_PATH: process.env.SCANNER_CHROME_PATH || null,

  // Lighthouse options
  LIGHTHOUSE_CATEGORIES: ['performance', 'accessibility', 'best-practices', 'seo'],
  MAX_OPPORTUNITIES: 20,
  MAX_DIAGNOSTICS: 20,

  // Performance provider (pagespeed = Google PSI API, lighthouse = local)
  PERFORMANCE_PROVIDER: process.env.SCANNER_PERFORMANCE_PROVIDER || 'pagespeed',

  // PageSpeed Insights API settings
  PAGESPEED_API_KEY: process.env.SCANNER_PAGESPEED_API_KEY || '',
  PAGESPEED_STRATEGY: process.env.SCANNER_PAGESPEED_STRATEGY || 'mobile',
  PAGESPEED_LOCALE: process.env.SCANNER_PAGESPEED_LOCALE || 'id',
  PAGESPEED_TIMEOUT_MS: parseInt(process.env.SCANNER_PAGESPEED_TIMEOUT_MS || '120000', 10),
  PAGESPEED_CATEGORIES: (process.env.SCANNER_PAGESPEED_CATEGORIES || 'performance,accessibility,best-practices,seo').split(','),

  // Legacy local Lighthouse settings (used only when PERFORMANCE_PROVIDER=lighthouse)
  LIGHTHOUSE_RUNS: parseInt(process.env.SCANNER_LIGHTHOUSE_RUNS || '3', 10),
  LIGHTHOUSE_RESULT_STRATEGY: process.env.SCANNER_LIGHTHOUSE_RESULT_STRATEGY || 'median',
  LIGHTHOUSE_FORM_FACTOR: process.env.SCANNER_LIGHTHOUSE_FORM_FACTOR || 'mobile',
  LIGHTHOUSE_THROTTLING: process.env.SCANNER_LIGHTHOUSE_THROTTLING || 'simulate',

  // CodeQL options
  CODEQL_LANGUAGE: 'javascript-typescript',
  CODEQL_QUERY_PACK: 'codeql/javascript-security-queries',

  // ZIP upload limits
  MAX_ZIP_SIZE_MB: parseInt(process.env.SCANNER_MAX_ZIP_SIZE_MB || '100', 10),
  MAX_EXTRACTED_SIZE_MB: parseInt(process.env.SCANNER_MAX_EXTRACTED_SIZE_MB || '200', 10),
  MAX_EXTRACTED_FILES: parseInt(process.env.SCANNER_MAX_EXTRACTED_FILES || '5000', 10),
  MAX_SINGLE_FILE_MB: parseInt(process.env.SCANNER_MAX_SINGLE_FILE_MB || '20', 10),

  // CodeQL CLI path
  CODEQL_PATH: process.env.SCANNER_CODEQL_PATH || null,
  CODEQL_QUERY_SUITE: process.env.SCANNER_CODEQL_QUERY_SUITE || 'javascript-security-extended',

  // Workspace cleanup
  CLEANUP_WORKSPACE_AFTER_SCAN: process.env.SCANNER_CLEANUP_WORKSPACE_AFTER_SCAN !== 'false',
  KEEP_WORKSPACE: process.env.SCANNER_KEEP_WORKSPACE === 'true'
}
