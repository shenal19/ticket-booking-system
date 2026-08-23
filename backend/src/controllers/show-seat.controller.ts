import { Request, Response, NextFunction } from 'express'
import { validateShowSeatIdsInput } from '../utils/validators'
import * as showSeatService from '../services/show-seat.service'
import { AppError } from '../utils/AppError'

function handleAppError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, message: err.message })
  }
  return next(err)
}

/**
 * Thin HTTP layer for customer-facing show-seat retrieval.
 * Authentication/role enforcement (CUSTOMER) happens in
 * show-seat.routes.ts, before this handler ever runs.
 */
export async function getShowSeats(req: Request, res: Response, next: NextFunction) {
  try {
    const showSeats = await showSeatService.getShowSeatsForShow(req.params.showId as string)

    return res.status(200).json({
      success: true,
      message: 'Show seats retrieved successfully',
      data: showSeats,
    })
  } catch (err) {
    return handleAppError(err, res, next)
  }
}

/**
 * Hold one or more seats for a show (Phase 8). customerId always
 * comes from req.user.userId (set by authenticate) — never the
 * request body.
 */
export async function holdShowSeats(req: Request, res: Response, next: NextFunction) {
  const result = validateShowSeatIdsInput(req.body ?? {})

  if (!result.valid || !result.data) {
    return res.status(400).json({
      success: false,
      message: 'Invalid hold request',
      errors: result.errors,
    })
  }

  try {
    const customerId = req.user!.userId
    const held = await showSeatService.holdSeats(
      req.params.showId as string,
      result.data.showSeatIds,
      customerId
    )

    return res.status(200).json({
      success: true,
      message: 'Seats held successfully',
      data: held,
    })
  } catch (err) {
    return handleAppError(err, res, next)
  }
}

/**
 * Release the authenticated customer's own hold on one or more
 * seats for a show (Phase 8). customerId always comes from
 * req.user.userId — a client-supplied holdToken is never accepted
 * as authorization to release a seat.
 */
export async function releaseShowSeats(req: Request, res: Response, next: NextFunction) {
  const result = validateShowSeatIdsInput(req.body ?? {})

  if (!result.valid || !result.data) {
    return res.status(400).json({
      success: false,
      message: 'Invalid release request',
      errors: result.errors,
    })
  }

  try {
    const customerId = req.user!.userId
    const released = await showSeatService.releaseHoldSeats(
      req.params.showId as string,
      result.data.showSeatIds,
      customerId
    )

    return res.status(200).json({
      success: true,
      message: 'Seats released successfully',
      data: released,
    })
  } catch (err) {
    return handleAppError(err, res, next)
  }
}
