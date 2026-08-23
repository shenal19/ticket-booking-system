import crypto from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../utils/AppError'
import { env } from '../config/env'
import { promoteWaitlistIfPossible } from './waitlist.service'

/**
 * The client type Prisma passes into an interactive `$transaction`
 * callback — PrismaClient minus the top-level methods that aren't
 * usable mid-transaction ($connect/$disconnect/$transaction/etc).
 * `prisma.show` / `prisma.showSeat` structurally satisfy this too,
 * so the same type works for both the plain client (Phase 7 GET)
 * and a transaction's `tx` (Phase 8 hold/release).
 */
type TransactionClient = Prisma.TransactionClient

/**
 * Customer-facing view of a single ShowSeat: the per-show snapshot
 * (status) joined with the underlying Seat's physical layout fields
 * (rowLabel/seatNumber/category), which don't change per show.
 */
export interface ShowSeatView {
  showSeatId: string
  seatId: string
  rowLabel: string
  seatNumber: number
  category: string
  status: string
}

/**
 * Response shape for a successful hold: same as ShowSeatView, plus
 * the hold's expiry and the token issued for this hold. The token
 * is returned to the client as a receipt/reference only — it is
 * never accepted back as an authorization credential (see
 * holdSeats/releaseHoldSeats: ownership is always re-derived from
 * heldBy === the authenticated customer's JWT userId).
 */
export interface HeldShowSeatView extends ShowSeatView {
  holdToken: string
  holdExpiresAt: Date
}

type PrismaOrTx = TransactionClient

/**
 * Any ShowSeat still marked HELD whose holdExpiresAt has passed is
 * stale: its hold is over, but the row hasn't been written back to
 * AVAILABLE yet because nothing has "encountered" it since. This
 * flips every such row for the given show back to a clean
 * AVAILABLE state (status/heldBy/holdToken/holdExpiresAt all reset)
 * — Phase 8 requirement 10 ("expired HELD seats should become
 * AVAILABLE when encountered").
 *
 * Called at the start of every show-seat read/write path in this
 * file (including the Phase 7 GET, which now wraps its call in its
 * own transaction — see getShowSeatsForShow), so callers always see
 * accurate, current state rather than a stale HELD status.
 *
 * (Phase 10 addition: an expiring HELD seat may be the seat behind
 * a PENDING WaitlistOffer — if the customer it was offered to never
 * booked it in time, that offer is expired too, and the newly-freed
 * seat is immediately offered to the next customer waiting in that
 * category's queue. This is why this function now always requires
 * a transaction client: sweeping seats, expiring offers, and
 * promoting the next customer need to happen as one atomic unit,
 * not as separate unguarded writes.)
 */
async function expireStaleHolds(client: PrismaOrTx, showId: string): Promise<void> {
  const expiring = await client.showSeat.findMany({
    where: {
      showId,
      status: 'HELD',
      holdExpiresAt: { lt: new Date() },
    },
    include: { seat: true },
  })

  if (expiring.length === 0) return

  const expiringIds = expiring.map((s: (typeof expiring)[number]) => s.id)

  await client.showSeat.updateMany({
    where: { id: { in: expiringIds } },
    data: {
      status: 'AVAILABLE',
      heldBy: null,
      holdToken: null,
      holdExpiresAt: null,
    },
  })

  // A seat that just expired may have had a PENDING waitlist offer
  // riding on it (the customer it was offered to didn't book in
  // time) — that offer, and the waitlist entry it belonged to, are
  // now stale too. The customer must rejoin the waitlist if they
  // still want a seat; see waitlist.service.ts's report for why
  // entries aren't silently re-queued.
  const expiredOffers = await client.waitlistOffer.findMany({
    where: { showSeatId: { in: expiringIds }, status: 'PENDING' },
  })

  if (expiredOffers.length > 0) {
    await client.waitlistOffer.updateMany({
      where: { id: { in: expiredOffers.map((o: (typeof expiredOffers)[number]) => o.id) } },
      data: { status: 'EXPIRED' },
    })
    await client.waitlistEntry.updateMany({
      where: {
        id: { in: expiredOffers.map((o: (typeof expiredOffers)[number]) => o.waitlistEntryId) },
        status: 'OFFERED',
      },
      data: { status: 'EXPIRED' },
    })
  }

  const freedCategories = [
    ...new Set(expiring.map((s: (typeof expiring)[number]) => s.seat.category)),
  ]
  for (const category of freedCategories) {
    await promoteWaitlistIfPossible(client, showId, category)
  }
}

function toShowSeatView(showSeat: {
  id: string
  seatId: string
  status: string
  seat: { rowLabel: string; seatNumber: number; category: string }
}): ShowSeatView {
  return {
    showSeatId: showSeat.id,
    seatId: showSeat.seatId,
    rowLabel: showSeat.seat.rowLabel,
    seatNumber: showSeat.seat.seatNumber,
    category: showSeat.seat.category,
    status: showSeat.status,
  }
}

/**
 * Return every ShowSeat for a given show, in the shape customers
 * need to render a seat map: physical seat layout (rowLabel,
 * seatNumber, category) plus this show's current status for that
 * seat (AVAILABLE/HELD/BOOKED).
 *
 * Any authenticated CUSTOMER may view any show's seats — unlike
 * organiser-owned resources (Venue/Event/Show), there is no
 * ownership restriction here, since this is public booking-facing
 * data. Only existence of the show is checked; a non-existent show
 * yields a generic 404.
 *
 * (Phase 8 addition: expired holds are swept before reading, so the
 * status returned is always accurate. The endpoint's route,
 * controller, and response shape are unchanged from Phase 7.)
 */
