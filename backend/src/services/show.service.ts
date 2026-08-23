import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../utils/AppError'
import {
  ShowInput,
  ShowUpdateInput,
  ShowPriceInput,
  ShowPriceUpdateInput,
} from '../utils/validators'
import { getEventForOrganiser } from './event.service'
import { getVenueForOrganiser } from './venue.service'

type TransactionClient = Prisma.TransactionClient

export interface ShowRecord {
  id: string
  eventId: string
  venueId: string
  startTime: Date
  endTime: Date
  createdAt: Date
  updatedAt: Date
}

export interface ShowPriceRecord {
  id: string
  showId: string
  category: string
  price: unknown
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

/*
 * ============================================================
 * CUSTOMER SHOW DISCOVERY
 * ============================================================
 */

/**
 * List all shows belonging to a particular event.
 *
 * This endpoint is used by customers when browsing an event.
 *
 * IMPORTANT:
 * No organiser ownership check is performed here because
 * customers must be able to discover public events and shows.
 */
export async function listShowsForEvent(
  eventId: string
) {
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
    },
  })

  if (!event) {
    throw new AppError('Event not found', 404)
  }

  return prisma.show.findMany({
    where: {
      eventId,
    },
    include: {
      venue: true,
      showPrices: true,
    },
    orderBy: {
      startTime: 'asc',
    },
  })
}

/**
 * Get a single show for customer discovery.
 *
 * Unlike getShowForOrganiser(), this does not check organiser
 * ownership.
 */
export async function getShow(
  showId: string
) {
  const show = await prisma.show.findUnique({
    where: {
      id: showId,
    },
    include: {
      venue: true,
      showPrices: true,
    },
  })

  if (!show) {
    throw new AppError('Show not found', 404)
  }

  return show
}

/*
 * ============================================================
 * ORGANISER SHOW OWNERSHIP
 * ============================================================
 */

/**
 * Fetch a show only if it belongs to the authenticated organiser.
 *
 * Ownership is derived through:
 *
 * Show → Event → organiserId
 */
export async function getShowForOrganiser(
  showId: string,
  organiserId: string
): Promise<ShowRecord> {
  const show = await prisma.show.findUnique({
    where: {
      id: showId,
    },
    include: {
      event: {
        select: {
          organiserId: true,
        },
      },
    },
  })

  if (!show || show.event.organiserId !== organiserId) {
    throw new AppError('Show not found', 404)
  }

  const { event: _event, ...showFields } = show

  return showFields
}

/*
 * ============================================================
 * SHOW OVERLAP VALIDATION
 * ============================================================
 */

async function assertNoOverlap(
  tx: TransactionClient,
  venueId: string,
  startTime: Date,
  endTime: Date,
  excludeShowId?: string
): Promise<void> {
  const overlapping = await tx.show.findFirst({
    where: {
      venueId,
      id: excludeShowId
        ? {
            not: excludeShowId,
          }
        : undefined,
      startTime: {
        lt: endTime,
      },
      endTime: {
        gt: startTime,
      },
    },
  })

  if (overlapping) {
    throw new AppError(
      'This venue already has a show scheduled during that time range',
      409
    )
  }
}

/*
 * ============================================================
 * ORGANISER SHOW CRUD
 * ============================================================
 */

/**
 * Create a show for the organiser's own event and venue.
 *
 * Also creates one ShowSeat snapshot for every venue seat.
 */
export async function createShow(
  input: ShowInput,
  organiserId: string
): Promise<ShowRecord> {
  await getEventForOrganiser(
    input.eventId,
    organiserId
  )

  await getVenueForOrganiser(
    input.venueId,
    organiserId
  )

  return prisma.$transaction(
    async (tx: TransactionClient) => {
      await assertNoOverlap(
        tx,
        input.venueId,
        input.startTime,
        input.endTime
      )

      const show = await tx.show.create({
        data: {
          eventId: input.eventId,
          venueId: input.venueId,
          startTime: input.startTime,
          endTime: input.endTime,
        },
      })

      const venueSeats = await tx.seat.findMany({
        where: {
          venueId: input.venueId,
        },
      })

      if (venueSeats.length > 0) {
        await tx.showSeat.createMany({
          data: venueSeats.map(
            (seat: { id: string }) => ({
              showId: show.id,
              seatId: seat.id,
            })
          ),
          skipDuplicates: true,
        })
      }

      return show
    }
  )
}

/**
 * List shows owned by the authenticated organiser.
 */
export async function listShows(
  organiserId: string
): Promise<ShowRecord[]> {
  return prisma.show.findMany({
    where: {
      event: {
        organiserId,
      },
    },
    orderBy: {
      startTime: 'asc',
    },
  })
}

