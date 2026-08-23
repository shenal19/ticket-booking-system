import { Router } from 'express'
import { createBooking, listMyBookings, cancelBooking } from '../controllers/booking.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'

const router = Router()

router.use(authenticate, requireRole('CUSTOMER'))

router.post('/', createBooking)
router.get('/mine', listMyBookings)
router.patch('/:bookingId/cancel', cancelBooking)
router.post('/:bookingId/cancel', cancelBooking)

export default router
