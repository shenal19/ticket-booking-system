import { Router } from 'express'

import {
  createEvent,
  listEvents,
  getEvent,
  updateEvent,
  deleteEvent,
} from '../controllers/event.controller'

import { authenticate } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'

const router = Router()

/**
 * ============================================================
 * EVENT DISCOVERY
 * ============================================================
 *
 * Customers and organisers can browse events.
 */

router.get(
  '/',
  authenticate,
  listEvents,
)

router.get(
  '/discover',
  authenticate,
  requireRole('CUSTOMER'),
  listEvents,
)

router.get(
  '/:eventId',
  authenticate,
  getEvent,
)

/**
 * ============================================================
 * ORGANISER MANAGEMENT
 * ============================================================
 *
 * Only ORGANISERS can create, update, or delete events.
 */

router.post(
  '/',
  authenticate,
  requireRole('ORGANISER'),
  createEvent,
)

router.put(
  '/:eventId',
  authenticate,
  requireRole('ORGANISER'),
  updateEvent,
)

router.delete(
  '/:eventId',
  authenticate,
  requireRole('ORGANISER'),
  deleteEvent,
)

export default router