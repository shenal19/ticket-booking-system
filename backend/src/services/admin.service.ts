import { Role, BookingStatus, WaitlistStatus } from '@prisma/client'
import { prisma } from '../lib/prisma'

export interface AdminOverviewStats {
  users: {
    total: number
    customers: number
    organisers: number
    admins: number
  }
  inventory: {
    totalEvents: number
    totalVenues: number
    totalShows: number
  }
  bookings: {
    total: number
    confirmed: number
    cancelled: number
    totalRevenue: string
  }
  waitlist: {
    activeWaiting: number
    activeOffered: number
  }
}

export interface AdminUserView {
  id: string
  name: string
  email: string
  role: Role
  createdAt: Date
}

export interface AdminBookingView {
  id: string
  bookingReference: string
  userId: string
  userEmail: string
  userName: string
  showId: string
  eventTitle: string
  venueName: string
  showStartTime: Date
  status: BookingStatus
  totalAmount: string
  seatCount: number
  createdAt: Date
}

/**
 * Get comprehensive system-wide metrics and KPIs for ADMIN.
 */
export async function getAdminOverview(): Promise<AdminOverviewStats> {
  const [
    totalUsers,
    customers,
    organisers,
    admins,
    totalEvents,
    totalVenues,
    totalShows,
    totalBookings,
    confirmedBookings,
    cancelledBookings,
    revenueAgg,
    activeWaiting,
    activeOffered,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: Role.CUSTOMER } }),
    prisma.user.count({ where: { role: Role.ORGANISER } }),
    prisma.user.count({ where: { role: Role.ADMIN } }),
    prisma.event.count(),
    prisma.venue.count(),
    prisma.show.count(),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
    prisma.booking.count({ where: { status: BookingStatus.CANCELLED } }),
    prisma.booking.aggregate({
      where: { status: BookingStatus.CONFIRMED },
      _sum: { totalAmount: true },
    }),
    prisma.waitlistEntry.count({ where: { status: WaitlistStatus.WAITING } }),
    prisma.waitlistEntry.count({ where: { status: WaitlistStatus.OFFERED } }),
  ])

  const totalRevenue = revenueAgg._sum.totalAmount
    ? revenueAgg._sum.totalAmount.toFixed(2)
    : '0.00'

  return {
    users: {
      total: totalUsers,
      customers,
      organisers,
      admins,
    },
    inventory: {
      totalEvents,
      totalVenues,
      totalShows,
    },
    bookings: {
      total: totalBookings,
      confirmed: confirmedBookings,
      cancelled: cancelledBookings,
      totalRevenue,
    },
    waitlist: {
      activeWaiting,
      activeOffered,
    },
  }
}

/**
 * List all users registered across the platform with safe projections.
 */
export async function listAllUsers(): Promise<AdminUserView[]> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return users
}

/**
 * List all system-wide bookings across all users, events, and venues.
 */
export async function listAllBookings(): Promise<AdminBookingView[]> {
  const bookings = await prisma.booking.findMany({
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
      show: {
        include: {
          event: {
            select: {
              title: true,
            },
          },
          venue: {
            select: {
              name: true,
            },
          },
        },
      },
      bookingSeats: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 100,
  })

  return bookings.map((b) => ({
    id: b.id,
    bookingReference: b.bookingReference,
    userId: b.userId,
    userEmail: b.user.email,
    userName: b.user.name,
    showId: b.showId,
    eventTitle: b.show.event.title,
    venueName: b.show.venue.name,
    showStartTime: b.show.startTime,
    status: b.status,
    totalAmount: b.totalAmount.toFixed(2),
    seatCount: b.bookingSeats.length,
    createdAt: b.createdAt,
  }))
}
