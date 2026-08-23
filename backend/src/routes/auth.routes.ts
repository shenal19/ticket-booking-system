import { Router } from 'express'
import {
  register,
  login,
  me,
  customerTest,
  organiserTest,
  adminTest,
} from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'

const router = Router()

router.post('/register', register)
router.post('/login', login)

router.get('/me', authenticate, me)

// Phase 3C test-only endpoints — prove the auth + role middleware
// chain works end-to-end. Not part of the real business API surface.
router.get('/customer-test', authenticate, requireRole('CUSTOMER'), customerTest)
router.get('/organiser-test', authenticate, requireRole('ORGANISER'), organiserTest)
router.get('/admin-test', authenticate, requireRole('ADMIN'), adminTest)

export default router
