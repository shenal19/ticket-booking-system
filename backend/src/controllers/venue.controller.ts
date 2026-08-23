import { Request, Response, NextFunction } from 'express'
import { validateVenueInput, validateVenueUpdateInput } from '../utils/validators'
import * as venueService from '../services/venue.service'
import { AppError } from '../utils/AppError'

/**
 * Thin HTTP layer for venue management. Every handler here trusts
 * only req.user.userId (set by the authenticate middleware) as the
 * organiser identity — never anything from the request body.
 */

export async function createVenue(req: Request, res: Response, next: NextFunction) {
  const result = validateVenueInput(req.body ?? {})

  if (!result.valid || !result.data) {
    return res.status(400).json({
      success: false,
      message: 'Invalid venue input',
      errors: result.errors,
    })
  }

  try {
    const organiserId = req.user!.userId
    const venue = await venueService.createVenue(result.data, organiserId)

    return res.status(201).json({
      success: true,
      message: 'Venue created successfully',
      data: venue,
    })
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ success: false, message: err.message })
    }
    return next(err)
  }
}

export async function listVenues(req: Request, res: Response, next: NextFunction) {
  try {
    const organiserId = req.user!.userId
    const venues = await venueService.listVenues(organiserId)

    return res.status(200).json({
      success: true,
      message: 'Venues retrieved successfully',
      data: venues,
    })
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ success: false, message: err.message })
    }
    return next(err)
  }
}

export async function getVenue(req: Request, res: Response, next: NextFunction) {
  try {
    const organiserId = req.user!.userId
    const venue = await venueService.getVenueForOrganiser(req.params.venueId as string, organiserId)

    return res.status(200).json({
      success: true,
      message: 'Venue retrieved successfully',
      data: venue,
    })
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ success: false, message: err.message })
    }
    return next(err)
  }
}

export async function updateVenue(req: Request, res: Response, next: NextFunction) {
  const result = validateVenueUpdateInput(req.body ?? {})

  if (!result.valid || !result.data) {
    return res.status(400).json({
      success: false,
      message: 'Invalid venue input',
      errors: result.errors,
    })
  }

  try {
    const organiserId = req.user!.userId
    const venue = await venueService.updateVenue(
      req.params.venueId as string,
      organiserId,
      result.data
    )

    return res.status(200).json({
      success: true,
      message: 'Venue updated successfully',
      data: venue,
    })
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ success: false, message: err.message })
    }
    return next(err)
  }
}

export async function deleteVenue(req: Request, res: Response, next: NextFunction) {
  try {
    const organiserId = req.user!.userId
    await venueService.deleteVenue(req.params.venueId as string, organiserId)

    return res.status(200).json({
      success: true,
      message: 'Venue deleted successfully',
    })
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ success: false, message: err.message })
    }
    return next(err)
  }
}
