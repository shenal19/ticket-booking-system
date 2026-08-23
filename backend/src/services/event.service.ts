import { prisma } from '../lib/prisma'
import { AppError } from '../utils/AppError'
import {
  EventInput,
  EventUpdateInput,
} from '../utils/validators'

export interface EventRecord {
  id: string
  title: string
  description: string
  type: string
  organiserId: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Check whether a Prisma error is a foreign-key
 * constraint violation.
 */
function isForeignKeyConstraintError(
  err: unknown,
): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'P2003'
  )
}

/**
 * ============================================================
 * CREATE EVENT
 * ============================================================
 *
 * Creates an event owned by the authenticated organiser.
 *
 * organiserId comes from the authenticated JWT and is never
 * accepted from the request body.
 */
export async function createEvent(
  input: EventInput,
  organiserId: string,
): Promise<EventRecord> {
  return prisma.event.create({
    data: {
      title: input.title,
      description: input.description,
      type: input.type,
      organiserId,
    },
  })
}

/**
 * ============================================================
 * LIST EVENTS
 * ============================================================
 *
 * Used for event discovery.
 *
 * Customers:
 *   - Can see all events.
 *
 * Organisers:
 *   - Can also retrieve the event list.
 *
 * Ownership filtering is NOT applied here because this is
 * the customer discovery endpoint.
 */
export async function listEvents(): Promise<EventRecord[]> {
  return prisma.event.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  })
}

/**
 * ============================================================
 * GET EVENT
 * ============================================================
 *
 * Used for event discovery.
 *
 * Any authenticated user can retrieve an event by ID.
 */
export async function getEvent(
  eventId: string,
): Promise<EventRecord> {
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
    },
  })

  if (!event) {
    throw new AppError(
      'Event not found',
      404,
    )
  }

  return event
}

/**
 * ============================================================
 * GET EVENT FOR ORGANISER
 * ============================================================
 *
 * Used only for organiser management operations.
 *
 * The event must belong to the authenticated organiser.
 */
export async function getEventForOrganiser(
  eventId: string,
  organiserId: string,
): Promise<EventRecord> {
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
    },
  })

  if (
    !event ||
    event.organiserId !== organiserId
  ) {
    throw new AppError(
      'Event not found',
      404,
    )
  }

  return event
}

/**
 * ============================================================
 * UPDATE EVENT
 * ============================================================
 *
 * Only the organiser who owns the event can update it.
 *
 * organiserId cannot be changed through this operation.
 */
export async function updateEvent(
  eventId: string,
  organiserId: string,
  updates: EventUpdateInput,
): Promise<EventRecord> {
  // Verify ownership first.
  await getEventForOrganiser(
    eventId,
    organiserId,
  )

  return prisma.event.update({
    where: {
      id: eventId,
    },
    data: updates,
  })
}

/**
 * ============================================================
 * DELETE EVENT
 * ============================================================
 *
 * Only the owning organiser can delete an event.
 *
 * An event cannot be deleted if it already has shows.
 */
export async function deleteEvent(
  eventId: string,
  organiserId: string,
): Promise<void> {
  // Verify ownership first.
  await getEventForOrganiser(
    eventId,
    organiserId,
  )

  // Check whether shows are associated with this event.
  const showCount = await prisma.show.count({
    where: {
      eventId,
    },
  })

  if (showCount > 0) {
    throw new AppError(
      'Cannot delete event: it still has shows associated with it',
      409,
    )
  }

  try {
    await prisma.event.delete({
      where: {
        id: eventId,
      },
    })
  } catch (err) {
    // Protect against a race condition where a dependent
    // record is created between the count and delete.
    if (isForeignKeyConstraintError(err)) {
      throw new AppError(
        'Cannot delete event: dependent records exist',
        409,
      )
    }

    throw new AppError(
      'Unable to delete event',
      500,
    )
  }
}