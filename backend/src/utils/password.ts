import bcrypt from 'bcryptjs'

/**
 * Password hashing utility foundation (Phase 3A).
 *
 * These functions are ready for registration/login to use in a later
 * phase. No routes call them yet.
 *
 * - Passwords are never stored or logged in plaintext.
 * - Hashing/comparison use bcryptjs's asynchronous API only.
 * - Callers are responsible for never including the raw password or
 *   the resulting hash in API responses or log output.
 */

const SALT_ROUNDS = 10

/**
 * Hash a plaintext password for storage.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Compare a plaintext password against a stored hash.
 * Returns true if they match, false otherwise.
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}
