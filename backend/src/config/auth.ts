import { env } from './env'

/**
 * Authentication configuration foundation (Phase 3A).
 *
 * This module centralizes JWT-related configuration for later phases
 * (registration, login, JWT middleware, RBAC). No routes or middleware
 * consume this yet.
 *
 * Deliberately NOT validated at import time — the server must still
 * boot and serve /api/health even before JWT_SECRET is configured.
 * Validation happens lazily, only when getAuthConfig() is actually
 * called by code that needs to sign or verify a token (e.g. the JWT
 * utility in a later phase). This keeps the app boot-safe today while
 * still failing loudly the moment authentication is actually used
 * without a secret configured.
 */

export interface AuthConfig {
  jwtSecret: string
  jwtExpiresIn: string
}

export function getAuthConfig(): AuthConfig {
  if (!env.jwtSecret) {
    throw new Error(
      'JWT_SECRET is not configured. Set JWT_SECRET in your .env file before using authentication.'
    )
  }

  return {
    jwtSecret: env.jwtSecret,
    jwtExpiresIn: env.jwtExpiresIn,
  }
}
