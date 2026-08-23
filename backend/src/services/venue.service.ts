import { prisma } from '../lib/prisma'
import { AppError } from '../utils/AppError'
import { VenueInput, VenueUpdateInput } from '../utils/validators'

export interface VenueRecord {
  id: string
  name: string
  address: string
  organiserId: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Structural check for a Prisma "foreign key constraint failed"
 * error (P2003) — used when deletion is blocked by dependent rows
 * (e.g. Shows or Seats still referencing this venue).
 */
function isForeignKeyConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'P2003'
  )
}

/**
 * Create a venue owned by the authenticated organiser.
 * organiserId always comes from the authenticated JWT — never the
 * request body — so ownership can't be spoofed.
 */
export async function createVenue(
  input: VenueInput,
  organiserId: string
): Promise<VenueRecord> {
  return prisma.venue.create({
    data: {
      name: input.name,
      address: input.address,
      organiserId,
    },
  })
}

/**
 * List venues owned by the authenticated organiser only.
 */
export async function listVenues(organiserId: string): Promise<VenueRecord[]> {
  return prisma.venue.findMany({ where: { organiserId } })
}

/**
 * Fetch a single venue, but only if it belongs to the authenticated
 * organiser. A venue that exists but belongs to someone else is
 * treated identically to a venue that doesn't exist (404) — this
 * avoids leaking whether a given venue ID belongs to another
 * organiser.
 */
export async function getVenueForOrganiser(
  venueId: string,
  organiserId: string
): Promise<VenueRecord> {
  const venue = await prisma.venue.findUnique({ where: { id: venueId } })

  if (!venue || venue.organiserId !== organiserId) {
    throw new AppError('Venue not found', 404)
  }

  return venue
}

/**
 * Update a venue's name/address. Ownership can never be reassigned
 * through this — organiserId is not an updatable field here at all.
 */
export async function updateVenue(
  venueId: string,
  organiserId: string,
  updates: VenueUpdateInput
): Promise<VenueRecord> {
  // Confirms ownership (throws 404 if missing/not owned) before
  // allowing the update.
  await getVenueForOrganiser(venueId, organiserId)

  return prisma.venue.update({
    where: { id: venueId },
    data: updates,
  })
}

/**
 * Delete a venue, but only if it's safe to do so — i.e. no Shows or
 * Seats still reference it. Checked up front for a clean error
 * message, and also guarded against the underlying FK constraint as
 * a fallback for any race condition.
 */
export async function deleteVenue(venueId: string, organiserId: string): Promise<void> {
  await getVenueForOrganiser(venueId, organiserId)

  const [seatCount, showCount] = await Promise.all([
    prisma.seat.count({ where: { venueId } }),
    prisma.show.count({ where: { venueId } }),
  ])

  if (seatCount > 0 || showCount > 0) {
    throw new AppError(
      'Cannot delete venue: it still has seats or shows associated with it',
      409
    )
  }

  try {
    await prisma.venue.delete({ where: { id: venueId } })
  } catch (err) {
    if (isForeignKeyConstraintError(err)) {
      throw new AppError(
        'Cannot delete venue: dependent records exist',
        409
      )
    }
    throw new AppError('Unable to delete venue', 500)
  }
}
