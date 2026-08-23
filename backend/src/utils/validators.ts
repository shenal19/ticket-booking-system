/**
 * Registration input validation (Phase 3B).
 *
 * Deliberately dependency-free — the input shape is small enough
 * that a validation library would add more weight than value here.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

export type PublicRole = 'CUSTOMER' | 'ORGANISER'

export interface RegisterInput {
  name: string
  email: string
  password: string
  role: PublicRole
}

interface RawRegisterBody {
  name?: unknown
  email?: unknown
  password?: unknown
  role?: unknown
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  data?: RegisterInput
}

/**
 * Validate and normalize a registration request body.
 *
 * - Trims name/email.
 * - Lowercases email.
 * - Defaults role to CUSTOMER when omitted.
 * - Never trusts a client-supplied ADMIN role — that is rejected
 *   here as an invalid value, not silently downgraded.
 */
export function validateRegisterInput(body: RawRegisterBody): ValidationResult {
  const errors: string[] = []

  // --- name ---
  const rawName = body.name
  const name = typeof rawName === 'string' ? rawName.trim() : ''
  if (typeof rawName !== 'string' || name.length === 0) {
    errors.push('name is required and must be a non-empty string')
  }

  // --- email ---
  const rawEmail = body.email
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
  if (typeof rawEmail !== 'string' || email.length === 0) {
    errors.push('email is required and must be a non-empty string')
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push('email must be a valid email address')
  }

  // --- password ---
  const rawPassword = body.password
  const password = typeof rawPassword === 'string' ? rawPassword : ''
  if (typeof rawPassword !== 'string' || password.length === 0) {
    errors.push('password is required and must be a non-empty string')
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  }

  // --- role ---
  // Defaults to CUSTOMER. Only CUSTOMER/ORGANISER are ever accepted
  // from a public request — ADMIN (or anything else) is rejected
  // outright, regardless of what the client sends.
  let role: PublicRole = 'CUSTOMER'
  if (body.role !== undefined) {
    if (body.role === 'CUSTOMER' || body.role === 'ORGANISER') {
      role = body.role
    } else {
      errors.push('role must be either CUSTOMER or ORGANISER')
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    errors: [],
    data: { name, email, password, role },
  }
}

// ==================================================
// Login input validation (Phase 3C)
// ==================================================

export interface LoginInput {
  email: string
  password: string
}

interface RawLoginBody {
  email?: unknown
  password?: unknown
}

export interface LoginValidationResult {
  valid: boolean
  errors: string[]
  data?: LoginInput
}

/**
 * Validate and normalize a login request body.
 * Email is trimmed/lowercased the same way as registration, so the
 * same normalized value is used for the Prisma lookup.
 */
export function validateLoginInput(body: RawLoginBody): LoginValidationResult {
  const errors: string[] = []

  const rawEmail = body.email
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
  if (typeof rawEmail !== 'string' || email.length === 0) {
    errors.push('email is required and must be a non-empty string')
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push('email must be a valid email address')
  }

  const rawPassword = body.password
  const password = typeof rawPassword === 'string' ? rawPassword : ''
  if (typeof rawPassword !== 'string' || password.length === 0) {
    errors.push('password is required and must be a non-empty string')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    errors: [],
    data: { email, password },
  }
}

// ==================================================
// Venue input validation (Phase 4)
// ==================================================

const NAME_MAX_LENGTH = 200
const ADDRESS_MAX_LENGTH = 300

export interface VenueInput {
  name: string
  address: string
}

export interface VenueUpdateInput {
  name?: string
  address?: string
}

interface RawVenueBody {
  name?: unknown
  address?: unknown
}

export interface VenueValidationResult {
  valid: boolean
  errors: string[]
  data?: VenueInput
}

export interface VenueUpdateValidationResult {
  valid: boolean
  errors: string[]
  data?: VenueUpdateInput
}

/**
 * Validate a venue creation request body.
 * Only `name`/`address` are accepted — those are the only fields
 * that exist on the Venue model. Ownership (organiserId) always
 * comes from the authenticated request, never the body.
 */
export function validateVenueInput(body: RawVenueBody): VenueValidationResult {
  const errors: string[] = []

  const rawName = body.name
  const name = typeof rawName === 'string' ? rawName.trim() : ''
  if (typeof rawName !== 'string' || name.length === 0) {
    errors.push('name is required and must be a non-empty string')
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.push(`name must be at most ${NAME_MAX_LENGTH} characters`)
  }

  const rawAddress = body.address
  const address = typeof rawAddress === 'string' ? rawAddress.trim() : ''
  if (typeof rawAddress !== 'string' || address.length === 0) {
    errors.push('address is required and must be a non-empty string')
  } else if (address.length > ADDRESS_MAX_LENGTH) {
    errors.push(`address must be at most ${ADDRESS_MAX_LENGTH} characters`)
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, errors: [], data: { name, address } }
}

/**
 * Validate a venue update request body. Both fields are optional
 * (partial update), but whichever are present must be valid
 * non-empty strings. At least one field must be supplied.
 */
export function validateVenueUpdateInput(
  body: RawVenueBody
): VenueUpdateValidationResult {
  const errors: string[] = []
  const data: VenueUpdateInput = {}

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (typeof body.name !== 'string' || name.length === 0) {
      errors.push('name must be a non-empty string')
    } else if (name.length > NAME_MAX_LENGTH) {
      errors.push(`name must be at most ${NAME_MAX_LENGTH} characters`)
    } else {
      data.name = name
    }
  }

  if (body.address !== undefined) {
    const address = typeof body.address === 'string' ? body.address.trim() : ''
    if (typeof body.address !== 'string' || address.length === 0) {
      errors.push('address must be a non-empty string')
    } else if (address.length > ADDRESS_MAX_LENGTH) {
      errors.push(`address must be at most ${ADDRESS_MAX_LENGTH} characters`)
    } else {
      data.address = address
    }
  }

  if (Object.keys(data).length === 0) {
    errors.push('at least one of name or address must be provided')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, errors: [], data }
}

