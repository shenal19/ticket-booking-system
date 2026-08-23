import crypto from 'crypto'
import { Prisma, SeatCategory } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../utils/AppError'
import { env } from '../config/env'
import { WaitlistJoinInput } from '../utils/validators'

/**
 * Same transaction-callback type used throughout this codebase —
 * PrismaClient minus the top-level methods that aren't usable
 * mid-transaction. Do NOT type transaction callbacks as
 * `typeof prisma`.
 */
type TransactionClient = Prisma.TransactionClient

export interface WaitlistOfferView {
  showSeatId: string
  rowLabel: string
  seatNumber: number
  holdToken: string
  expiresAt: Date
  status: string
}

export interface WaitlistEntryView {
  id: string
  showId: string
  category: string
  position: number
  status: string
  createdAt: Date
  offer?: WaitlistOfferView
}

function toEntryView(
  entry: {
    id: string
    showId: string
    category: string
    position: number
    status: string
    createdAt: Date
  },
  offer?: {
    expiresAt: Date
    status: string
    showSeat: {
      id: string
      holdToken: string | null
      seat: {
        rowLabel: string
        seatNumber: number
      }
    }
  }
): WaitlistEntryView {
  return {
    id: entry.id,
    showId: entry.showId,
    category: entry.category,
    position: entry.position,
    status: entry.status,
    createdAt: entry.createdAt,
    offer: offer
      ? {
          showSeatId: offer.showSeat.id,
          rowLabel: offer.showSeat.seat.rowLabel,
          seatNumber: offer.showSeat.seat.seatNumber,
          holdToken: offer.showSeat.holdToken as string,
          expiresAt: offer.expiresAt,
          status: offer.status,
        }
      : undefined,
  }
}

/**
 * Promote the first WAITING customer when a seat becomes available.
 *
 * The category is explicitly typed as Prisma's SeatCategory enum.
 * This is required because Prisma does not accept a generic string
 * for enum fields.
 */
export async function promoteWaitlistIfPossible(
  tx: TransactionClient,
  showId: string,
  category: SeatCategory
): Promise<void> {
  const entry = await tx.waitlistEntry.findFirst({
    where: {
      showId,
      category,
      status: 'WAITING',
    },
    orderBy: {
      position: 'asc',
    },
  })

  if (!entry) {
    return
  }

  const candidateSeat = await tx.showSeat.findFirst({
    where: {
      showId,
      status: 'AVAILABLE',
      seat: {
        category,
      },
    },
  })

  if (!candidateSeat) {
    return
  }

  const holdToken = crypto.randomBytes(32).toString('hex')

  const expiresAt = new Date(
    Date.now() +
      env.waitlistOfferDurationMinutes * 60 * 1000
  )

  /**
   * Atomically claim the available seat for the waitlist customer.
   */
  const claimed = await tx.showSeat.updateMany({
    where: {
      id: candidateSeat.id,
      status: 'AVAILABLE',
    },
    data: {
      status: 'HELD',
      heldBy: entry.userId,
      holdToken,
      holdExpiresAt: expiresAt,
    },
  })

  /**
   * Another transaction may have claimed the seat between
   * findFirst() and updateMany(). In that case, simply stop.
   */
  if (claimed.count !== 1) {
    return
  }

  await tx.waitlistOffer.create({
    data: {
      waitlistEntryId: entry.id,
      showSeatId: candidateSeat.id,
      expiresAt,
      status: 'PENDING',
    },
  })

  await tx.waitlistEntry.update({
    where: {
      id: entry.id,
    },
    data: {
      status: 'OFFERED',
    },
  })
}

/**
 * Join the waitlist for a show's seat category.
 *
 * One active WAITING/OFFERED entry is allowed per
 * customer/show/category.
 */
