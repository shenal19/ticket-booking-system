import { prisma } from '../lib/prisma'
import { AppError } from '../utils/AppError'
import { SeatInput, SeatUpdateInput } from '../utils/validators'
import { getVenueForOrganiser } from './venue.service'

export interface SeatRecord {
  id: string
  venueId: string
  rowLabel: string
  seatNumber: number
  category: string
  createdAt: Date
  updatedAt: Date
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'P2002'
  )
}

function isForeignKeyConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'P2003'
  )
}

/**
 * Create a seat for a venue. Only the venue's owning organiser may
 * do this — ownership is verified first (404 if not owned/found),
 * so venueId from the URL can't be used to write into someone
 * else's venue.
 */
export async function createSeat(
  venueId: string,
  organiserId: string,
  input: SeatInput
): Promise<SeatRecord> {
  await getVenueForOrganiser(venueId, organiserId)

  try {
    return await prisma.seat.create({
      data: {
        venueId,
        rowLabel: input.rowLabel,
        seatNumber: input.seatNumber,
        category: input.category,
      },
    })
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new AppError(
        'A seat with this row and number already exists in this venue',
        409
      )
    }
    throw new AppError('Unable to create seat', 500)
  }
}

/**
 * List seats for a venue — only accessible to the venue's owner.
 */
export async function listSeatsForVenue(
  venueId: string,
  organiserId: string
): Promise<SeatRecord[]> {
  await getVenueForOrganiser(venueId, organiserId)
  return prisma.seat.findMany({ where: { venueId } })
}

/**
 * Fetch a single seat, only if it belongs to the specified venue AND
 * the authenticated organiser owns that venue. Any mismatch (wrong
 * venue, wrong owner, or seat doesn't exist) is a uniform 404.
 */
export async function getSeatForVenue(
  venueId: string,
  seatId: string,
  organiserId: string
): Promise<SeatRecord> {
  await getVenueForOrganiser(venueId, organiserId)

  const seat = await prisma.seat.findUnique({ where: { id: seatId } })

  if (!seat || seat.venueId !== venueId) {
    throw new AppError('Seat not found', 404)
  }

  return seat
}

/**
 * Update a seat's row/number/category. venueId is never accepted as
 * an update field — it's fixed by the route/ownership context, so a
 * seat can't be moved to another venue via the request body.
 */
export async function updateSeat(
  venueId: string,
  seatId: string,
  organiserId: string,
  updates: SeatUpdateInput
): Promise<SeatRecord> {
  await getSeatForVenue(venueId, seatId, organiserId)

  try {
    return await prisma.seat.update({
      where: { id: seatId },
      data: updates,
    })
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new AppError(
        'A seat with this row and number already exists in this venue',
        409
      )
    }
    throw new AppError('Unable to update seat', 500)
  }
}

/**
 * Delete a seat, but only if it's safe — i.e. no ShowSeat records
 * still reference it. Seat holds/booking logic doesn't exist yet
 * (later phases), but the FK relationship already does, so this
 * guards against orphaning any future ShowSeat rows.
 */
export async function deleteSeat(
  venueId: string,
  seatId: string,
  organiserId: string
): Promise<void> {
  await getSeatForVenue(venueId, seatId, organiserId)

  const showSeatCount = await prisma.showSeat.count({ where: { seatId } })
  if (showSeatCount > 0) {
    throw new AppError(
      'Cannot delete seat: it is still referenced by one or more shows',
      409
    )
  }

  try {
    await prisma.seat.delete({ where: { id: seatId } })
  } catch (err) {
    if (isForeignKeyConstraintError(err)) {
      throw new AppError('Cannot delete seat: dependent records exist', 409)
    }
    throw new AppError('Unable to delete seat', 500)
  }
}