// ==================================================
// Seat input validation (Phase 4)
// ==================================================

const ROW_LABEL_MAX_LENGTH = 10
export type SeatCategoryValue = 'STANDARD' | 'PREMIUM'

export interface SeatInput {
  rowLabel: string
  seatNumber: number
  category: SeatCategoryValue
}

export interface SeatUpdateInput {
  rowLabel?: string
  seatNumber?: number
  category?: SeatCategoryValue
}

interface RawSeatBody {
  rowLabel?: unknown
  seatNumber?: unknown
  category?: unknown
}

export interface SeatValidationResult {
  valid: boolean
  errors: string[]
  data?: SeatInput
}

export interface SeatUpdateValidationResult {
  valid: boolean
  errors: string[]
  data?: SeatUpdateInput
}

export function isValidSeatCategory(value: unknown): value is SeatCategoryValue {
  return value === 'STANDARD' || value === 'PREMIUM'
}

function isValidSeatNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1
}

/**
 * Validate a seat creation request body against the actual Prisma
 * Seat model fields (rowLabel, seatNumber, category) — not the
 * illustrative "row"/"number" shape mentioned as an example.
 */
export function validateSeatInput(body: RawSeatBody): SeatValidationResult {
  const errors: string[] = []

  const rawRowLabel = body.rowLabel
  const rowLabel = typeof rawRowLabel === 'string' ? rawRowLabel.trim() : ''
  if (typeof rawRowLabel !== 'string' || rowLabel.length === 0) {
    errors.push('rowLabel is required and must be a non-empty string')
  } else if (rowLabel.length > ROW_LABEL_MAX_LENGTH) {
    errors.push(`rowLabel must be at most ${ROW_LABEL_MAX_LENGTH} characters`)
  }

  if (!isValidSeatNumber(body.seatNumber)) {
    errors.push('seatNumber is required and must be a positive integer')
  }

  if (!isValidSeatCategory(body.category)) {
    errors.push('category must be either STANDARD or PREMIUM')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    errors: [],
    data: {
      rowLabel,
      seatNumber: body.seatNumber as number,
      category: body.category as SeatCategoryValue,
    },
  }
}

