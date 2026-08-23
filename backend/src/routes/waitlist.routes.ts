import { Router } from 'express'
import {
  joinWaitlist,
  listMyWaitlistEntries,
  cancelWaitlistEntry,
} from '../controllers/waitlist.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'

const router = Router()

router.use(authenticate, requireRole('CUSTOMER'))

router.post('/', joinWaitlist)
router.get('/mine', listMyWaitlistEntries)
router.delete('/:waitlistEntryId', cancelWaitlistEntry)

export default router
