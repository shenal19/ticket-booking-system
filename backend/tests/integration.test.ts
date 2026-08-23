import http from 'http'
import app from '../src/app'
import { prisma } from '../src/lib/prisma'

interface TestContext {
  server: http.Server
  baseUrl: string
}

let ctx: TestContext

async function request(
  endpoint: string,
  options: {
    method?: string
    token?: string
    body?: unknown
  } = {}
) {
  const url = `${ctx.baseUrl}${endpoint}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  let json: any = null
  try {
    json = await res.json()
  } catch {
    // Non-JSON response
  }

  return {
    status: res.status,
    body: json,
  }
}

// Simple test runner assertion helpers
let passed = 0
let failed = 0

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`)
    failed++
    throw new Error(message)
  } else {
    console.log(`  ✓ ${message}`)
    passed++
  }
}

async function runTest(name: string, fn: () => Promise<void>) {
  console.log(`\n▶ [TEST SUITE] ${name}`)
  try {
    await fn()
  } catch (err: any) {
    console.error(`  Test aborted due to error: ${err.message}`)
  }
}

async function startServer(): Promise<TestContext> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 5000
      resolve({
        server,
        baseUrl: `http://localhost:${port}/api`,
      })
    })
  })
}

async function main() {
  console.log('====================================================')
  console.log('🚀 TICKET BOOKING SYSTEM - COMPREHENSIVE INTEGRATION SUITE')
  console.log('====================================================')

  ctx = await startServer()
  const randomSuffix = Math.floor(Math.random() * 1000000)

  let customer1Token = ''
  let customer1Id = ''
  const customer1Email = `cust1_${randomSuffix}@test.com`

  let customer2Token = ''
  let customer2Id = ''
  const customer2Email = `cust2_${randomSuffix}@test.com`

  let organiserAToken = ''
  let organiserAId = ''
  const organiserAEmail = `org_a_${randomSuffix}@test.com`

  let organiserBToken = ''
  let organiserBId = ''
  const organiserBEmail = `org_b_${randomSuffix}@test.com`

  let venueId = ''
  let seat1Id = ''
  let seat2Id = ''
  let seat3Id = ''
  let eventId = ''
  let showId = ''
  let showSeat1Id = ''
  let showSeat2Id = ''
  let showSeat3Id = ''
  let holdToken = ''
  let bookingId = ''

  // ========================================================
  // 1. AUTHENTICATION & IDENTITY TESTS
  // ========================================================
  await runTest('Authentication & Identity Management', async () => {
    // Register Customer 1
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Customer One',
        email: customer1Email,
        password: 'Password123!',
        role: 'CUSTOMER',
      },
    })
    assert(regRes.status === 201, 'Customer 1 registered successfully (201)')
    assert(regRes.body.data.email === customer1Email, 'Customer email verified')
    customer1Id = regRes.body.data.id

    // Duplicate Registration Rejection
    const dupRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Duplicate',
        email: customer1Email,
        password: 'Password123!',
        role: 'CUSTOMER',
      },
    })
    assert(dupRes.status === 409, 'Duplicate registration rejected with 409 Conflict')

    // Login Customer 1
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: customer1Email,
        password: 'Password123!',
      },
    })
    assert(loginRes.status === 200, 'Customer 1 logged in successfully (200)')
    assert(Boolean(loginRes.body.data.token), 'JWT Token issued on login')
    customer1Token = loginRes.body.data.token

    // Invalid Password Login
    const badLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: customer1Email,
        password: 'WrongPassword!',
      },
    })
    assert(badLoginRes.status === 401, 'Invalid password rejected with 401')

    // GET /api/auth/me
    const meRes = await request('/auth/me', { token: customer1Token })
    assert(meRes.status === 200, '/auth/me returns 200 for authenticated user')
    assert(meRes.body.data.userId === customer1Id, 'Identity matches token payload')
    assert(meRes.body.data.role === 'CUSTOMER', 'Role matches CUSTOMER')

    // Register Customer 2
    const reg2Res = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Customer Two',
        email: customer2Email,
        password: 'Password123!',
        role: 'CUSTOMER',
      },
    })
    assert(reg2Res.status === 201, 'Customer 2 registered (201)')
    customer2Id = reg2Res.body.data.id

    const login2Res = await request('/auth/login', {
      method: 'POST',
      body: { email: customer2Email, password: 'Password123!' },
    })
    customer2Token = login2Res.body.data.token

    // Register Organiser A
    const regOrgARes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Organiser Alpha',
        email: organiserAEmail,
        password: 'Password123!',
        role: 'ORGANISER',
      },
    })
    assert(regOrgARes.status === 201, 'Organiser A registered (201)')
    organiserAId = regOrgARes.body.data.id

    const loginOrgARes = await request('/auth/login', {
      method: 'POST',
      body: { email: organiserAEmail, password: 'Password123!' },
    })
    organiserAToken = loginOrgARes.body.data.token

    // Register Organiser B
    const regOrgBRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Organiser Beta',
        email: organiserBEmail,
        password: 'Password123!',
        role: 'ORGANISER',
      },
    })
    assert(regOrgBRes.status === 201, 'Organiser B registered (201)')
    organiserBId = regOrgBRes.body.data.id

    const loginOrgBRes = await request('/auth/login', {
      method: 'POST',
      body: { email: organiserBEmail, password: 'Password123!' },
    })
    organiserBToken = loginOrgBRes.body.data.token
  })

  // ========================================================
  // 2. ROLE-BASED ACCESS CONTROL (RBAC) & SECURITY MATRIX
  // ========================================================
  await runTest('Role-Based Access Control (RBAC) Security Verification', async () => {
    // Unauthenticated access to /events/discover -> 401
    const unauthRes = await request('/events/discover')
    assert(unauthRes.status === 401, 'Unauthenticated request to /events/discover returns 401')

    // Customer access to /events/discover -> 200
    const custDiscoverRes = await request('/events/discover', { token: customer1Token })
    assert(custDiscoverRes.status === 200, 'CUSTOMER role access to /events/discover returns 200')

    // Organiser access to /events/discover -> 403 (Customer-only discovery)
    const orgDiscoverRes = await request('/events/discover', { token: organiserAToken })
    assert(orgDiscoverRes.status === 403, 'ORGANISER role access to /events/discover blocked with 403')

    // Customer attempt to create Venue -> 403
    const custVenueRes = await request('/venues', {
      method: 'POST',
      token: customer1Token,
      body: { name: 'Unauthorized Venue', address: '123 Fake St' },
    })
    assert(custVenueRes.status === 403, 'CUSTOMER role attempt to create Venue blocked with 403')

    // Customer attempt to create Event -> 403
    const custEventRes = await request('/events', {
      method: 'POST',
      token: customer1Token,
      body: { title: 'Unauthorized Event', description: 'desc', type: 'MOVIE' },
    })
    assert(custEventRes.status === 403, 'CUSTOMER role attempt to create Event blocked with 403')

    // Organiser attempt to create Booking -> 403
    const orgBookingRes = await request('/bookings', {
      method: 'POST',
      token: organiserAToken,
      body: { showId: '00000000-0000-0000-0000-000000000000', showSeatIds: [], holdToken: 'abc' },
    })
    assert(orgBookingRes.status === 403, 'ORGANISER role attempt to create Booking blocked with 403')
  })

  // ========================================================
  // 3. ORGANISER RESOURCE PROVISIONING & OWNERSHIP ISOLATION
  // ========================================================
  await runTest('Organiser Resource Provisioning & Ownership Isolation', async () => {
    // Organiser A creates Venue
    const venueRes = await request('/venues', {
      method: 'POST',
      token: organiserAToken,
      body: {
        name: 'Palace Cinema Hall',
        address: '742 Evergreen Terrace',
      },
    })
    assert(venueRes.status === 201, 'Organiser A created Venue (201)')
    venueId = venueRes.body.data.id

    // Organiser A creates Seats for Venue
    const s1Res = await request(`/venues/${venueId}/seats`, {
      method: 'POST',
      token: organiserAToken,
      body: { rowLabel: 'A', seatNumber: 1, category: 'STANDARD' },
    })
    assert(s1Res.status === 201, 'Created Seat A1 (STANDARD)')
    seat1Id = s1Res.body.data.id

    const s2Res = await request(`/venues/${venueId}/seats`, {
      method: 'POST',
      token: organiserAToken,
      body: { rowLabel: 'A', seatNumber: 2, category: 'STANDARD' },
    })
    assert(s2Res.status === 201, 'Created Seat A2 (STANDARD)')
    seat2Id = s2Res.body.data.id

    const s3Res = await request(`/venues/${venueId}/seats`, {
      method: 'POST',
      token: organiserAToken,
      body: { rowLabel: 'B', seatNumber: 1, category: 'PREMIUM' },
    })
    assert(s3Res.status === 201, 'Created Seat B1 (PREMIUM)')
    seat3Id = s3Res.body.data.id

    // Organiser A creates Event
    const eventRes = await request('/events', {
      method: 'POST',
      token: organiserAToken,
      body: {
        title: 'Dune: Part Two (70mm IMAX)',
        description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge.',
        type: 'MOVIE',
      },
    })
    assert(eventRes.status === 201, 'Organiser A created Event (201)')
    eventId = eventRes.body.data.id

    // Organiser A schedules Show
    const startTime = new Date(Date.now() + 86400000)
    const endTime = new Date(Date.now() + 86400000 + 10800000)

    const showRes = await request('/shows', {
      method: 'POST',
      token: organiserAToken,
      body: {
        eventId,
        venueId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
    })
    assert(showRes.status === 201, 'Organiser A scheduled Show (201)')
    showId = showRes.body.data.id

    // Organiser A configures Show Prices
    const price1Res = await request(`/shows/${showId}/prices`, {
      method: 'POST',
      token: organiserAToken,
      body: { category: 'STANDARD', price: 12.5 },
    })
    assert(price1Res.status === 201, 'Configured STANDARD price ($12.50)')

    const price2Res = await request(`/shows/${showId}/prices`, {
      method: 'POST',
      token: organiserAToken,
      body: { category: 'PREMIUM', price: 20.0 },
    })
    assert(price2Res.status === 201, 'Configured PREMIUM price ($20.00)')

    // Cross-Organiser Ownership Isolation:
    // Organiser B attempts to GET Organiser A's venue -> 404
    const crossVenueRes = await request(`/venues/${venueId}`, { token: organiserBToken })
    assert(crossVenueRes.status === 404, 'Organiser B cannot view Organiser A venue (404)')

    // Organiser B attempts to UPDATE Organiser A's event -> 404
    const crossEventRes = await request(`/events/${eventId}`, {
      method: 'PUT',
      token: organiserBToken,
      body: { title: 'Hijacked Title' },
    })
    assert(crossEventRes.status === 404, 'Organiser B cannot update Organiser A event (404)')

    // Organiser B attempts to DELETE Organiser A's show -> 404
    const crossShowRes = await request(`/shows/${showId}`, {
      method: 'DELETE',
      token: organiserBToken,
    })
    assert(crossShowRes.status === 404, 'Organiser B cannot delete Organiser A show (404)')
  })

  // ========================================================
  // 4. CUSTOMER DISCOVERY, SEAT HOLD & CONCURRENCY
  // ========================================================
  await runTest('Customer Journey: Discovery, Seat Hold & Concurrency Protection', async () => {
    // Customer 1 discovers shows for Event
    const showsRes = await request(`/shows/event/${eventId}`, { token: customer1Token })
    assert(showsRes.status === 200, 'Customer retrieved shows for event (200)')
    assert(showsRes.body.data.length > 0, 'Shows list is populated')

    // Customer 1 gets Show Seats
    const seatsRes = await request(`/show-seats/${showId}/seats`, { token: customer1Token })
    assert(seatsRes.status === 200, 'Customer retrieved show seats (200)')
    const seatsList = seatsRes.body.data
    assert(seatsList.length >= 3, 'Show seats populated from venue')

    const s1 = seatsList.find((s: any) => s.rowLabel === 'A' && s.seatNumber === 1)
    const s2 = seatsList.find((s: any) => s.rowLabel === 'A' && s.seatNumber === 2)
    const s3 = seatsList.find((s: any) => s.rowLabel === 'B' && s.seatNumber === 1)

    assert(Boolean(s1 && s2 && s3), 'Expected seats A1, A2, B1 found')
    showSeat1Id = s1.showSeatId
    showSeat2Id = s2.showSeatId
    showSeat3Id = s3.showSeatId

    // Customer 1 places Seat Hold on A1 & A2
    const holdRes = await request(`/show-seats/${showId}/hold`, {
      method: 'POST',
      token: customer1Token,
      body: {
        showSeatIds: [showSeat1Id, showSeat2Id],
      },
    })
    assert(holdRes.status === 200, 'Customer 1 held seats A1 & A2 (200)')
    assert(holdRes.body.data.length === 2, 'Two seats confirmed held')
    holdToken = holdRes.body.data[0].holdToken
    assert(Boolean(holdToken), 'holdToken issued in response')
    assert(Boolean(holdRes.body.data[0].holdExpiresAt), 'holdExpiresAt returned')

    // Concurrency Protection: Customer 2 attempts to hold seat A1 -> 409 Conflict
    const raceRes = await request(`/show-seats/${showId}/hold`, {
      method: 'POST',
      token: customer2Token,
      body: {
        showSeatIds: [showSeat1Id],
      },
    })
    assert(raceRes.status === 409, 'Concurrent hold for already-held seat blocked with 409 Conflict')

    // Customer 1 confirms Booking with valid holdToken
    const bookRes = await request('/bookings', {
      method: 'POST',
      token: customer1Token,
      body: {
        showId,
        showSeatIds: [showSeat1Id, showSeat2Id],
        holdToken,
      },
    })
    assert(bookRes.status === 201, 'Customer 1 confirmed booking (201)')
    assert(Boolean(bookRes.body.data.bookingReference), 'bookingReference generated')
    assert(bookRes.body.data.status === 'CONFIRMED', 'Status is CONFIRMED')
    assert(bookRes.body.data.totalAmount === '25.00', 'Total amount is $25.00 (2 x $12.50)')
    bookingId = bookRes.body.data.id

    // Attempting to re-book with consumed holdToken -> 409
    const rebookRes = await request('/bookings', {
      method: 'POST',
      token: customer1Token,
      body: {
        showId,
        showSeatIds: [showSeat1Id, showSeat2Id],
        holdToken,
      },
    })
    assert(rebookRes.status === 409, 'Re-booking already booked seats rejected with 409')

    // Customer 1 checks My Bookings
    const myBookingsRes = await request('/bookings/mine', { token: customer1Token })
    assert(myBookingsRes.status === 200, 'Customer retrieved booking history (200)')
    const foundBooking = myBookingsRes.body.data.find((b: any) => b.id === bookingId)
    assert(Boolean(foundBooking), 'Confirmed booking found in customer history')
  })

  // ========================================================
  // 5. WAITLIST & AUTOMATIC SEAT PROMOTION ENGINE
  // ========================================================
  await runTest('Waitlist Queueing & Automatic Seat Promotion Flow', async () => {
    // Customer 1 holds the last available seat B1 (PREMIUM)
    const holdB1 = await request(`/show-seats/${showId}/hold`, {
      method: 'POST',
      token: customer1Token,
      body: { showSeatIds: [showSeat3Id] },
    })
    assert(holdB1.status === 200, 'Customer 1 held the only PREMIUM seat B1')

    // Customer 2 joins Waitlist for PREMIUM category
    const joinWaitlistRes = await request('/waitlist', {
      method: 'POST',
      token: customer2Token,
      body: {
        showId,
        category: 'PREMIUM',
      },
    })
    assert(joinWaitlistRes.status === 201, 'Customer 2 joined waitlist for PREMIUM category (201)')
    assert(joinWaitlistRes.body.data.position === 1, 'Position is #1 in queue')
    assert(joinWaitlistRes.body.data.status === 'WAITING', 'Status is WAITING')
    const waitlistEntryId = joinWaitlistRes.body.data.id

    // Customer 2 checks My Waitlist
    const myWaitlistRes = await request('/waitlist/mine', { token: customer2Token })
    assert(myWaitlistRes.status === 200, 'Customer 2 retrieved waitlist entries (200)')
    assert(myWaitlistRes.body.data.length > 0, 'Waitlist entry is listed')

    // Customer 1 releases the held seat B1
    const releaseRes = await request(`/show-seats/${showId}/release`, {
      method: 'POST',
      token: customer1Token,
      body: { showSeatIds: [showSeat3Id] },
    })
    assert(releaseRes.status === 200, 'Customer 1 released held seat B1 (200)')

    // Customer 2 re-checks Waitlist: Waitlist auto-promotes to OFFERED
    const refreshedWaitlistRes = await request('/waitlist/mine', { token: customer2Token })
    const entryAfterRelease = refreshedWaitlistRes.body.data.find((e: any) => e.id === waitlistEntryId)
    assert(entryAfterRelease.status === 'OFFERED', 'Waitlist entry automatically promoted to OFFERED')
    assert(Boolean(entryAfterRelease.offer), 'Offer payload generated with holdToken')
    const offerToken = entryAfterRelease.offer.holdToken
    const offeredSeatId = entryAfterRelease.offer.showSeatId

    // Customer 2 books the offered seat
    const bookOfferRes = await request('/bookings', {
      method: 'POST',
      token: customer2Token,
      body: {
        showId,
        showSeatIds: [offeredSeatId],
        holdToken: offerToken,
      },
    })
    assert(bookOfferRes.status === 201, 'Customer 2 booked the offered seat (201)')

    // Check waitlist entry is now FULFILLED
    const fulfilledWaitlistRes = await request('/waitlist/mine', { token: customer2Token })
    const entryFulfilled = fulfilledWaitlistRes.body.data.find((e: any) => e.id === waitlistEntryId)
    assert(entryFulfilled.status === 'FULFILLED', 'Waitlist entry is marked FULFILLED')
  })

  // Close Server and Prisma Connection
  ctx.server.close()
  await prisma.$disconnect()

  console.log('\n====================================================')
  console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`)
  console.log('====================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err)
  process.exit(1)
})
