import dotenv from 'dotenv'

dotenv.config()

/**
 * Centralized environment variable access.
 *
 * Phase 1 only reads what the server actually needs to boot
 * (PORT, FRONTEND_URL). DATABASE_URL and JWT_SECRET are validated
 * here as placeholders for later phases but are not required yet.
 */
export const env = {
  port: process.env.PORT ? Number(process.env.PORT) : 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  nodeEnv: process.env.NODE_ENV || 'development',
  // Phase 8: how long a seat hold lasts before it's treated as
  // expired. Defaults to 10 minutes if not configured.
  seatHoldDurationMinutes: process.env.SEAT_HOLD_DURATION_MINUTES
    ? Number(process.env.SEAT_HOLD_DURATION_MINUTES)
    : 10,
  // Phase 10: how long a waitlist offer (a seat automatically held
  // for the next customer in a category's queue) lasts before it's
  // treated as expired and the seat is freed again.
  waitlistOfferDurationMinutes: process.env.WAITLIST_OFFER_DURATION_MINUTES
    ? Number(process.env.WAITLIST_OFFER_DURATION_MINUTES)
    : 15,
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || 'Ticket Booking System <no-reply@ticketbooking.com>',
  },
}

