import { Request, Response, NextFunction } from 'express'
import { validateBookingInput } from '../utils/validators'
import * as bookingService from '../services/booking.service'
import { AppError } from '../utils/AppError'

function handleAppError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, message: err.message })
  }
  return next(err)
}

/**
 * Create a booking (Phase 9). userId always comes from
 * req.user.userId (set by authenticate) — never the request body.
 */
export async function createBooking(req: Request, res: Response, next: NextFunction) {
  const result = validateBookingInput(req.body ?? {})

  if (!result.valid || !result.data) {
    return res.status(400).json({
      success: false,
      message: 'Invalid booking input',
      errors: result.errors,
    })
  }

  try {
    const userId = req.user!.userId
    const booking = await bookingService.createBooking(userId, result.data)

    return res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking,
    })
  } catch (err) {
    return handleAppError(err, res, next)
  }
}

/**
 * List all bookings for the authenticated customer (Phase 11).
 */
export async function listMyBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId
    const bookings = await bookingService.listMyBookings(userId)

    return res.status(200).json({
      success: true,
      message: 'Bookings retrieved successfully',
      data: bookings,
    })
  } catch (err) {
    return handleAppError(err, res, next)
  }
}

/**
 * Cancel a booking. userId always comes from
 * req.user.userId (set by authenticate) — never the request body.
 */
export async function cancelBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId
    const bookingId = req.params.bookingId as string
    const booking = await bookingService.cancelBooking(userId, bookingId)

    return res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking,
    })
  } catch (err) {
    return handleAppError(err, res, next)
  }
}

