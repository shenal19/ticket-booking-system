import { Router } from 'express'

import {
  createShow,
  listShows,
  getShow,
  updateShow,
  deleteShow,
  createShowPrice,
  listShowPrices,
  updateShowPrice,
  deleteShowPrice,
  listShowsForEvent,
  getPublicShow,
} from '../controllers/show.controller'

import { authenticate } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'

const router = Router()

/*
 * ============================================================
 * CUSTOMER SHOW DISCOVERY
 * ============================================================
 *
 * Authenticated customers can browse shows.
 *
 * These routes DO NOT require ORGANISER role.
 */

/*
 * GET /api/shows/event/:eventId
 *
 * Get all shows belonging to an event.
 */
router.get(
  '/event/:eventId',
  authenticate,
  listShowsForEvent,
)

/*
 * GET /api/shows/:showId
 *
 * Get one show for customer discovery.
 */
router.get(
  '/:showId',
  authenticate,
  getPublicShow,
)

/*
 * ============================================================
 * ORGANISER SHOW MANAGEMENT
 * ============================================================
 *
 * Only ORGANISERS can create, update, or delete shows.
 */

/*
 * POST /api/shows
 */
router.post(
  '/',
  authenticate,
  requireRole('ORGANISER'),
  createShow,
)

/*
 * GET /api/shows
 *
 * Existing organiser-only show listing.
 */
router.get(
  '/',
  authenticate,
  requireRole('ORGANISER'),
  listShows,
)

/*
 * PUT /api/shows/:showId
 */
router.put(
  '/:showId',
  authenticate,
  requireRole('ORGANISER'),
  updateShow,
)

/*
 * DELETE /api/shows/:showId
 */
router.delete(
  '/:showId',
  authenticate,
  requireRole('ORGANISER'),
  deleteShow,
)

/*
 * ============================================================
 * SHOW PRICE MANAGEMENT
 * ============================================================
 */

/*
 * POST /api/shows/:showId/prices
 */
router.post(
  '/:showId/prices',
  authenticate,
  requireRole('ORGANISER'),
  createShowPrice,
)

/*
 * GET /api/shows/:showId/prices
 *
 * Currently organiser-only because the existing controller
 * performs organiser ownership validation.
 */
router.get(
  '/:showId/prices',
  authenticate,
  requireRole('ORGANISER'),
  listShowPrices,
)

/*
 * PUT /api/shows/:showId/prices/:priceId
 */
router.put(
  '/:showId/prices/:priceId',
  authenticate,
  requireRole('ORGANISER'),
  updateShowPrice,
)

/*
 * DELETE /api/shows/:showId/prices/:priceId
 */
router.delete(
  '/:showId/prices/:priceId',
  authenticate,
  requireRole('ORGANISER'),
  deleteShowPrice,
)

export default router