/**
 * Validate a seat update request body. All fields optional (partial
 * update), but venueId is deliberately not accepted here at all —
 * moving a seat between venues is out of scope; venue association
 * is fixed at creation and controlled only by the route.
 */
export function validateSeatUpdateInput(body: RawSeatBody): SeatUpdateValidationResult {
  const errors: string[] = []
  const data: SeatUpdateInput = {}

  if (body.rowLabel !== undefined) {
    const rowLabel = typeof body.rowLabel === 'string' ? body.rowLabel.trim() : ''
    if (typeof body.rowLabel !== 'string' || rowLabel.length === 0) {
      errors.push('rowLabel must be a non-empty string')
    } else if (rowLabel.length > ROW_LABEL_MAX_LENGTH) {
      errors.push(`rowLabel must be at most ${ROW_LABEL_MAX_LENGTH} characters`)
    } else {
      data.rowLabel = rowLabel
    }
  }

  if (body.seatNumber !== undefined) {
    if (!isValidSeatNumber(body.seatNumber)) {
      errors.push('seatNumber must be a positive integer')
    } else {
      data.seatNumber = body.seatNumber
    }
  }

  if (body.category !== undefined) {
    if (!isValidSeatCategory(body.category)) {
      errors.push('category must be either STANDARD or PREMIUM')
    } else {
      data.category = body.category
    }
  }

  if (Object.keys(data).length === 0) {
    errors.push('at least one of rowLabel, seatNumber, or category must be provided')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, errors: [], data }
}

// ==================================================
// Event input validation (Phase 5)
// ==================================================

const TITLE_MAX_LENGTH = 200
const DESCRIPTION_MAX_LENGTH = 2000

export type EventTypeValue = 'MOVIE' | 'CONCERT'

export interface EventInput {
  title: string
  description: string
  type: EventTypeValue
}

export interface EventUpdateInput {
  title?: string
  description?: string
  type?: EventTypeValue
}

interface RawEventBody {
  title?: unknown
  description?: unknown
  type?: unknown
}

export interface EventValidationResult {
  valid: boolean
  errors: string[]
  data?: EventInput
}

export interface EventUpdateValidationResult {
  valid: boolean
  errors: string[]
  data?: EventUpdateInput
}

function isValidEventType(value: unknown): value is EventTypeValue {
  return value === 'MOVIE' || value === 'CONCERT'
}

/**
 * Validate an event creation request body against the actual Prisma
 * Event model fields (title, description, type). The model has no
 * venue/date/numeric fields, so none are validated here.
 */
export function validateEventInput(body: RawEventBody): EventValidationResult {
  const errors: string[] = []

  const rawTitle = body.title
  const title = typeof rawTitle === 'string' ? rawTitle.trim() : ''
  if (typeof rawTitle !== 'string' || title.length === 0) {
    errors.push('title is required and must be a non-empty string')
  } else if (title.length > TITLE_MAX_LENGTH) {
    errors.push(`title must be at most ${TITLE_MAX_LENGTH} characters`)
  }

  const rawDescription = body.description
  const description = typeof rawDescription === 'string' ? rawDescription.trim() : ''
  if (typeof rawDescription !== 'string' || description.length === 0) {
    errors.push('description is required and must be a non-empty string')
  } else if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.push(`description must be at most ${DESCRIPTION_MAX_LENGTH} characters`)
  }

  if (!isValidEventType(body.type)) {
    errors.push('type must be either MOVIE or CONCERT')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    errors: [],
    data: { title, description, type: body.type as EventTypeValue },
  }
}

/**
 * Validate an event update request body. All fields optional
 * (partial update), but organiserId is deliberately never accepted
 * here — ownership is fixed at creation and controlled only by the
 * authenticated context.
 */
