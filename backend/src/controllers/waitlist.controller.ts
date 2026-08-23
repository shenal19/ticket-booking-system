import { Request, Response, NextFunction } from 'express'
import { validateWaitlistJoinInput } from '../utils/validators'
import * as waitlistService from '../services/waitlist.service'
import { AppError } from '../utils/AppError'

function handleAppError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, message: err.message })
  }
  return next(err)
}

/**
 * Join a show's category waitlist (Phase 10). userId always comes
 * from req.user.userId — never the request body.
 */
export async function joinWaitlist(req: Request, res: Response, next: NextFunction) {
  const result = validateWaitlistJoinInput(req.body ?? {})

  if (!result.valid || !result.data) {
    return res.status(400).json({
      success: false,
      message: 'Invalid waitlist request',
      errors: result.errors,
    })
  }

  try {
    const userId = req.user!.userId
    const entry = await waitlistService.joinWaitlist(userId, result.data)

    return res.status(201).json({
      success: true,
      message: 'Joined waitlist successfully',
      data: entry,
    })
  } catch (err) {
    return handleAppError(err, res, next)
  }
}

/**
 * List the authenticated customer's own waitlist entries.
 */
export async function listMyWaitlistEntries(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId
    const entries = await waitlistService.listMyWaitlistEntries(userId)

    return res.status(200).json({
      success: true,
      message: 'Waitlist entries retrieved successfully',
      data: entries,
    })
  } catch (err) {
    return handleAppError(err, res, next)
  }
}

/**
 * Cancel the authenticated customer's own waitlist entry.
 */
export async function cancelWaitlistEntry(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId
    const entry = await waitlistService.cancelWaitlistEntry(
      userId,
      req.params.waitlistEntryId as string
    )

    return res.status(200).json({
      success: true,
      message: 'Waitlist entry cancelled successfully',
      data: entry,
    })
  } catch (err) {
    return handleAppError(err, res, next)
  }
}
