import {
  Request,
  Response,
  NextFunction,
} from 'express'

import {
  validateShowInput,
  validateShowUpdateInput,
  validateShowPriceInput,
  validateShowPriceUpdateInput,
} from '../utils/validators'

import * as showService from '../services/show.service'
import { AppError } from '../utils/AppError'

function handleAppError(
  err: unknown,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    })
  }

  return next(err)
}

/*
 * ============================================================
 * CUSTOMER SHOW DISCOVERY
 * ============================================================
 */

/**
 * GET /api/shows/event/:eventId
 *
 * Authenticated customers can retrieve all shows
 * belonging to an event.
 */
export async function listShowsForEvent(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const shows =
      await showService.listShowsForEvent(
        req.params.eventId as string
      )

    return res.status(200).json({
      success: true,
      message: 'Shows retrieved successfully',
      data: shows,
    })
  } catch (err) {
    return handleAppError(
      err,
      res,
      next
    )
  }
}

/**
 * GET /api/shows/:showId
 *
 * Authenticated customers can retrieve a show.
 */
export async function getPublicShow(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const show =
      await showService.getShow(
        req.params.showId as string
      )

    return res.status(200).json({
      success: true,
      message: 'Show retrieved successfully',
      data: show,
    })
  } catch (err) {
    return handleAppError(
      err,
      res,
      next
    )
  }
}

/*
 * ============================================================
 * ORGANISER SHOW CRUD
 * ============================================================
 */

export async function createShow(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const result =
    validateShowInput(
      req.body ?? {}
    )

  if (
    !result.valid ||
    !result.data
  ) {
    return res.status(400).json({
      success: false,
      message: 'Invalid show input',
      errors: result.errors,
    })
  }

  try {
    const organiserId =
      req.user!.userId

    const show =
      await showService.createShow(
        result.data,
        organiserId
      )

    return res.status(201).json({
      success: true,
      message: 'Show created successfully',
      data: show,
    })
  } catch (err) {
    return handleAppError(
      err,
      res,
      next
    )
  }
}

/**
 * Existing organiser-only show listing.
 */
export async function listShows(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const organiserId =
      req.user!.userId

    const shows =
      await showService.listShows(
        organiserId
      )

    return res.status(200).json({
      success: true,
      message: 'Shows retrieved successfully',
      data: shows,
    })
  } catch (err) {
    return handleAppError(
      err,
      res,
      next
    )
  }
}

/**
 * Existing organiser-only get show.
 */
export async function getShow(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const organiserId =
      req.user!.userId

    const show =
      await showService.getShowForOrganiser(
        req.params.showId as string,
        organiserId
      )

    return res.status(200).json({
      success: true,
      message: 'Show retrieved successfully',
      data: show,
    })
  } catch (err) {
    return handleAppError(
      err,
      res,
      next
    )
  }
}

export async function updateShow(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const result =
    validateShowUpdateInput(
      req.body ?? {}
    )

  if (
    !result.valid ||
    !result.data
  ) {
    return res.status(400).json({
      success: false,
      message: 'Invalid show input',
      errors: result.errors,
    })
  }

  try {
    const organiserId =
      req.user!.userId

    const show =
      await showService.updateShow(
        req.params.showId as string,
        organiserId,
        result.data
      )

    return res.status(200).json({
      success: true,
      message: 'Show updated successfully',
      data: show,
    })
  } catch (err) {
    return handleAppError(
      err,
      res,
      next
    )
  }
}

export async function deleteShow(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const organiserId =
      req.user!.userId

    await showService.deleteShow(
      req.params.showId as string,
      organiserId
    )

    return res.status(200).json({
      success: true,
      message: 'Show deleted successfully',
    })
  } catch (err) {
    return handleAppError(
      err,
      res,
      next
    )
  }
}

/*
 * ============================================================
 * SHOW PRICE CRUD
 * ============================================================
 */

export async function createShowPrice(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const result =
    validateShowPriceInput(
      req.body ?? {}
    )

  if (
    !result.valid ||
    !result.data
  ) {
    return res.status(400).json({
      success: false,
      message: 'Invalid show price input',
      errors: result.errors,
    })
  }

  try {
    const organiserId =
      req.user!.userId

    const price =
      await showService.createShowPrice(
        req.params.showId as string,
        organiserId,
        result.data
      )

    return res.status(201).json({
      success: true,
      message: 'Show price created successfully',
      data: price,
    })
  } catch (err) {
    return handleAppError(
      err,
      res,
      next
    )
  }
}

export async function listShowPrices(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const organiserId =
      req.user!.userId

    const prices =
      await showService.listShowPrices(
        req.params.showId as string,
        organiserId
      )

    return res.status(200).json({
      success: true,
      message: 'Show prices retrieved successfully',
      data: prices,
    })
  } catch (err) {
    return handleAppError(
      err,
      res,
      next
    )
  }
}

export async function updateShowPrice(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const result =
    validateShowPriceUpdateInput(
      req.body ?? {}
    )

  if (
    !result.valid ||
    !result.data
  ) {
    return res.status(400).json({
      success: false,
      message: 'Invalid show price input',
      errors: result.errors,
    })
  }

  try {
    const organiserId =
      req.user!.userId

    const price =
      await showService.updateShowPrice(
        req.params.showId as string,
        req.params.priceId as string,
        organiserId,
        result.data
      )

    return res.status(200).json({
      success: true,
      message: 'Show price updated successfully',
      data: price,
    })
  } catch (err) {
    return handleAppError(
      err,
      res,
      next
    )
  }
}

export async function deleteShowPrice(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const organiserId =
      req.user!.userId

    await showService.deleteShowPrice(
      req.params.showId as string,
      req.params.priceId as string,
      organiserId
    )

    return res.status(200).json({
      success: true,
      message: 'Show price deleted successfully',
    })
  } catch (err) {
    return handleAppError(
      err,
      res,
      next
    )
  }
}