export function validateEventUpdateInput(body: RawEventBody): EventUpdateValidationResult {
  const errors: string[] = []
  const data: EventUpdateInput = {}

  if (body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (typeof body.title !== 'string' || title.length === 0) {
      errors.push('title must be a non-empty string')
    } else if (title.length > TITLE_MAX_LENGTH) {
      errors.push(`title must be at most ${TITLE_MAX_LENGTH} characters`)
    } else {
      data.title = title
    }
  }

  if (body.description !== undefined) {
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    if (typeof body.description !== 'string' || description.length === 0) {
      errors.push('description must be a non-empty string')
    } else if (description.length > DESCRIPTION_MAX_LENGTH) {
      errors.push(`description must be at most ${DESCRIPTION_MAX_LENGTH} characters`)
    } else {
      data.description = description
    }
  }

  if (body.type !== undefined) {
    if (!isValidEventType(body.type)) {
      errors.push('type must be either MOVIE or CONCERT')
    } else {
      data.type = body.type
    }
  }

  if (Object.keys(data).length === 0) {
    errors.push('at least one of title, description, or type must be provided')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, errors: [], data }
}

// ==================================================
// Show input validation (Phase 6)
// ==================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value)
}

function parseValidDate(value: unknown): Date | null {
  if (typeof value !== 'string' && !(value instanceof Date)) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export interface ShowInput {
  eventId: string
  venueId: string
  startTime: Date
  endTime: Date
}

export interface ShowUpdateInput {
  eventId?: string
  venueId?: string
  startTime?: Date
  endTime?: Date
}

interface RawShowBody {
  eventId?: unknown
  venueId?: unknown
  startTime?: unknown
  endTime?: unknown
}

export interface ShowValidationResult {
  valid: boolean
  errors: string[]
  data?: ShowInput
}

export interface ShowUpdateValidationResult {
  valid: boolean
  errors: string[]
  data?: ShowUpdateInput
}

/**
 * Validate a show creation request body against the actual Prisma
 * Show model fields (eventId, venueId, startTime, endTime). No
 * `status` field exists on Show, so none is validated here.
 *
 * This only checks FORMAT (valid UUID shape, valid date, start <
 * end). Whether the eventId/venueId actually exist and are owned by
 * the authenticated organiser is an ownership check performed by the
 * service layer (404), not a format check (400).
 */
export function validateShowInput(body: RawShowBody): ShowValidationResult {
  const errors: string[] = []

  if (!isValidUuid(body.eventId)) {
    errors.push('eventId is required and must be a valid UUID')
  }

  if (!isValidUuid(body.venueId)) {
    errors.push('venueId is required and must be a valid UUID')
  }

  const startTime = parseValidDate(body.startTime)
  if (!startTime) {
    errors.push('startTime is required and must be a valid date/time')
  }

  const endTime = parseValidDate(body.endTime)
  if (!endTime) {
    errors.push('endTime is required and must be a valid date/time')
  }

  if (startTime && endTime && startTime.getTime() >= endTime.getTime()) {
    errors.push('startTime must be before endTime')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    errors: [],
    data: {
      eventId: body.eventId as string,
      venueId: body.venueId as string,
      startTime: startTime as Date,
      endTime: endTime as Date,
    },
  }
}

/**
 * Validate a show update request body. All fields optional (partial
 * update). Cross-field checks (start < end when only one of the two
 * is supplied, since the other comes from the existing record) are
 * done in the service layer, which has the current show to merge
 * against.
 */
export function validateShowUpdateInput(body: RawShowBody): ShowUpdateValidationResult {
  const errors: string[] = []
  const data: ShowUpdateInput = {}

  if (body.eventId !== undefined) {
    if (!isValidUuid(body.eventId)) {
      errors.push('eventId must be a valid UUID')
    } else {
      data.eventId = body.eventId
    }
  }

  if (body.venueId !== undefined) {
    if (!isValidUuid(body.venueId)) {
      errors.push('venueId must be a valid UUID')
    } else {
      data.venueId = body.venueId
    }
  }

  if (body.startTime !== undefined) {
    const startTime = parseValidDate(body.startTime)
    if (!startTime) {
      errors.push('startTime must be a valid date/time')
    } else {
      data.startTime = startTime
    }
  }

  if (body.endTime !== undefined) {
    const endTime = parseValidDate(body.endTime)
    if (!endTime) {
      errors.push('endTime must be a valid date/time')
    } else {
      data.endTime = endTime
    }
  }

  if (data.startTime && data.endTime && data.startTime.getTime() >= data.endTime.getTime()) {
    errors.push('startTime must be before endTime')
  }

  if (Object.keys(data).length === 0) {
    errors.push('at least one field must be provided')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, errors: [], data }
}

// ==================================================
// ShowPrice input validation (Phase 6)
// ==================================================

const MAX_PRICE = 1_000_000

export interface ShowPriceInput {
  category: SeatCategoryValue
  price: number
}

export interface ShowPriceUpdateInput {
  category?: SeatCategoryValue
  price?: number
}

interface RawShowPriceBody {
  category?: unknown
  price?: unknown
}

export interface ShowPriceValidationResult {
  valid: boolean
  errors: string[]
  data?: ShowPriceInput
}

export interface ShowPriceUpdateValidationResult {
  valid: boolean
  errors: string[]
  data?: ShowPriceUpdateInput
}

function isValidPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= MAX_PRICE
}