export async function joinWaitlist(
  userId: string,
  input: WaitlistJoinInput
): Promise<WaitlistEntryView> {
  const show = await prisma.show.findUnique({
    where: {
      id: input.showId,
    },
  })

  if (!show) {
    throw new AppError('Show not found', 404)
  }

  return prisma.$transaction(async (tx: TransactionClient) => {
    const existingActive = await tx.waitlistEntry.findFirst({
      where: {
        userId,
        showId: input.showId,
        category: input.category,
        status: {
          in: ['WAITING', 'OFFERED'],
        },
      },
    })

    if (existingActive) {
      throw new AppError(
        'You already have an active waitlist entry for this show and category',
        409
      )
    }

    const waitingCount = await tx.waitlistEntry.count({
      where: {
        showId: input.showId,
        category: input.category,
        status: 'WAITING',
      },
    })

    const entry = await tx.waitlistEntry.create({
      data: {
        userId,
        showId: input.showId,
        category: input.category,
        position: waitingCount + 1,
        status: 'WAITING',
      },
    })

    /**
     * If a seat is already available, immediately promote
     * this customer instead of leaving them unnecessarily WAITING.
     */
    await promoteWaitlistIfPossible(
      tx,
      input.showId,
      input.category
    )

    const finalEntry =
      await tx.waitlistEntry.findUniqueOrThrow({
        where: {
          id: entry.id,
        },
      })

    const offer =
      finalEntry.status === 'OFFERED'
        ? await tx.waitlistOffer.findFirst({
            where: {
              waitlistEntryId: entry.id,
              status: 'PENDING',
            },
            include: {
              showSeat: {
                include: {
                  seat: true,
                },
              },
            },
          })
        : null

    return toEntryView(
      finalEntry,
      offer ?? undefined
    )
  })
}

/**
 * List the authenticated customer's own waitlist entries.
 */
export async function listMyWaitlistEntries(
  userId: string
): Promise<WaitlistEntryView[]> {
  const entries = await prisma.waitlistEntry.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  const views: WaitlistEntryView[] = []

  for (const entry of entries) {
    if (entry.status !== 'OFFERED') {
      views.push(toEntryView(entry))
      continue
    }

    const offer = await prisma.waitlistOffer.findFirst({
      where: {
        waitlistEntryId: entry.id,
        status: 'PENDING',
      },
      include: {
        showSeat: {
          include: {
            seat: true,
          },
        },
      },
    })

    views.push(
      toEntryView(
        entry,
        offer ?? undefined
      )
    )
  }

  return views
}

/**
 * Cancel the authenticated customer's own waitlist entry.
 *
 * If an active offer exists, release the held seat and immediately
 * give the next WAITING customer a chance at that seat.
 */
export async function cancelWaitlistEntry(
  userId: string,
  waitlistEntryId: string
): Promise<WaitlistEntryView> {
  return prisma.$transaction(
    async (tx: TransactionClient) => {
      const entry =
        await tx.waitlistEntry.findUnique({
          where: {
            id: waitlistEntryId,
          },
        })

      if (!entry || entry.userId !== userId) {
        throw new AppError(
          'Waitlist entry not found',
          404
        )
      }

      if (
        entry.status === 'FULFILLED' ||
        entry.status === 'CANCELLED'
      ) {
        throw new AppError(
          'This waitlist entry can no longer be cancelled',
          409
        )
      }

      if (entry.status === 'OFFERED') {
        const offer =
          await tx.waitlistOffer.findFirst({
            where: {
              waitlistEntryId: entry.id,
              status: 'PENDING',
            },
          })

        if (offer) {
          await tx.showSeat.updateMany({
            where: {
              id: offer.showSeatId,
              heldBy: userId,
              status: 'HELD',
            },
            data: {
              status: 'AVAILABLE',
              heldBy: null,
              holdToken: null,
              holdExpiresAt: null,
            },
          })

          await tx.waitlistOffer.update({
            where: {
              id: offer.id,
            },
            data: {
              status: 'CANCELLED',
            },
          })

          /**
           * The category comes directly from the Prisma
           * WaitlistEntry enum field, so it is already a
           * SeatCategory at runtime.
           */
          await promoteWaitlistIfPossible(
            tx,
            entry.showId,
            entry.category
          )
        }
      }

      const cancelled =
        await tx.waitlistEntry.update({
          where: {
            id: entry.id,
          },
          data: {
            status: 'CANCELLED',
          },
        })

      return toEntryView(cancelled)
    }
  )
}