/**
 * Update a show.
 */
export async function updateShow(
  showId: string,
  organiserId: string,
  updates: ShowUpdateInput
): Promise<ShowRecord> {
  const current = await getShowForOrganiser(
    showId,
    organiserId
  )

  if (
    updates.venueId !== undefined &&
    updates.venueId !== current.venueId
  ) {
    throw new AppError(
      "Changing a show's venue after its seat data has been generated is not supported",
      409
    )
  }

  if (updates.eventId !== undefined) {
    await getEventForOrganiser(
      updates.eventId,
      organiserId
    )
  }

  const nextStartTime =
    updates.startTime ?? current.startTime

  const nextEndTime =
    updates.endTime ?? current.endTime

  if (
    nextStartTime.getTime() >=
    nextEndTime.getTime()
  ) {
    throw new AppError(
      'startTime must be before endTime',
      400
    )
  }

  return prisma.$transaction(
    async (tx: TransactionClient) => {
      await assertNoOverlap(
        tx,
        current.venueId,
        nextStartTime,
        nextEndTime,
        showId
      )

      return tx.show.update({
        where: {
          id: showId,
        },
        data: {
          eventId: updates.eventId,
          startTime: updates.startTime,
          endTime: updates.endTime,
        },
      })
    }
  )
}

/**
 * Delete a show.
 */
export async function deleteShow(
  showId: string,
  organiserId: string
): Promise<void> {
  await getShowForOrganiser(
    showId,
    organiserId
  )

  const [
    bookingCount,
    waitlistCount,
  ] = await Promise.all([
    prisma.booking.count({
      where: {
        showId,
      },
    }),

    prisma.waitlistEntry.count({
      where: {
        showId,
      },
    }),
  ])

  if (
    bookingCount > 0 ||
    waitlistCount > 0
  ) {
    throw new AppError(
      'Cannot delete show: it has bookings or waitlist entries associated with it',
      409
    )
  }

  try {
    await prisma.$transaction([
      prisma.showPrice.deleteMany({
        where: {
          showId,
        },
      }),

      prisma.showSeat.deleteMany({
        where: {
          showId,
        },
      }),

      prisma.show.delete({
        where: {
          id: showId,
        },
      }),
    ])
  } catch (err) {
    if (isForeignKeyConstraintError(err)) {
      throw new AppError(
        'Cannot delete show: dependent records exist',
        409
      )
    }

    throw new AppError(
      'Unable to delete show',
      500
    )
  }
}

/*
 * ============================================================
 * SHOW PRICE MANAGEMENT
 * ============================================================
 */

export async function createShowPrice(
  showId: string,
  organiserId: string,
  input: ShowPriceInput
): Promise<ShowPriceRecord> {
  await getShowForOrganiser(
    showId,
    organiserId
  )

  try {
    return await prisma.showPrice.create({
      data: {
        showId,
        category: input.category,
        price: input.price,
      },
    })
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new AppError(
        'A price for this category already exists for this show',
        409
      )
    }

    throw new AppError(
      'Unable to create show price',
      500
    )
  }
}

export async function listShowPrices(
  showId: string,
  organiserId: string
): Promise<ShowPriceRecord[]> {
  await getShowForOrganiser(
    showId,
    organiserId
  )

  return prisma.showPrice.findMany({
    where: {
      showId,
    },
  })
}

export async function getShowPriceForOrganiser(
  showId: string,
  priceId: string,
  organiserId: string
): Promise<ShowPriceRecord> {
  await getShowForOrganiser(
    showId,
    organiserId
  )

  const price = await prisma.showPrice.findUnique({
    where: {
      id: priceId,
    },
  })

  if (
    !price ||
    price.showId !== showId
  ) {
    throw new AppError(
      'Show price not found',
      404
    )
  }

  return price
}

export async function updateShowPrice(
  showId: string,
  priceId: string,
  organiserId: string,
  updates: ShowPriceUpdateInput
): Promise<ShowPriceRecord> {
  await getShowPriceForOrganiser(
    showId,
    priceId,
    organiserId
  )

  try {
    return await prisma.showPrice.update({
      where: {
        id: priceId,
      },
      data: updates,
    })
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new AppError(
        'A price for this category already exists for this show',
        409
      )
    }

    throw new AppError(
      'Unable to update show price',
      500
    )
  }
}

export async function deleteShowPrice(
  showId: string,
  priceId: string,
  organiserId: string
): Promise<void> {
  await getShowPriceForOrganiser(
    showId,
    priceId,
    organiserId
  )

  await prisma.showPrice.delete({
    where: {
      id: priceId,
    },
  })
}