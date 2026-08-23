import { Router } from 'express'
import healthRoutes from './health.routes'
import authRoutes from './auth.routes'
import venueRoutes from './venue.routes'
import eventRoutes from './event.routes'
import showRoutes from './show.routes'
import showSeatRoutes from './show-seat.routes'
import bookingRoutes from './booking.routes'
import waitlistRoutes from './waitlist.routes'

const router = Router()

router.use('/', healthRoutes)
router.use('/auth', authRoutes)
router.use('/venues', venueRoutes)
router.use('/events', eventRoutes)
router.use('/shows', showRoutes)
router.use('/show-seats', showSeatRoutes)
router.use('/bookings', bookingRoutes)
router.use('/waitlist', waitlistRoutes)

// Future phases will mount additional routers here, e.g.:
// router.use('/qr', qrRoutes)

export default router
