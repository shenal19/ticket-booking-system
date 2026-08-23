import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'

/**
 * Authentication middleware (Phase 3C).
 *
 * Expects: Authorization: Bearer <token>
 *
 * On success, attaches { userId, role } to req.user for downstream
 * handlers/middleware (see role.middleware.ts). On any failure
 * (missing header, malformed header, invalid/expired token, or an
 * unconfigured JWT_SECRET), responds 401 with a generic message —
 * never the underlying verification error or the secret.
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    })
  }

  const [scheme, token] = authHeader.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    })
  }

  try {
    const payload = verifyToken(token)
    req.user = { userId: payload.userId, role: payload.role }
    return next()
  } catch {
    // Covers invalid signature, expired token, malformed token, and
    // a missing JWT_SECRET (getAuthConfig throwing) — all surface
    // the same generic 401, with no internal detail leaked.
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    })
  }
}
