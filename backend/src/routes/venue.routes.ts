import { Router } from 'express'
import {
  createVenue,
  listVenues,
  getVenue,
  updateVenue,
  deleteVenue,
} from '../controllers/venue.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import seatRoutes from './seat.routes'

const router = Router()

// All venue management endpoints require an authenticated ORGANISER.
router.use(authenticate, requireRole('ORGANISER'))

router.post('/', createVenue)
router.get('/', listVenues)
router.get('/:venueId', getVenue)
router.put('/:venueId', updateVenue)
router.delete('/:venueId', deleteVenue)

// Nested: /api/venues/:venueId/seats/...
router.use('/:venueId/seats', seatRoutes)

export default router
