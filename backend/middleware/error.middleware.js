import { logger } from '../utils/logger.util.js'

// Central Error Handler Middleware
// Stack traces are logged server-side only and never exposed in API responses.
export const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR'
  const errorMessage = err.message || 'An unexpected server error occurred.'
  
  // Log full technical details internally — never expose to client
  logger.error(`${req.method} ${req.url} - Error [${errorCode}]: ${errorMessage}`, err)
  
  res.status(statusCode).json({
    success: false,
    error: {
      message: errorMessage,
      code: errorCode
    }
  })
}

// 404 Route Handler Middleware
export const notFoundMiddleware = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Endpoint ${req.method} ${req.url} was not found on this server.`,
      code: 'ROUTE_NOT_FOUND'
    }
  })
}
