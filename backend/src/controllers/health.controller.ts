import { Request, Response } from 'express'

/**
 * GET /api/health
 *
 * Simple liveness check used to confirm the API is running.
 * No business logic or database access belongs here.
 */
export function getHealth(_req: Request, res: Response) {
  res.status(200).json({
    success: true,
    message: 'Ticket Booking System API is running',
  })
}
