import { Request, Response, NextFunction } from 'express'
import * as adminService from '../services/admin.service'
import { AppError } from '../utils/AppError'

function handleAppError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, message: err.message })
  }
  return next(err)
}

/**
 * GET /api/admin/overview
 * System-wide KPIs, counts, revenue, and active waitlist metrics.
 */
export async function getOverview(_req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await adminService.getAdminOverview()
    return res.status(200).json({
      success: true,
      message: 'Admin overview metrics retrieved successfully',
      data: stats,
    })
  } catch (err) {
    return handleAppError(err, res, next)
  }
}

/**
 * GET /api/admin/users
 * System-wide user list (id, name, email, role, createdAt).
 */
export async function getUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = await adminService.listAllUsers()
    return res.status(200).json({
      success: true,
      message: 'System users retrieved successfully',
      data: users,
    })
  } catch (err) {
    return handleAppError(err, res, next)
  }
}

/**
 * GET /api/admin/bookings
 * System-wide bookings list with user, event, venue, and status information.
 */
export async function getBookings(_req: Request, res: Response, next: NextFunction) {
  try {
    const bookings = await adminService.listAllBookings()
    return res.status(200).json({
      success: true,
      message: 'System bookings retrieved successfully',
      data: bookings,
    })
  } catch (err) {
    return handleAppError(err, res, next)
  }
}
