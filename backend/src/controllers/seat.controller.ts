import { Request, Response, NextFunction } from 'express'
import { validateSeatInput, validateSeatUpdateInput } from '../utils/validators'
import * as seatService from '../services/seat.service'
import { AppError } from '../utils/AppError'

/**
 * Thin HTTP layer for seat management, nested under a venue.
 * venueId always comes from the route (req.params.venueId), never
 * the request body — so a seat can't be created/moved into a venue
 * the organiser doesn't own.
 */

export async function createSeat(req: Request, res: Response, next: NextFunction) {
  const result = validateSeatInput(req.body ?? {})

  if (!result.valid || !result.data) {
    return res.status(400).json({
      success: false,
      message: 'Invalid seat input',
      errors: result.errors,
    })
  }

  try {
    const organiserId = req.user!.userId
    const seat = await seatService.createSeat(req.params.venueId as string, organiserId, result.data)

    return res.status(201).json({
      success: true,
      message: 'Seat created successfully',
      data: seat,
    })
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ success: false, message: err.message })
    }
    return next(err)
  }
}

export async function listSeats(req: Request, res: Response, next: NextFunction) {
  try {
    const organiserId = req.user!.userId
    const seats = await seatService.listSeatsForVenue(req.params.venueId as string, organiserId)

    return res.status(200).json({
      success: true,
      message: 'Seats retrieved successfully',
      data: seats,
    })
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ success: false, message: err.message })
    }
    return next(err)
  }
}

export async function getSeat(req: Request, res: Response, next: NextFunction) {
  try {
    const organiserId = req.user!.userId
    const seat = await seatService.getSeatForVenue(
      req.params.venueId as string,
      req.params.seatId as string,
      organiserId
    )

    return res.status(200).json({
      success: true,
      message: 'Seat retrieved successfully',
      data: seat,
    })
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ success: false, message: err.message })
    }
    return next(err)
  }
}

export async function updateSeat(req: Request, res: Response, next: NextFunction) {
  const result = validateSeatUpdateInput(req.body ?? {})

  if (!result.valid || !result.data) {
    return res.status(400).json({
      success: false,
      message: 'Invalid seat input',
      errors: result.errors,
    })
  }

  try {
    const organiserId = req.user!.userId
    const seat = await seatService.updateSeat(
      req.params.venueId as string,
      req.params.seatId as string,
      organiserId,
      result.data
    )

    return res.status(200).json({
      success: true,
      message: 'Seat updated successfully',
      data: seat,
    })
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ success: false, message: err.message })
    }
    return next(err)
  }
}

export async function deleteSeat(req: Request, res: Response, next: NextFunction) {
  try {
    const organiserId = req.user!.userId
    await seatService.deleteSeat(req.params.venueId as string, req.params.seatId as string, organiserId)

    return res.status(200).json({
      success: true,
      message: 'Seat deleted successfully',
    })
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ success: false, message: err.message })
    }
    return next(err)
  }
}