export function validateShowPriceInput(body: RawShowPriceBody): ShowPriceValidationResult {
  const errors: string[] = []

  if (!isValidSeatCategory(body.category)) {
    errors.push('category must be either STANDARD or PREMIUM')
  }

  if (!isValidPrice(body.price)) {
    errors.push(`price is required and must be a positive number up to ${MAX_PRICE}`)
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    errors: [],
    data: {
      category: body.category as SeatCategoryValue,
      price: body.price as number,
    },
  }
}

export function validateShowPriceUpdateInput(
  body: RawShowPriceBody
): ShowPriceUpdateValidationResult {
  const errors: string[] = []
  const data: ShowPriceUpdateInput = {}

  if (body.category !== undefined) {
    if (!isValidSeatCategory(body.category)) {
      errors.push('category must be either STANDARD or PREMIUM')
    } else {
      data.category = body.category
    }
  }

  if (body.price !== undefined) {
    if (!isValidPrice(body.price)) {
      errors.push(`price must be a positive number up to ${MAX_PRICE}`)
    } else {
      data.price = body.price
    }
  }

  if (Object.keys(data).length === 0) {
    errors.push('at least one of category or price must be provided')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, errors: [], data }
}

// ==================================================
// Seat hold input validation (Phase 8)
// ==================================================

const MAX_HOLD_SEATS = 20

export interface ShowSeatIdsInput {
  showSeatIds: string[]
}

interface RawShowSeatIdsBody {
  showSeatIds?: unknown
}

export interface ShowSeatIdsValidationResult {
  valid: boolean
  errors: string[]
  data?: ShowSeatIdsInput
}

/**
 * Validate a { showSeatIds: string[] } body — shared shape used by
 * both the hold and release endpoints (Phase 8).
 *
 * Only checks FORMAT here: a non-empty array, each entry a valid
 * UUID, no duplicates, capped at a sane batch size. Whether the
 * show exists, whether each ShowSeat actually belongs to it, and
 * whether it's actually available/held-by-this-customer are all
 * ownership/state checks performed by the service layer (404/409),
 * not format checks (400) — same separation of concerns used by
 * every other *Input validator in this file.
 */
