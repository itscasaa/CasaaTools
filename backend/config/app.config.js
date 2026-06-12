import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from root directory
dotenv.config({ path: path.resolve(process.cwd(), '../.env') })
// Also try current directory for robustness
dotenv.config()

/**
 * Parse allowed origins from environment variable.
 * Supports comma-separated list or single value.
 * @returns {string|string[]} CORS origin configuration
 */
const parseAllowedOrigins = () => {
  const origins = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173'
  
  // If contains comma, parse as array
  if (origins.includes(',')) {
    return origins.split(',').map(o => o.trim())
  }
  
  // Single origin
  return origins
}

export const appConfig = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  ALLOWED_ORIGINS: parseAllowedOrigins(),
  API_PREFIX: process.env.API_PREFIX || '/api',
  OUTPUT_DIR: process.env.OUTPUT_DIR || './output'
}
