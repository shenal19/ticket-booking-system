import { NextFunction, Request, Response } from 'express'

/**
 * Catch-all 404 handler for unmatched routes.
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  })
}

/**
 * Centralized error handler.
 *
 * Kept intentionally basic for Phase 1 — no custom error classes
 * or logging integration yet. Later phases can extend this to
 * handle validation errors, auth errors, etc.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err)

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  })
}
