# System Design: Ticket Booking Engine

## 1. Architecture Overview & Data Model
The platform guarantees transaction consistency, concurrency safety, and zero double-booking using **Node.js/Express**, **PostgreSQL**, and **Prisma ORM**.

The relational schema centers around:
- `ShowSeat`: Physical seat instance per show with lifecycle status (`AVAILABLE`, `HELD`, `BOOKED`), `heldBy` (Customer UUID), `holdToken` (cryptographic hex token), and `holdExpiresAt` (timestamp).
- `Booking`: Confirmed reservation with unique `bookingReference` and `totalAmount`, mapped to `BookingSeat`.
- `WaitlistEntry`: FIFO queue entry per show and category (`WAITING`, `OFFERED`, `FULFILLED`, `EXPIRED`, `CANCELLED`).
- `WaitlistOffer`: Time-limited offer linking a held seat to a waitlisted customer.

```
[AVAILABLE] --(holdSeats)--> [HELD] --(createBooking)--> [BOOKED]
     ^                         |                            |
     |---(expireStaleHolds)----+                    (cancelBooking)
     |---(releaseHoldSeats)----+                            |
     +------------------------------------------------------+
```

---

## 2. Seat Hold & TTL Expiry
To prevent inventory starvation, seat holds use a configurable Time-To-Live (default: 10 minutes):
1. **Hold Request**: `POST /api/show-seats/:showId/hold` checks requested seats within a Prisma transaction (`$transaction`).
2. **Lazy Expiration (`expireStaleHolds`)**: Rather than relying on fragile cron intervals, every read/write show-seat operation sweeps stale holds before querying:
   $$\text{WHERE status = 'HELD' AND holdExpiresAt} < \text{NOW()}$$
   Expired rows revert to `AVAILABLE`, resetting `heldBy`, `holdToken`, and `holdExpiresAt`.
3. **Hold Token Generation**: On a successful hold, a cryptographically secure 256-bit random hex token is issued and returned to the client.

---

## 3. Concurrency Protection & Row-Level Locking
Zero double-booking is enforced at the database level via PostgreSQL atomic conditional updates within interactive database transactions:

```sql
UPDATE show_seats
SET status = 'HELD', held_by = $userId, hold_token = $token, hold_expires_at = $expiry
WHERE id IN ($seatIds) AND show_id = $showId AND status = 'AVAILABLE';
```

### Why This Prevents Double Booking:
- PostgreSQL acquires exclusive row-level write locks during evaluation of the `UPDATE` statement.
- If two transactions race for seat $S_1$ simultaneously, the first acquires the lock and transitions $S_1$ from `AVAILABLE` to `HELD`.
- When the second transaction acquires the row lock, its `WHERE status = 'AVAILABLE'` predicate evaluates to false.
- The affected row count returned by PostgreSQL (`result.count`) will be less than the requested seat count.
- The application detects this mismatch, rolls back the transaction entirely, and raises a `409 Conflict` error without partial holds.

---

## 4. Booking Confirmation Transaction Boundary
Finalizing a reservation (`POST /api/bookings`) executes inside a single ACID transaction:
1. Validates show existence and fetches customer details.
2. Asserts all requested seats are `HELD`, `heldBy == req.user.userId`, `holdToken == input.holdToken`, and $\text{holdExpiresAt} > \text{NOW()}$.
3. Atomically updates seat status from `HELD` to `BOOKED`.
4. Creates `Booking` and `BookingSeat` records with unique alphanumeric reference (`TKT-XXXXXXXX`).
5. Reconciles any linked `WaitlistOffer` records (`status = 'ACCEPTED'`) and sets `WaitlistEntry` to `FULFILLED`.

**Post-Commit Side Effects**: QR generation and SMTP ticket delivery run asynchronously **after** the transaction commits. Failure in email transmission never invalidates a confirmed database booking.

---

## 5. Booking Cancellation & Waitlist Engine
When a customer cancels a confirmed booking (`PATCH /api/bookings/:id/cancel`):
1. Customer identity is derived strictly from the JWT token; cross-customer cancellation is blocked (404/403).
2. Inside an atomic transaction, the booking is marked `CANCELLED`.
3. Associated `ShowSeat` records are reset to `AVAILABLE`.
4. The system executes `promoteWaitlistIfPossible(tx, showId, category)` for all affected seat tiers.

### FIFO Auto-Assignment:
- Waitlist entries are ordered strictly by `position ASC` and `createdAt ASC`.
- The engine finds the earliest customer in `WAITING` status and claims the freed seat atomically (`status = 'HELD'`, `heldBy = waitlistUserId`).
- A `WaitlistOffer` is created with a dedicated offer TTL (default: 15 minutes).
- If the waitlisted customer accepts within the window, the booking completes. If the offer expires without confirmation, `expireStaleHolds` marks the offer `EXPIRED` and promotes the next waiting user.
