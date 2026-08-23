import { Router } from 'express'
import {
  createSeat,
  listSeats,
  getSeat,
  updateSeat,
  deleteSeat,
} from '../controllers/seat.controller'

// mergeParams so :venueId from the parent venue router is visible
// on req.params here.
//
// No auth/role middleware applied here: this router is only ever
// mounted under venue.routes.ts, which already applies
// `authenticate, requireRole('ORGANISER')` to its entire path tree
// (including this nested /seats router) before any route matches.
// Re-applying it here would just re-verify the same token twice.
const router = Router({ mergeParams: true })

router.post('/', createSeat)
router.get('/', listSeats)
router.get('/:seatId', getSeat)
router.put('/:seatId', updateSeat)
router.delete('/:seatId', deleteSeat)

export default router
