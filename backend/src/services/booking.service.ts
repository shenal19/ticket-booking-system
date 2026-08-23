import crypto from 'crypto'
import { Prisma, SeatCategory } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../utils/AppError'
import { BookingInput } from '../utils/validators'
import { generateTicketQr } from './qr.service'
import { sendTicketEmail } from './email.service'
import { promoteWaitlistIfPossible } from './waitlist.service'

type TransactionClient = Prisma.TransactionClient

export interface BookingSeatView {
  showSeatId: string
  rowLabel: string
  seatNumber: number
  category: string
  price: string
}

export interface BookingView {
  id: string
  bookingReference: string
  showId: string
  status: string
  totalAmount: string
  seats: BookingSeatView[]
  createdAt: Date
}

export interface CustomerBookingView {
  id: string
  bookingReference: string
  showId: string
  status: string
  totalAmount: string
  createdAt: Date
  show: {
    id: string
    startTime: Date
    endTime: Date
    event: {
      id: string
      title: string
      type: string
    }
    venue: {
      id: string
      name: string
      address: string
    }
  }
  seats: BookingSeatView[]
}

const BOOKING_REFERENCE_MAX_ATTEMPTS = 5

function generateBookingReference(): string {
  return `TKT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'P2002'
  )
}

function toBookingView(booking: {
  id: string
  bookingReference: string
  showId: string
  status: string
  totalAmount: Prisma.Decimal
  createdAt: Date
  bookingSeats: {
    price: Prisma.Decimal
    showSeat: {
      id: string
      seat: {
        rowLabel: string
        seatNumber: number
        category: string
      }
    }
  }[]
}): BookingView {
  return {
    id: booking.id,
    bookingReference: booking.bookingReference,
    showId: booking.showId,
    status: booking.status,
    totalAmount: booking.totalAmount.toFixed(2),

    seats: booking.bookingSeats.map((bs) => ({
      showSeatId: bs.showSeat.id,
      rowLabel: bs.showSeat.seat.rowLabel,
      seatNumber: bs.showSeat.seat.seatNumber,
      category: bs.showSeat.seat.category,
      price: bs.price.toFixed(2),
    })),

    createdAt: booking.createdAt,
  }
}

/**
 * Create a confirmed booking from a valid seat hold.
 *
 * Database operations happen inside one transaction.
 *
 * QR generation and email sending happen AFTER the transaction
 * successfully commits.
 *
 * This is important:
 * SMTP/QR failures must never roll back a successful booking.
 */
export async function createBooking(
  userId: string,
  input: BookingInput
): Promise<BookingView> {
  const show = await prisma.show.findUnique({
    where: {
      id: input.showId,
    },
  })

  if (!show) {
    throw new AppError('Show not found', 404)
  }

  /*
   * Fetch customer information before the transaction.
   *
   * We only need this for the post-booking email.
   */
  const customer = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      email: true,
      name: true,
    },
  })

  if (!customer) {
    throw new AppError('Customer not found', 404)
  }

  /*
   * Everything that changes booking/seat/waitlist state
   * remains inside the transaction.
   */
  const booking = await prisma.$transaction(
    async (tx: TransactionClient): Promise<BookingView> => {
      /**
       * Fetch requested seats belonging to this show.
       */
      const showSeats = await tx.showSeat.findMany({
        where: {
          id: {
            in: input.showSeatIds,
          },
          showId: input.showId,
        },
        include: {
          seat: true,
        },
      })

      if (showSeats.length !== input.showSeatIds.length) {
        throw new AppError(
          'One or more seats were not found for this show',
          404
        )
      }

      /**
       * Every seat must currently be HELD.
       */
      const notHeld = showSeats.some(
        (s: { status: string }) => s.status !== 'HELD'
      )

      if (notHeld) {
        throw new AppError(
          'One or more requested seats are not currently held',
          409
        )
      }

      /**
       * Every seat must belong to the authenticated customer.
       */
      const notOwnedByCustomer = showSeats.some(
        (s: { heldBy: string | null }) => s.heldBy !== userId
      )

      if (notOwnedByCustomer) {
        throw new AppError(
          'One or more requested seats are held by another customer',
          409
        )
      }

      /**
       * All seats must belong to the same hold group.
       */
      const tokenMismatch = showSeats.some(
        (s: { holdToken: string | null }) =>
          s.holdToken !== input.holdToken
      )

      if (tokenMismatch) {
        throw new AppError(
          'Hold token does not match',
          409
        )
      }

      /**
       * Hold must not have expired.
       */
      const now = new Date()

      const expired = showSeats.some(
        (s: { holdExpiresAt: Date | null }) =>
          !s.holdExpiresAt ||
          s.holdExpiresAt <= now
      )

      if (expired) {
        throw new AppError(
          'Hold has expired',
          409
        )
      }

      /**
       * Get seat categories using Prisma's enum.
       */
      const categories: SeatCategory[] = [
        ...new Set(
          showSeats.map(
            (s: { seat: { category: SeatCategory } }) =>
              s.seat.category
          )
        ),
      ]

      /**
       * Get prices configured for this show.
       */
      const showPrices = await tx.showPrice.findMany({
        where: {
          showId: input.showId,
          category: {
            in: categories,
          },
        },
      })

      const priceByCategory = new Map<
        SeatCategory,
        Prisma.Decimal
      >(
        showPrices.map(
          (p: {
            category: SeatCategory
            price: Prisma.Decimal
          }) => [
            p.category,
            p.price,
          ]
        )
      )

      /**
       * Every category must have a price.
       */
      const missingCategory = categories.find(
        (category) =>
          !priceByCategory.has(category)
      )

      if (missingCategory) {
        throw new AppError(
          `No price is configured for the ${missingCategory} category on this show`,
          409
        )
      }

      /**
       * Atomically claim seats.
       */
      const claimed = await tx.showSeat.updateMany({
        where: {
          id: {
            in: input.showSeatIds,
          },
          showId: input.showId,
          status: 'HELD',
          heldBy: userId,
          holdToken: input.holdToken,
        },

        data: {
          status: 'BOOKED',
          heldBy: null,
          holdToken: null,
          holdExpiresAt: null,
        },
      })

      if (
        claimed.count !==
        input.showSeatIds.length
      ) {
        throw new AppError(
          'One or more seats changed before the booking could complete — please try again',
          409
        )
      }

      /**
       * Calculate total using Prisma.Decimal.
       */
      let totalAmount = new Prisma.Decimal(0)

      for (const s of showSeats) {
        const price = priceByCategory.get(
          s.seat.category
        )

        if (!price) {
          throw new AppError(
            `No price is configured for the ${s.seat.category} category on this show`,
            409
          )
        }

        totalAmount = totalAmount.plus(price)
      }

      /**
       * Create booking.
       */
      let lastError: unknown

      for (
        let attempt = 0;
        attempt < BOOKING_REFERENCE_MAX_ATTEMPTS;
        attempt++
      ) {
        const bookingReference =
          generateBookingReference()

        try {
          const createdBooking =
            await tx.booking.create({
              data: {
                bookingReference,
                userId,
                showId: input.showId,
                status: 'CONFIRMED',
                totalAmount,

                bookingSeats: {
                  create: showSeats.map(
                    (s: {
                      id: string
                      seat: {
                        category: SeatCategory
                      }
                    }) => {
                      const price =
                        priceByCategory.get(
                          s.seat.category
                        )

                      if (!price) {
                        throw new AppError(
                          `No price is configured for the ${s.seat.category} category on this show`,
                          409
                        )
                      }

                      return {
                        showSeatId: s.id,
                        price,
                      }
                    }
                  ),
                },
              },

              include: {
                bookingSeats: {
                  include: {
                    showSeat: {
                      include: {
                        seat: true,
                      },
                    },
                  },
                },
              },
            })

          /**
           * Phase 10:
           * Reconcile any pending waitlist offers.
           */
          const pendingOffers =
            await tx.waitlistOffer.findMany({
              where: {
                showSeatId: {
                  in: input.showSeatIds,
                },
                status: 'PENDING',
              },
            })

          for (const offer of pendingOffers) {
            /**
             * Offer accepted.
             */
            await tx.waitlistOffer.update({
              where: {
                id: offer.id,
              },
              data: {
                status: 'ACCEPTED',
              },
            })

            /**
             * Waitlist entry fulfilled.
             */
            await tx.waitlistEntry.update({
              where: {
                id: offer.waitlistEntryId,
              },
              data: {
                status: 'FULFILLED',
              },
            })
          }

          return toBookingView(
            createdBooking
          )
        } catch (err) {
          if (isUniqueConstraintError(err)) {
            lastError = err
            continue
          }

          throw err
        }
      }

      if (lastError instanceof Error) {
        throw new AppError(
          'Unable to generate a unique booking reference',
          500
        )
      }

      throw new AppError(
        'Unable to complete booking',
        500
      )
    }
  )

  /**
   * ============================================================
   * PHASE 11 — QR GENERATION + EMAIL
   * ============================================================
   *
   * IMPORTANT:
   *
   * The transaction has already committed at this point.
   *
   * Therefore:
   *
   * - Booking is safely stored
   * - Seats are BOOKED
   * - Waitlist is reconciled
   *
   * If QR/email fails, the booking remains valid.
   */

  try {
    /**
     * Generate ticket QR from booking reference.
     */
    const qrCode = await generateTicketQr(
      booking.bookingReference
    )

    /**
     * Send confirmation email with QR attachment.
     */
    await sendTicketEmail({
      customerEmail: customer.email,
      customerName: customer.name ?? undefined,
      bookingReference:
        booking.bookingReference,
      showId: booking.showId,
      totalAmount:
        booking.totalAmount,

      seats: booking.seats.map(
        (seat) => ({
          rowLabel: seat.rowLabel,
          seatNumber: seat.seatNumber,
          category: seat.category,
          price: seat.price,
        })
      ),

      qrCode,
    })
  } catch (err) {
    /**
     * Do NOT throw here.
     *
     * The booking has already been committed.
     *
     * Returning the successful booking is safer than
     * telling the customer the booking failed when the
     * database already contains a confirmed booking.
     */
    console.error(
      'Ticket QR/email processing failed:',
      err
    )
  }

  return booking
}

/**
 * List all bookings for the authenticated customer.
 */
export async function listMyBookings(
  userId: string
): Promise<CustomerBookingView[]> {
  const bookings = await prisma.booking.findMany({
    where: {
      userId,
    },
    include: {
      show: {
        include: {
          event: true,
          venue: true,
        },
      },
      bookingSeats: {
        include: {
          showSeat: {
            include: {
              seat: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return bookings.map((b) => ({
    id: b.id,
    bookingReference: b.bookingReference,
    showId: b.showId,
    status: b.status,
    totalAmount: b.totalAmount.toFixed(2),
    createdAt: b.createdAt,
    show: {
      id: b.show.id,
      startTime: b.show.startTime,
      endTime: b.show.endTime,
      event: {
        id: b.show.event.id,
        title: b.show.event.title,
        type: b.show.event.type,
      },
      venue: {
        id: b.show.venue.id,
        name: b.show.venue.name,
        address: b.show.venue.address,
      },
    },
    seats: b.bookingSeats.map((bs) => ({
      showSeatId: bs.showSeat.id,
      rowLabel: bs.showSeat.seat.rowLabel,
      seatNumber: bs.showSeat.seat.seatNumber,
      category: bs.showSeat.seat.category,
      price: bs.price.toFixed(2),
    })),
  }))
}

/**
 * Cancel a confirmed booking for the authenticated customer.
 *
 * Transactionally updates the booking status to CANCELLED, releases
 * the booked seats back to AVAILABLE, and immediately promotes the
 * next waiting customer for each affected seat category.
 */
export async function cancelBooking(
  userId: string,
  bookingId: string
): Promise<BookingView> {
  const existingBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      bookingSeats: {
        include: {
          showSeat: {
            include: {
              seat: true,
            },
          },
        },
      },
    },
  })

  if (!existingBooking) {
    throw new AppError('Booking not found', 404)
  }

  if (existingBooking.userId !== userId) {
    throw new AppError('Booking not found', 404)
  }

  if (existingBooking.status === 'CANCELLED') {
    throw new AppError('Booking is already cancelled', 409)
  }

  return prisma.$transaction(
    async (tx: TransactionClient): Promise<BookingView> => {
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
        include: {
          bookingSeats: {
            include: {
              showSeat: {
                include: {
                  seat: true,
                },
              },
            },
          },
        },
      })

      const showSeatIds = existingBooking.bookingSeats.map(
        (bs) => bs.showSeatId
      )

      await tx.showSeat.updateMany({
        where: {
          id: { in: showSeatIds },
          showId: existingBooking.showId,
        },
        data: {
          status: 'AVAILABLE',
          heldBy: null,
          holdToken: null,
          holdExpiresAt: null,
        },
      })

      const freedCategories = [
        ...new Set(
          existingBooking.bookingSeats.map(
            (bs) => bs.showSeat.seat.category as SeatCategory
          )
        ),
      ]

      for (const category of freedCategories) {
        await promoteWaitlistIfPossible(
          tx,
          existingBooking.showId,
          category
        )
      }

      return toBookingView(updatedBooking)
    }
  )
}