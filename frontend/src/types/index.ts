export type Role = 'CUSTOMER' | 'ORGANISER' | 'ADMIN'
export type SeatCategory = 'STANDARD' | 'PREMIUM'
export type EventType = 'MOVIE' | 'CONCERT'
export type ShowSeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED'
export type BookingStatus = 'CONFIRMED' | 'CANCELLED'
export type WaitlistStatus = 'WAITING' | 'OFFERED' | 'FULFILLED' | 'EXPIRED' | 'CANCELLED'

export interface User {
  id: string
  name: string
  email: string
  role: Role
}

export interface EventItem {
  id: string
  title: string
  description: string
  type: EventType
  organiserId: string
  createdAt: string
  updatedAt: string
}

export interface VenueItem {
  id: string
  name: string
  address: string
  organiserId?: string
  createdAt?: string
  updatedAt?: string
}

export interface SeatItem {
  id: string
  venueId: string
  rowLabel: string
  seatNumber: number
  category: SeatCategory
  createdAt?: string
  updatedAt?: string
}

export interface ShowPriceItem {
  id: string
  showId: string
  category: SeatCategory
  price: string | number
  createdAt?: string
  updatedAt?: string
}

export interface ShowItem {
  id: string
  eventId: string
  venueId: string
  startTime: string
  endTime: string
  venue?: VenueItem
  showPrices?: ShowPriceItem[]
  event?: EventItem
  createdAt: string
  updatedAt: string
}

export interface ShowSeatItem {
  showSeatId: string
  seatId: string
  rowLabel: string
  seatNumber: number
  category: SeatCategory
  status: ShowSeatStatus
}

export interface HeldShowSeatItem extends ShowSeatItem {
  holdToken: string
  holdExpiresAt: string
}

export interface BookingSeatItem {
  showSeatId: string
  rowLabel: string
  seatNumber: number
  category: string
  price: string
}

export interface BookingItem {
  id: string
  bookingReference: string
  showId: string
  status: BookingStatus | string
  totalAmount: string
  createdAt: string
  seats: BookingSeatItem[]
  show?: {
    id: string
    startTime: string
    endTime: string
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
}

export interface WaitlistOfferView {
  showSeatId: string
  rowLabel: string
  seatNumber: number
  holdToken: string
  expiresAt: string
  status: string
}

export interface WaitlistEntryItem {
  id: string
  showId: string
  category: SeatCategory
  position: number
  status: WaitlistStatus
  createdAt: string
  offer?: WaitlistOfferView
  show?: {
    id: string
    startTime: string
    endTime: string
    event?: {
      title: string
    }
    venue?: {
      name: string
    }
  }
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

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

export interface AdminUserItem {
  id: string
  name: string
  email: string
  role: Role
  createdAt: string
}

export interface AdminBookingItem {
  id: string
  bookingReference: string
  userId: string
  userEmail: string
  userName: string
  showId: string
  eventTitle: string
  venueName: string
  showStartTime: string
  status: BookingStatus
  totalAmount: string
  seatCount: number
  createdAt: string
}

