import { Router } from 'express'
import { getOverview, getUsers, getBookings } from '../controllers/admin.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'

const router = Router()

// All Admin routes require authenticated user with role === 'ADMIN'
router.use(authenticate, requireRole('ADMIN'))

router.get('/overview', getOverview)
router.get('/users', getUsers)
router.get('/bookings', getBookings)

export default router
