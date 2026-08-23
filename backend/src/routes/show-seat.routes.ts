import { Router } from 'express'
import {
  getShowSeats,
  holdShowSeats,
  releaseShowSeats,
} from '../controllers/show-seat.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'

const router = Router()

// Show-seat retrieval/hold/release is customer-facing.
router.use(authenticate, requireRole('CUSTOMER'))

router.get('/:showId/seats', getShowSeats)

// Phase 8: temporary seat holding/locking.
router.post('/:showId/hold', holdShowSeats)
router.post('/:showId/release', releaseShowSeats)

export default router
