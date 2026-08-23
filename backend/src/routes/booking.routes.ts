import { Router } from 'express'
import { createBooking, listMyBookings } from '../controllers/booking.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'

const router = Router()

router.use(authenticate, requireRole('CUSTOMER'))

router.post('/', createBooking)
router.get('/mine', listMyBookings)

export default router
