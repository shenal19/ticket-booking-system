import { Request, Response, NextFunction } from 'express'

/**
 * Role authorization middleware (Phase 3C).
 *
 * Must run AFTER authenticate() — it only checks req.user.role,
 * it never verifies the token itself. If req.user or req.user.role
 * is missing (e.g. this middleware was wired in without
 * authenticate() running first), access is denied rather than
 * silently allowed.
 *
 * Usage:
 *   router.get('/customer-test', authenticate, requireRole('CUSTOMER'), handler)
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role

    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      })
    }

    return next()
  }
}