export async function getShowSeatsForShow(showId: string): Promise<ShowSeatView[]> {
  const show = await prisma.show.findUnique({ where: { id: showId } })

  if (!show) {
    throw new AppError('Show not found', 404)
  }

  await prisma.$transaction(async (tx: TransactionClient) => {
    await expireStaleHolds(tx, showId)
  })

  const showSeats = await prisma.showSeat.findMany({
    where: { showId },
    include: { seat: true },
  })

  return showSeats.map(toShowSeatView)
}

/**
 * Hold one or more seats for a show on behalf of the authenticated
 * customer. Atomic: either every requested seat ends up HELD by
 * this customer, or none of them do.
 *
 * Concurrency: the actual seat-claiming write is a single
 * conditional `updateMany` — `WHERE id IN (...) AND (status =
 * AVAILABLE OR (status = HELD AND holdExpiresAt < now))`. Postgres
 * evaluates and applies that WHERE clause row-by-row under
 * row-level locking as part of one UPDATE statement, so if two
 * requests race for the same seat, the first to commit changes the
 * row's status to HELD; the second's WHERE clause then simply no
 * longer matches that row (it's no longer AVAILABLE/expired), so
 * its updateMany affects one fewer row than requested. Comparing
 * the affected-row count to the requested count is how the race is
 * detected — if they don't match, the whole transaction throws and
 * Prisma rolls back everything, so no seat is ever left
 * partially/incorrectly held.
 */
export async function holdSeats(
  showId: string,
  showSeatIds: string[],
  customerId: string
): Promise<HeldShowSeatView[]> {
  const show = await prisma.show.findUnique({ where: { id: showId } })
  if (!show) {
    throw new AppError('Show not found', 404)
  }

  const holdToken = crypto.randomBytes(32).toString('hex')
  const now = new Date()
  const holdExpiresAt = new Date(now.getTime() + env.seatHoldDurationMinutes * 60 * 1000)

  return prisma.$transaction(async (tx: TransactionClient) => {
    await expireStaleHolds(tx, showId)

    const existing = await tx.showSeat.findMany({
      where: { id: { in: showSeatIds }, showId },
    })

    if (existing.length !== showSeatIds.length) {
      throw new AppError('One or more seats were not found for this show', 404)
    }

    const unavailable = existing.filter(
      (s: { status: string }) => s.status !== 'AVAILABLE'
    )
    if (unavailable.length > 0) {
      throw new AppError(
        'One or more requested seats are no longer available',
        409
      )
    }

    const result = await tx.showSeat.updateMany({
      where: {
        id: { in: showSeatIds },
        showId,
        status: 'AVAILABLE',
      },
      data: {
        status: 'HELD',
        heldBy: customerId,
        holdToken,
        holdExpiresAt,
      },
    })

    if (result.count !== showSeatIds.length) {
      // Lost a race against another concurrent hold between the
      // read above and this write — fail the whole operation rather
      // than leave a partial hold in place.
      throw new AppError(
        'One or more requested seats were just taken by another customer — please try again',
        409
      )
    }

    const held = await tx.showSeat.findMany({
      where: { id: { in: showSeatIds } },
      include: { seat: true },
    })

    return held.map((showSeat: (typeof held)[number]) => ({
      ...toShowSeatView(showSeat),
      holdToken: showSeat.holdToken as string,
      holdExpiresAt: showSeat.holdExpiresAt as Date,
    }))
  })
}

/**
 * Release (cancel) the authenticated customer's own hold on one or
 * more seats for a show. Atomic, same pattern as holdSeats: a
 * conditional updateMany scoped to `heldBy = customerId` is the
 * only way a seat is released, so a customer can never release —
 * or otherwise manipulate — another customer's hold. The client's
 * holdToken (if it has one) is never accepted as authorization; the
 * authenticated JWT identity is the only thing that grants control
 * over a held seat, exactly like organiserId elsewhere in this
 * codebase is always derived from the JWT rather than the request.
 */
export async function releaseHoldSeats(
  showId: string,
  showSeatIds: string[],
  customerId: string
): Promise<ShowSeatView[]> {
  const show = await prisma.show.findUnique({ where: { id: showId } })
  if (!show) {
    throw new AppError('Show not found', 404)
  }

  return prisma.$transaction(async (tx: TransactionClient) => {
    await expireStaleHolds(tx, showId)

    const existing = await tx.showSeat.findMany({
      where: { id: { in: showSeatIds }, showId },
    })

    if (existing.length !== showSeatIds.length) {
      throw new AppError('One or more seats were not found for this show', 404)
    }

    const result = await tx.showSeat.updateMany({
      where: {
        id: { in: showSeatIds },
        showId,
        status: 'HELD',
        heldBy: customerId,
      },
      data: {
        status: 'AVAILABLE',
        heldBy: null,
        holdToken: null,
        holdExpiresAt: null,
      },
    })

    if (result.count !== showSeatIds.length) {
      throw new AppError(
        'One or more requested seats are not currently held by you',
        409
      )
    }

    const released = await tx.showSeat.findMany({
      where: { id: { in: showSeatIds } },
      include: { seat: true },
    })

    // Phase 10: seats just freed up — give the next customer in
    // each affected category's waitlist queue a chance at one.
    const freedCategories = [
      ...new Set(released.map((s: (typeof released)[number]) => s.seat.category)),
    ]
    for (const category of freedCategories) {
      await promoteWaitlistIfPossible(tx, showId, category)
    }

    return released.map(toShowSeatView)
  })
}
