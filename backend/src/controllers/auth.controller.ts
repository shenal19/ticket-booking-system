import { Request, Response, NextFunction } from 'express'
import { validateRegisterInput, validateLoginInput } from '../utils/validators'
import { registerUser, loginUser } from '../services/auth.service'
import { AppError } from '../utils/AppError'

/**
 * POST /api/auth/register
 *
 * Thin HTTP layer: validate the request shape, delegate the actual
 * registration work to the service, and map known errors to the
 * right status code. No JWT is issued here — registration only.
 */
export async function register(req: Request, res: Response, next: NextFunction) {
  const result = validateRegisterInput(req.body ?? {})

  if (!result.valid || !result.data) {
    return res.status(400).json({
      success: false,
      message: 'Invalid registration input',
      errors: result.errors,
    })
  }

  try {
    const user = await registerUser(result.data)

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user,
    })
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      })
    }

    // Unexpected error — let the centralized error handler deal
    // with logging and the generic 500 response.
    return next(err)
  }
}

/**
 * POST /api/auth/login
 *
 * Thin HTTP layer, same pattern as register: validate shape here,
 * delegate the actual authentication (lookup + password compare +
 * token issuance) to the service.
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  const result = validateLoginInput(req.body ?? {})

  if (!result.valid || !result.data) {
    return res.status(400).json({
      success: false,
      message: 'Invalid login input',
      errors: result.errors,
    })
  }

  try {
    const { token, user } = await loginUser(result.data)

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { token, user },
    })
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      })
    }

    return next(err)
  }
}

/**
 * GET /api/auth/me
 *
 * Protected by the `authenticate` middleware, which populates
 * req.user before this handler runs. Returns only the safe,
 * token-derived identity — never touches passwordHash.
 */
export function me(req: Request, res: Response) {
  return res.status(200).json({
    success: true,
    data: {
      userId: req.user?.userId,
      role: req.user?.role,
    },
  })
}

/**
 * Phase 3C test endpoints only — these exist purely to prove the
 * authentication + role middleware work end-to-end. They carry no
 * business logic and are not part of the application's real API
 * surface; later phases will replace/remove them once real
 * role-protected routes (events, bookings, etc.) exist.
 */
export function customerTest(_req: Request, res: Response) {
  return res.status(200).json({
    success: true,
    message: 'CUSTOMER role verified',
  })
}

export function organiserTest(_req: Request, res: Response) {
  return res.status(200).json({
    success: true,
    message: 'ORGANISER role verified',
  })
}

export function adminTest(_req: Request, res: Response) {
  return res.status(200).json({
    success: true,
    message: 'ADMIN role verified',
  })
}
