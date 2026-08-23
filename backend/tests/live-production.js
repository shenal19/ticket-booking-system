const BASE_URL = 'https://ticket-booking-backend-l5q1.onrender.com/api';

async function api(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch (e) {}
  return { status: res.status, body: json };
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    failed++;
    throw new Error(message);
  } else {
    console.log(`  ✓ ${message}`);
    passed++;
  }
}

async function runLiveTests() {
  console.log('=================================================================');
  console.log('🌐 PRODUCTION LIVE END-TO-END TEST SUITE');
  console.log(`🎯 Target API: ${BASE_URL}`);
  console.log('=================================================================\n');

  // 1. HEALTH CHECK
  console.log('▶ [1/5] Health Check Liveness');
  const healthRes = await api('/health');
  assert(healthRes.status === 200, 'GET /api/health returned HTTP 200');
  assert(healthRes.body.success === true, 'Health check reports success: true');
  assert(healthRes.body.message.includes('running'), 'Health check reports API is running');

  // 2. AUTHENTICATION & SECURITY
  console.log('\n▶ [2/5] Authentication & Role-Based Access Control (RBAC) Security');
  
  // Unauthenticated requests rejected
  const unauthRes = await api('/events/discover');
  assert(unauthRes.status === 401, 'Unauthenticated request to /events/discover returns 401');

  // Customer Login
  const custLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'customer@ticketbooking.com', password: 'Password123!' }
  });
  assert(custLogin.status === 200, 'Customer login succeeded with 200');
  assert(custLogin.body.data.user.role === 'CUSTOMER', 'Customer role verified');
  const customerToken = custLogin.body.data.token;

  // Organiser Login
  const orgLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'organiser@ticketbooking.com', password: 'Password123!' }
  });
  assert(orgLogin.status === 200, 'Organiser login succeeded with 200');
  assert(orgLogin.body.data.user.role === 'ORGANISER', 'Organiser role verified');
  const organiserToken = orgLogin.body.data.token;

  // Admin Login
  const adminLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'admin@ticketbooking.com', password: 'Password123!' }
  });
  assert(adminLogin.status === 200, 'Admin login succeeded with 200');
  assert(adminLogin.body.data.user.role === 'ADMIN', 'Admin role verified');

  // RBAC Security: Customer cannot access organiser/admin endpoints
  const custForbiddenOrg = await api('/venues', { method: 'POST', token: customerToken, body: { name: 'Test' } });
  assert(custForbiddenOrg.status === 403, 'Customer blocked from creating venue (403 Forbidden)');

  const custForbiddenAdmin = await api('/admin/overview', { token: customerToken });
  assert(custForbiddenAdmin.status === 403, 'Customer blocked from admin overview (403 Forbidden)');

  // RBAC Security: Organiser cannot access customer booking/waitlist endpoints
  const orgForbiddenBook = await api('/bookings', { method: 'POST', token: organiserToken, body: {} });
  assert(orgForbiddenBook.status === 403, 'Organiser blocked from booking creation (403 Forbidden)');

  // 3. ORGANISER RESOURCE MANAGEMENT FLOW
  console.log('\n▶ [3/5] Organiser Lifecycle: Venue, Seats, Event, Show & Pricing');
  
  // Create Venue
  const venueTimestamp = Date.now();
  const venueRes = await api('/venues', {
    method: 'POST',
    token: organiserToken,
    body: { name: `Live Arena ${venueTimestamp}`, address: '456 Production Blvd' }
  });
  assert(venueRes.status === 201, 'Organiser created venue with 201');
  const venueId = venueRes.body.data.id;

  // Create Seats for Venue individually
  const s1 = await api(`/venues/${venueId}/seats`, {
    method: 'POST',
    token: organiserToken,
    body: { rowLabel: 'A', seatNumber: 1, category: 'STANDARD' }
  });
  assert(s1.status === 201, 'Created Seat A1 (STANDARD)');

  const s2 = await api(`/venues/${venueId}/seats`, {
    method: 'POST',
    token: organiserToken,
    body: { rowLabel: 'A', seatNumber: 2, category: 'STANDARD' }
  });
  assert(s2.status === 201, 'Created Seat A2 (STANDARD)');

  const s3 = await api(`/venues/${venueId}/seats`, {
    method: 'POST',
    token: organiserToken,
    body: { rowLabel: 'B', seatNumber: 1, category: 'PREMIUM' }
  });
  assert(s3.status === 201, 'Created Seat B1 (PREMIUM)');

  const s4 = await api(`/venues/${venueId}/seats`, {
    method: 'POST',
    token: organiserToken,
    body: { rowLabel: 'B', seatNumber: 2, category: 'PREMIUM' }
  });
  assert(s4.status === 201, 'Created Seat B2 (PREMIUM)');

  // Create Event
  const eventRes = await api('/events', {
    method: 'POST',
    token: organiserToken,
    body: {
      title: `Live Production Premiere ${venueTimestamp}`,
      description: 'A live production verification event',
      type: 'MOVIE'
    }
  });
  assert(eventRes.status === 201, 'Organiser created movie event with 201');
  const eventId = eventRes.body.data.id;

  // Schedule Show
  const startTime = new Date(Date.now() + 86400000).toISOString();
  const endTime = new Date(Date.now() + 86400000 + 7200000).toISOString();
  const showRes = await api('/shows', {
    method: 'POST',
    token: organiserToken,
    body: { eventId, venueId, startTime, endTime }
  });
  assert(showRes.status === 201, 'Organiser scheduled show with 201');
  const showId = showRes.body.data.id;

  // Configure Tiered Pricing
  const price1 = await api(`/shows/${showId}/prices`, {
    method: 'POST',
    token: organiserToken,
    body: { category: 'STANDARD', price: 12.50 }
  });
  assert(price1.status === 201, 'Organiser configured STANDARD price ($12.50)');

  const price2 = await api(`/shows/${showId}/prices`, {
    method: 'POST',
    token: organiserToken,
    body: { category: 'PREMIUM', price: 22.00 }
  });
  assert(price2.status === 201, 'Organiser configured PREMIUM price ($22.00)');

  // 4. CUSTOMER JOURNEY: DISCOVERY, HOLD, CONCURRENCY, BOOKING & CANCELLATION
  console.log('\n▶ [4/5] Customer Journey: Discovery, Seat Map, Hold, Booking & Cancellation');

  // Event discovery
  const discoverRes = await api('/events/discover', { token: customerToken });
  assert(discoverRes.status === 200, 'Customer browsed discoverable events');
  assert(discoverRes.body.data.some(e => e.id === eventId), 'Newly created live event found in discovery');

  // Seat map inspection
  const seatMapRes = await api(`/show-seats/${showId}/seats`, { token: customerToken });
  assert(seatMapRes.status === 200, 'Customer fetched seat map for show');
  const seats = seatMapRes.body.data;
  assert(seats.length === 4, 'Visual seat map returns all 4 seats');
  const seatA1 = seats.find(s => s.rowLabel === 'A' && s.seatNumber === 1);
  const seatA2 = seats.find(s => s.rowLabel === 'A' && s.seatNumber === 2);
  assert(seatA1.status === 'AVAILABLE', 'Seat A1 is initially AVAILABLE');

  // Register & Login a second customer for concurrency and waitlist testing
  const cust2Email = `customer2_${venueTimestamp}@ticketbooking.com`;
  const cust2Reg = await api('/auth/register', {
    method: 'POST',
    body: { name: 'Customer Two', email: cust2Email, password: 'Password123!', role: 'CUSTOMER' }
  });
  assert(cust2Reg.status === 201, 'Registered second customer for concurrency testing');

  const cust2Login = await api('/auth/login', {
    method: 'POST',
    body: { email: cust2Email, password: 'Password123!' }
  });
  assert(cust2Login.status === 200, 'Second customer logged in successfully');
  const customer2Token = cust2Login.body.data.token;

  // Customer 1 places a seat hold on Seat A1 via /show-seats/:showId/hold
  const holdRes = await api(`/show-seats/${showId}/hold`, {
    method: 'POST',
    token: customerToken,
    body: { showSeatIds: [seatA1.showSeatId] }
  });
  assert(holdRes.status === 200, 'Customer 1 placed seat hold on Seat A1 (10-min TTL)');
  const holdData = Array.isArray(holdRes.body.data) ? holdRes.body.data[0] : holdRes.body.data;
  assert(Boolean(holdData.holdToken), 'Hold token issued');
  const holdToken = holdData.holdToken;

  // Concurrency Protection: Customer 2 attempts to hold the same Seat A1 simultaneously
  const conflictRes = await api(`/show-seats/${showId}/hold`, {
    method: 'POST',
    token: customer2Token,
    body: { showSeatIds: [seatA1.showSeatId] }
  });
  assert(conflictRes.status === 409, 'Customer 2 received 409 Conflict when attempting to hold already held seat');

  // Complete Booking for Customer 1
  const bookingRes = await api('/bookings', {
    method: 'POST',
    token: customerToken,
    body: { showId, holdToken, showSeatIds: [seatA1.showSeatId] }
  });
  assert(bookingRes.status === 201, 'Customer 1 confirmed booking with 201');
  assert(bookingRes.body.data.status === 'CONFIRMED', 'Booking status is CONFIRMED');
  assert(Boolean(bookingRes.body.data.bookingReference), 'Booking reference generated (TKT-...)');
  assert(bookingRes.body.data.totalAmount === '12.50', 'Total amount is $12.50 (STANDARD price)');
  assert(bookingRes.body.data.seats.length === 1, 'Booking contains 1 confirmed seat');
  const bookingId = bookingRes.body.data.id;

  // View 'My Bookings'
  const myBookingsRes = await api('/bookings/mine', { token: customerToken });
  assert(myBookingsRes.status === 200, 'Customer fetched My Bookings history');
  assert(myBookingsRes.body.data.some(b => b.id === bookingId), 'New booking present in My Bookings');

  // 5. WAITLIST & AUTOMATIC SEAT REALLOCATION ON CANCELLATION FLOW
  console.log('\n▶ [5/5] Waitlist Queueing & Cancellation Auto-Promotion Flow');

  // Book remaining STANDARD seat A2 so STANDARD category is fully booked
  const holdA2 = await api(`/show-seats/${showId}/hold`, {
    method: 'POST',
    token: customerToken,
    body: { showSeatIds: [seatA2.showSeatId] }
  });
  const holdA2Data = Array.isArray(holdA2.body.data) ? holdA2.body.data[0] : holdA2.body.data;
  await api('/bookings', {
    method: 'POST',
    token: customerToken,
    body: { showId, holdToken: holdA2Data.holdToken, showSeatIds: [seatA2.showSeatId] }
  });

  // Customer 2 joins waitlist for STANDARD category
  const waitlistRes = await api('/waitlist', {
    method: 'POST',
    token: customer2Token,
    body: { showId, category: 'STANDARD' }
  });
  assert(waitlistRes.status === 201, 'Customer 2 joined waitlist for STANDARD category');
  assert(waitlistRes.body.data.status === 'WAITING', 'Waitlist status is WAITING');

  // Customer 1 cancels their booking for Seat A1
  const cancelRes = await api(`/bookings/${bookingId}/cancel`, {
    method: 'PATCH',
    token: customerToken
  });
  assert(cancelRes.status === 200, 'Customer 1 successfully cancelled booking');
  assert(cancelRes.body.data.status === 'CANCELLED', 'Booking status updated to CANCELLED');

  // Check Customer 2 waitlist status -> Should automatically be promoted to OFFERED
  const waitlistMineRes = await api('/waitlist/mine', { token: customer2Token });
  assert(waitlistMineRes.status === 200, 'Customer 2 retrieved waitlist entries');
  const offeredEntry = waitlistMineRes.body.data.find(w => w.showId === showId);
  assert(offeredEntry.status === 'OFFERED', 'Waitlist entry was automatically PROMOTED to OFFERED on seat cancellation');
  assert(Boolean(offeredEntry.offer), 'Time-limited offer received');
  const offer = offeredEntry.offer;
  assert(Boolean(offer.holdToken), 'Offer includes held seat token for instant booking');

  // Customer 2 completes booking using the waitlist promotion offer
  const waitlistBookRes = await api('/bookings', {
    method: 'POST',
    token: customer2Token,
    body: { showId, holdToken: offer.holdToken, showSeatIds: [offer.showSeatId] }
  });
  assert(waitlistBookRes.status === 201, 'Promoted waitlist customer successfully completed booking!');
  assert(waitlistBookRes.body.data.status === 'CONFIRMED', 'Promoted booking is CONFIRMED');

  console.log('\n=================================================================');
  console.log(`🎉 LIVE PRODUCTION VERIFICATION COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log('=================================================================');
}

runLiveTests().catch(err => {
  console.error('Fatal live test failure:', err);
  process.exit(1);
});