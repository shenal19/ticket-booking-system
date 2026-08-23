/**
 * A known, safe-to-expose application error.
 *
 * Services throw this for expected failure cases (validation,
 * duplicate email, forbidden role, etc.) with a specific HTTP status
 * and a client-safe message. Anything that isn't an AppError is
 * treated as unexpected and handled generically (500, no details
 * leaked) by the centralized error handler.
 */
export class AppError extends Error {
  public readonly statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
  }
}