export function validateShowSeatIdsInput(body: RawShowSeatIdsBody): ShowSeatIdsValidationResult {
  const errors: string[] = []

  const raw = body.showSeatIds

  if (!Array.isArray(raw) || raw.length === 0) {
    errors.push('showSeatIds is required and must be a non-empty array')
    return { valid: false, errors }
  }

  if (raw.length > MAX_HOLD_SEATS) {
    errors.push(`showSeatIds must contain at most ${MAX_HOLD_SEATS} seats`)
  }

  const invalidEntry = raw.some((id) => !isValidUuid(id))
  if (invalidEntry) {
    errors.push('every entry in showSeatIds must be a valid UUID')
  }

  const uniqueIds = new Set(raw)
  if (uniqueIds.size !== raw.length) {
    errors.push('showSeatIds must not contain duplicate seat IDs')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    errors: [],
    data: { showSeatIds: raw as string[] },
  }
}

// ==================================================
// Booking input validation (Phase 9)
// ==================================================

const MAX_BOOKING_SEATS = 20

export interface BookingInput {
  showId: string
  showSeatIds: string[]
  holdToken: string
}

interface RawBookingBody {
  showId?: unknown
  showSeatIds?: unknown
  holdToken?: unknown
}

export interface BookingValidationResult {
  valid: boolean
  errors: string[]
  data?: BookingInput
}

/**
 * Validate a booking-creation body: { showId, showSeatIds, holdToken }.
 *
 * Deliberately narrow, matching the other *Input validators in this
 * file — only reads these three fields off the body. Anything else
 * the client sends (price, totalAmount, bookingReference, status,
 * userId, ...) is simply never looked at, so there is no code path
 * by which a client-supplied value for any of those can reach the
 * service layer. Format only (400-level) is checked here; whether
 * the show/seats/hold actually exist and are valid to book is a
 * state check the service layer performs (404/409).
 */
export function validateBookingInput(body: RawBookingBody): BookingValidationResult {
  const errors: string[] = []

  if (!isValidUuid(body.showId)) {
    errors.push('showId is required and must be a valid ID')
  }

  const rawSeatIds = body.showSeatIds
  if (!Array.isArray(rawSeatIds) || rawSeatIds.length === 0) {
    errors.push('showSeatIds is required and must be a non-empty array')
  } else {
    if (rawSeatIds.length > MAX_BOOKING_SEATS) {
      errors.push(`showSeatIds must contain at most ${MAX_BOOKING_SEATS} seats`)
    }
    if (rawSeatIds.some((id) => !isValidUuid(id))) {
      errors.push('every entry in showSeatIds must be a valid UUID')
    }
    if (new Set(rawSeatIds).size !== rawSeatIds.length) {
      errors.push('showSeatIds must not contain duplicate seat IDs')
    }
  }

  const holdToken = typeof body.holdToken === 'string' ? body.holdToken.trim() : ''
  if (typeof body.holdToken !== 'string' || holdToken.length === 0) {
    errors.push('holdToken is required and must be a non-empty string')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    errors: [],
    data: {
      showId: body.showId as string,
      showSeatIds: rawSeatIds as string[],
      holdToken,
    },
  }
}

// ==================================================
// Waitlist input validation (Phase 10)
// ==================================================

export interface WaitlistJoinInput {
  showId: string
  category: SeatCategoryValue
}

interface RawWaitlistJoinBody {
  showId?: unknown
  category?: unknown
}

export interface WaitlistJoinValidationResult {
  valid: boolean
  errors: string[]
  data?: WaitlistJoinInput
}

/**
 * Validate a { showId, category } body for joining a show's
 * category waitlist. Format only (400); whether the show exists,
 * whether the customer already has an active entry, etc. are
 * service-layer checks (404/409), same separation used everywhere
 * else in this file.
 */
export function validateWaitlistJoinInput(body: RawWaitlistJoinBody): WaitlistJoinValidationResult {
  const errors: string[] = []

  if (!isValidUuid(body.showId)) {
    errors.push('showId is required and must be a valid ID')
  }

  if (!isValidSeatCategory(body.category)) {
    errors.push('category must be either STANDARD or PREMIUM')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    errors: [],
    data: {
      showId: body.showId as string,
      category: body.category as SeatCategoryValue,
    },
  }
}
