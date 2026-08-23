/**
 * Extends Express's Request type with the authenticated user info
 * attached by auth.middleware.ts. Kept as a standalone declaration
 * file (not a route/controller) since it only augments a type.
 */
export interface AuthenticatedUser {
  userId: string
  role: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
    }
  }
}

export {}
