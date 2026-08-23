import {
  Request,
  Response,
  NextFunction,
} from 'express'

import {
  validateEventInput,
  validateEventUpdateInput,
} from '../utils/validators'

import * as eventService from '../services/event.service'

import { AppError } from '../utils/AppError'

/**
 * ============================================================
 * CREATE EVENT
 * ============================================================
 *
 * ORGANISER ONLY.
 */
export async function createEvent(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const result = validateEventInput(
    req.body ?? {},
  )

  if (!result.valid || !result.data) {
    return res.status(400).json({
      success: false,
      message: 'Invalid event input',
      errors: result.errors,
    })
  }

  try {
    const organiserId =
      req.user!.userId

    const event =
      await eventService.createEvent(
        result.data,
        organiserId,
      )

    return res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event,
    })
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(
        err.statusCode,
      ).json({
        success: false,
        message: err.message,
      })
    }

    return next(err)
  }
}

/**
 * ============================================================
 * LIST EVENTS
 * ============================================================
 *
 * CUSTOMER + ORGANISER.
 *
 * Returns ALL events for discovery.
 */
export async function listEvents(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const events =
      await eventService.listEvents()

    return res.status(200).json({
      success: true,
      message: 'Events retrieved successfully',
      data: events,
    })
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(
        err.statusCode,
      ).json({
        success: false,
        message: err.message,
      })
    }

    return next(err)
  }
}

/**
 * ============================================================
 * GET EVENT
 * ============================================================
 *
 * CUSTOMER + ORGANISER.
 *
 * Returns a single event for discovery.
 */
export async function getEvent(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const event =
      await eventService.getEvent(
        req.params.eventId as string,
      )

    return res.status(200).json({
      success: true,
      message: 'Event retrieved successfully',
      data: event,
    })
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(
        err.statusCode,
      ).json({
        success: false,
        message: err.message,
      })
    }

    return next(err)
  }
}

/**
 * ============================================================
 * UPDATE EVENT
 * ============================================================
 *
 * ORGANISER ONLY.
 *
 * Ownership is verified inside the service.
 */
export async function updateEvent(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const result =
    validateEventUpdateInput(
      req.body ?? {},
    )

  if (!result.valid || !result.data) {
    return res.status(400).json({
      success: false,
      message: 'Invalid event input',
      errors: result.errors,
    })
  }

  try {
    const organiserId =
      req.user!.userId

    const event =
      await eventService.updateEvent(
        req.params.eventId as string,
        organiserId,
        result.data,
      )

    return res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: event,
    })
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(
        err.statusCode,
      ).json({
        success: false,
        message: err.message,
      })
    }

    return next(err)
  }
}

/**
 * ============================================================
 * DELETE EVENT
 * ============================================================
 *
 * ORGANISER ONLY.
 *
 * Ownership and dependent-show checks are handled
 * inside the service.
 */
export async function deleteEvent(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const organiserId =
      req.user!.userId

    await eventService.deleteEvent(
      req.params.eventId as string,
      organiserId,
    )

    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
    })
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(
        err.statusCode,
      ).json({
        success: false,
        message: err.message,
      })
    }

    return next(err)
  }
}