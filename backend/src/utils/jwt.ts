import jwt, { SignOptions } from 'jsonwebtoken'
import { getAuthConfig } from '../config/auth'

/**
 * JWT utility foundation (Phase 3A).
 *
 * Ready for login/protected-route middleware to use in a later phase.
 * No middleware or routes call these yet.
 *
 * The secret is never logged, and generateToken/verifyToken never
 * expose the secret through their return values.
 */

export interface AuthTokenPayload {
  userId: string
  role: string
}

/**
 * Sign a JWT for the given payload (minimally: userId + role).
 * Throws if JWT_SECRET is not configured (see getAuthConfig).
 */
export function generateToken(payload: AuthTokenPayload): string {
  const { jwtSecret, jwtExpiresIn } = getAuthConfig()

  const options: SignOptions = {
    expiresIn: jwtExpiresIn as SignOptions['expiresIn'],
  }

  return jwt.sign(payload, jwtSecret, options)
}

/**
 * Verify a JWT and return its decoded payload.
 * Throws if the token is invalid/expired, or if JWT_SECRET is not
 * configured.
 */
export function verifyToken(token: string): AuthTokenPayload {
  const { jwtSecret } = getAuthConfig()

  return jwt.verify(token, jwtSecret) as AuthTokenPayload
}
