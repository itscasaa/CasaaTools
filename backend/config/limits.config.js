import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '../.env') })
dotenv.config()

// Force nodemon reload to pick up new .env CORS settings
export const limitsConfig = {
  // App Mode ('development' or 'production')
  APP_MODE: process.env.APP_MODE || process.env.NODE_ENV || 'development',

  // Rate limit settings for clone submissions
  DEV_CLONE_RATE_LIMIT_MAX: parseInt(process.env.DEV_CLONE_RATE_LIMIT_MAX || '100', 10),
  DEV_CLONE_RATE_LIMIT_WINDOW_MS: parseInt(process.env.DEV_CLONE_RATE_LIMIT_WINDOW_MS || '900000', 10),
  PROD_CLONE_RATE_LIMIT_MAX: parseInt(process.env.PROD_CLONE_RATE_LIMIT_MAX || '20', 10),
  PROD_CLONE_RATE_LIMIT_WINDOW_MS: parseInt(process.env.PROD_CLONE_RATE_LIMIT_WINDOW_MS || '900000', 10),

  // Rate limit settings for status/polling endpoints
  DEV_POLL_RATE_LIMIT_MAX: parseInt(process.env.DEV_POLL_RATE_LIMIT_MAX || '5000', 10),
  DEV_POLL_RATE_LIMIT_WINDOW_MS: parseInt(process.env.DEV_POLL_RATE_LIMIT_WINDOW_MS || '900000', 10),
  PROD_POLL_RATE_LIMIT_MAX: parseInt(process.env.PROD_POLL_RATE_LIMIT_MAX || '600', 10),
  PROD_POLL_RATE_LIMIT_WINDOW_MS: parseInt(process.env.PROD_POLL_RATE_LIMIT_WINDOW_MS || '900000', 10),

  // Rate limit settings for preview/static endpoints
  DEV_PREVIEW_RATE_LIMIT_MAX: parseInt(process.env.DEV_PREVIEW_RATE_LIMIT_MAX || '5000', 10),
  DEV_PREVIEW_RATE_LIMIT_WINDOW_MS: parseInt(process.env.DEV_PREVIEW_RATE_LIMIT_WINDOW_MS || '900000', 10),
  PROD_PREVIEW_RATE_LIMIT_MAX: parseInt(process.env.PROD_PREVIEW_RATE_LIMIT_MAX || '1000', 10),
  PROD_PREVIEW_RATE_LIMIT_WINDOW_MS: parseInt(process.env.PROD_PREVIEW_RATE_LIMIT_WINDOW_MS || '900000', 10),

  // Future token placeholders for production launch
  // - ENABLE_ACCOUNT_TOKENS: In production, each authenticated user will have a token balance.
  // - DEFAULT_USER_TOKENS: Default account starting balance (e.g., 5 snapshot tokens).
  // - TOKEN_COST_PER_SNAPSHOT: A snapshot job will require at least 1 token.
  // - REFUND_TOKEN_ON_INTERNAL_FAILURE: Tokens are refunded if an internal system error occurs.
  // - Note: Invalid/blocked URLs should not consume tokens.
  ENABLE_ACCOUNT_TOKENS: process.env.ENABLE_ACCOUNT_TOKENS === 'true',
  DEFAULT_USER_TOKENS: parseInt(process.env.DEFAULT_USER_TOKENS || '5', 10),
  TOKEN_COST_PER_SNAPSHOT: parseInt(process.env.TOKEN_COST_PER_SNAPSHOT || '1', 10),
  REFUND_TOKEN_ON_INTERNAL_FAILURE: process.env.REFUND_TOKEN_ON_INTERNAL_FAILURE !== 'false',

  MAX_PAGE_TIMEOUT: parseInt(process.env.MAX_PAGE_TIMEOUT || '30000', 10), // 30s default
  MAX_ASSET_SIZE_MB: parseInt(process.env.MAX_ASSET_SIZE_MB || '10', 10),
  MAX_TOTAL_ASSETS: parseInt(process.env.MAX_TOTAL_ASSETS || '150', 10),
  MAX_REDIRECTS: parseInt(process.env.MAX_REDIRECTS || '3', 10),
  MAX_TOTAL_OUTPUT_SIZE_MB: parseInt(process.env.MAX_TOTAL_OUTPUT_SIZE_MB || '100', 10),
  ASSET_DOWNLOAD_TIMEOUT_MS: parseInt(process.env.ASSET_DOWNLOAD_TIMEOUT_MS || '15000', 10),
  MAX_CONCURRENT_DOWNLOADS: parseInt(process.env.MAX_CONCURRENT_DOWNLOADS || '5', 10),
  MAX_CONCURRENT_JOBS: parseInt(process.env.MAX_CONCURRENT_JOBS || '2', 10),
  JOB_STALE_AFTER_MINUTES: parseInt(process.env.JOB_STALE_AFTER_MINUTES || '30', 10),
  ENABLE_AUTO_SCROLL: process.env.ENABLE_AUTO_SCROLL !== 'false',
  AUTO_SCROLL_STEP_PX: parseInt(process.env.AUTO_SCROLL_STEP_PX || '600', 10),
  AUTO_SCROLL_DELAY_MS: parseInt(process.env.AUTO_SCROLL_DELAY_MS || '250', 10),
  AUTO_SCROLL_MAX_DURATION_MS: parseInt(process.env.AUTO_SCROLL_MAX_DURATION_MS || '15000', 10),
  AUTO_SCROLL_BACK_TO_TOP: process.env.AUTO_SCROLL_BACK_TO_TOP !== 'false',
  POST_SCROLL_WAIT_MS: parseInt(process.env.POST_SCROLL_WAIT_MS || '1000', 10),
  REBUILD_COOLDOWN_MS: parseInt(process.env.REBUILD_COOLDOWN_MS || '15000', 10)
}
