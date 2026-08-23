# Ticket Booking System

A production-grade, highly concurrent ticket booking platform for movies and concerts built with **React**, **Node.js/Express**, **TypeScript**, **PostgreSQL**, and **Prisma ORM**.

The system features real-time visual seat selection, atomic seat holding with TTL auto-release, concurrency protection against double-booking, a queue-based category waitlist with automatic promotion on seat release, QR code generation, and ticket confirmation emails.

---

## Table of Contents

1. [Key Features](#key-features)
2. [Tech Stack & Architecture](#tech-stack--architecture)
3. [Database Schema & Data Model](#database-schema--data-model)
4. [Security & Role-Based Access Control](#security--role-based-access-control)
5. [Customer Product Journey](#customer-product-journey)
6. [Organiser Management Portal](#organiser-management-portal)
7. [System Design Deep-Dive](#system-design-deep-dive)
   - [Seat Hold & TTL Auto-Release Mechanism](#1-seat-hold--ttl-auto-release-mechanism)
   - [Concurrency Protection Under High Demand](#2-concurrency-protection-under-high-demand)
   - [Waitlist Queue & Automatic Promotion Flow](#3-waitlist-queue--automatic-promotion-flow)
   - [QR Code Ticket Generation & Email Architecture](#4-qr-code-ticket-generation--email-architecture)
8. [API Reference](#api-reference)
9. [Getting Started & Local Setup](#getting-started--local-setup)
10. [Database Migrations & Seeding](#database-migrations--seeding)
11. [Automated Testing & Build Commands](#automated-testing--build-commands)
12. [Demonstration Scenario](#demonstration-scenario)

---

## Key Features

- **Authentication & Role Authorization**: Secure JWT authentication with strict role enforcement (`CUSTOMER`, `ORGANISER`, `ADMIN`) and complete cross-tenant ownership isolation.
- **Event & Venue Management**: Organisers create venues with custom seating layouts (`STANDARD`, `PREMIUM`), schedule movie and concert listings, and manage tier pricing.
- **Customer Discovery**: Search and filter published movies and concerts with real-time showtime listings.
- **Interactive Visual Seat Map**: Clear seat state rendering (`AVAILABLE`, `SELECTED`, `HELD`, `BOOKED`) with responsive grids for mobile, tablet, and desktop.
- **Atomic Seat Hold with TTL**: Real-time 10-minute hold window enforced via database transactions and live countdown UI timer.
- **Zero Double-Booking Guarantee**: Optimistic locking and conditional update transactions prevent concurrent collision on identical seats.
- **Intelligent Waitlist Auto-Assignment**: Category-level waiting queue automatically promotes customers with time-limited hold offers when seats are released or cancelled.
- **Digital QR Tickets**: Instant QR code generation with email delivery containing full booking breakdown and scan tokens.

---

## Tech Stack & Architecture

```
ticket-booking-system/
├── frontend/               # React + Vite + TypeScript Single Page Application
│   └── src/
│       ├── components/     # Reusable UI (Navbar, Badges, Modals, Banners)
│       ├── pages/          # Events, Shows, SeatMap, Bookings, Waitlist, OrganiserDashboard
│       ├── services/       # Centralized API client with interceptors
│       └── types/          # TypeScript contracts and models
│
├── backend/                # Express + TypeScript Modular REST API
│   ├── src/
│   │   ├── config/         # Environment variables & SMTP setup
│   │   ├── controllers/    # Thin HTTP request parsers
│   │   ├── middleware/     # JWT authentication & Role guards (RBAC)
│   │   ├── routes/         # REST endpoint declarations
│   │   ├── services/       # Domain business logic & transactions
│   │   ├── utils/          # AppError, validators, password hashing, JWT
│   │   └── scripts/        # Safe demo seed utilities
│   ├── prisma/             # Prisma schema & PostgreSQL migrations
│   └── tests/              # End-to-end integration & security test suites
```

- **Frontend**: React 19, TypeScript, Vite, CSS Grid & Flexbox (Responsive Dark Navy & Indigo Theme).
- **Backend**: Node.js, Express 5, TypeScript, TSX.
- **Database**: PostgreSQL 15+ managed via Prisma ORM.
- **Security**: Argon2/Bcrypt password hashing, JSON Web Tokens (JWT).
- **Integrations**: QRCode library, Nodemailer SMTP with HTML templates.

---

## Database Schema & Data Model

The PostgreSQL database is organized around core relational entities:

- `User`: Identity table storing credentials, names, and roles (`CUSTOMER`, `ORGANISER`, `ADMIN`).
- `Venue`: Physical location managed by an organiser.
- `Seat`: Physical venue seat (`rowLabel`, `seatNumber`, `category`: `STANDARD` / `PREMIUM`).
- `Event`: Event listing (`title`, `description`, `type`: `MOVIE` / `CONCERT`, `organiserId`).
- `Show`: Specific date and time slot linking an Event to a Venue.
- `ShowPrice`: Per-show category pricing (`showId`, `category`, `price`).
- `ShowSeat`: Show-specific seat instance tracking status (`AVAILABLE`, `HELD`, `BOOKED`), `heldBy`, `holdToken`, and `holdExpiresAt`.
- `Booking`: Confirmed reservation with unique `bookingReference`, `totalAmount`, `status`, and relations to `BookingSeat`.
- `WaitlistEntry`: Customer waitlist queue position for a show category (`WAITING`, `OFFERED`, `FULFILLED`, `EXPIRED`, `CANCELLED`).
- `WaitlistOffer`: Time-limited offer linked to a held seat for a waitlisted customer.

---

## Security & Role-Based Access Control

The platform enforces zero-trust security at the HTTP route and service layers:

| Endpoint Area | Access Level | Enforcement Rule |
| :--- | :--- | :--- |
| `GET /api/events/discover` | `CUSTOMER` Only | Returns 403 to Organisers, 401 to Unauthenticated |
| `GET /api/shows/event/:id` | `CUSTOMER` & `ORGANISER` | Public show discovery |
| `POST /api/show-seats/:id/hold` | `CUSTOMER` Only | Customer seat reservation |
| `POST /api/bookings` | `CUSTOMER` Only | Booking confirmation via hold token |
| `GET /api/bookings/mine` | `CUSTOMER` Only | Identity derived from JWT token (`userId`) |
| `POST /api/waitlist` | `CUSTOMER` Only | Join show category waitlist |
| `POST /api/venues` | `ORGANISER` Only | Venue creation |
| `POST /api/events` | `ORGANISER` Only | Event creation |
| `POST /api/shows` | `ORGANISER` Only | Show scheduling & overlap validation |
| `POST /api/shows/:id/prices` | `ORGANISER` Only | Price tier configuration |

### Ownership Isolation
Every organiser resource (`Venue`, `Event`, `Show`, `Seat`, `ShowPrice`) verifies ownership through the JWT `organiserId`. Attempting to access or mutate another organiser's resource returns a strict `404 Not Found` to prevent resource enumeration.

---

## Customer Product Journey

1. **Sign Up / Login**: Customer registers and receives an authentication token.
2. **Discover Events**: Browse curated movie and concert listings with live search and category filters.
3. **Select Showtime**: View upcoming dates, times, venue details, and ticket price ranges.
4. **Interactive Seat Map**: Choose seats from visual grid. See instant category breakdowns and live pricing totals.
5. **Place Seat Hold**: System places an atomic 10-minute hold on selected seats, issuing a secure `holdToken` and displaying a live countdown timer.
6. **Booking Confirmation**: Confirm booking with the active hold token. The transaction atomically shifts seats from `HELD` to `BOOKED` and generates a unique booking reference.
7. **Ticket Confirmation & QR Email**: Customer views confirmed ticket details with booking reference, seat coordinates, and total amount. A confirmation email with an embedded QR code is dispatched.
8. **My Bookings**: Customer views persistent booking history.
9. **Waitlist Flow**: If a desired category is sold out, customer joins the waitlist. When a seat becomes available, the customer receives an automatic reservation offer.

---

## Organiser Management Portal

- **Overview Dashboard**: Real-time metrics on total events, scheduled shows, and managed venues.
- **Venue Builder**: Create venues and configure seating grids with custom row labels, seat numbers, and categories (`STANDARD` vs `PREMIUM`).
- **Event Listings**: Create and edit movie and concert listings.
- **Show Scheduler**: Schedule shows with automatic conflict detection (prevents overlapping shows at the same venue) and seat inventory initialization.
- **Price Matrix**: Configure per-show pricing for each seat tier.

---

## System Design Deep-Dive

### 1. Seat Hold & TTL Auto-Release Mechanism
When high-demand tickets go on sale, multiple customers attempt to purchase seats simultaneously. To prevent double-booking while providing customers a fair checkout window, the system implements an atomic seat hold with Time-To-Live (TTL):
- When a customer clicks "Hold Selected Seats", `POST /api/show-seats/:showId/hold` executes an atomic database transaction.
- The transaction first evaluates a sweep query (`expireStaleHolds`) to free any seats whose `holdExpiresAt` has elapsed.
- It then executes a conditional bulk update on the requested seats:
  ```sql
  UPDATE show_seats
  SET status = 'HELD', held_by = $userId, hold_token = $token, hold_expires_at = $expiry
  WHERE id IN ($seatIds) AND show_id = $showId AND status = 'AVAILABLE';
  ```
- If the count of updated rows does not exactly match the requested count, the transaction rolls back immediately and throws a `409 Conflict`.

### 2. Concurrency Protection Under High Demand
Concurrency protection is achieved at the database row level without heavyweight external locking services:
- PostgreSQL evaluates conditional `UPDATE` statements using row-level write locks.
- If two users race for the same seat at the exact same millisecond, the first transaction acquires the row lock and updates the status to `HELD`. The second transaction's `WHERE status = 'AVAILABLE'` clause fails to match, returning an update count of `0`.
- The application detects this delta and immediately informs the second user with a clean, actionable error message.

### 3. Waitlist Queue & Automatic Promotion Flow
For popular events, seats often become available due to checkout abandonment or reservation cancellations:
- Customers join a FIFO queue for a specific show and category (`WaitlistEntry`).
- When a hold expires or a hold is explicitly released (`releaseShowSeats`), the system triggers `promoteWaitlistIfPossible`.
- It finds the earliest customer in `WAITING` status and atomically claims the freed seat on their behalf, transitioning their status to `OFFERED` with a time-limited `holdToken`.
- The customer can directly confirm their offered seat from the "My Waitlist" screen.

### 4. QR Code Ticket Generation & Email Architecture
- Upon successful booking commit, the system asynchronously generates a high-density QR code embedding the booking reference.
- A styled HTML email with the QR code attached as an inline `CID` attachment is sent via Nodemailer.
- Crucially, email/QR generation occurs **after** the database transaction has committed. If SMTP is temporarily unreachable, the booking remains completely intact and successful.

---

## API Reference

### Auth Routes (`/api/auth`)
- `POST /register` — Register customer or organiser (`{ name, email, password, role }`).
- `POST /login` — Authenticate user and receive JWT token (`{ email, password }`).
- `GET /me` — Retrieve current authenticated user identity.

### Customer Event & Show Discovery (`/api`)
- `GET /events/discover` — Customer event discovery (Requires `CUSTOMER`).
- `GET /shows/event/:eventId` — Retrieve shows for an event.
- `GET /shows/:showId` — Retrieve single show details.
- `GET /show-seats/:showId/seats` — Visual seat grid layout with availability status.
- `POST /show-seats/:showId/hold` — Hold seats with TTL (`{ showSeatIds: [...] }`).
- `POST /show-seats/:showId/release` — Release held seats (`{ showSeatIds: [...] }`).

### Bookings (`/api/bookings`)
- `POST /` — Complete ticket booking (`{ showId, showSeatIds, holdToken }`).
- `GET /mine` — Retrieve authenticated customer's booking history.
- `PATCH /:bookingId/cancel` — Cancel confirmed booking, release seats, and trigger waitlist promotion.

### Waitlist (`/api/waitlist`)
- `POST /` — Join waitlist (`{ showId, category }`).
- `GET /mine` — List customer's waitlist entries and active offers.
- `DELETE /:waitlistEntryId` — Cancel waitlist entry.

### Admin Management (`/api/admin` - Requires `ADMIN` Role)
- `GET /overview` — Platform metrics, user distribution, inventory, revenue, and active waitlist count.
- `GET /users` — System user directory with role breakdown.
- `GET /bookings` — Global audit list of all platform bookings.

### System Health
- `GET /api/health` — Unauthenticated liveness check.

### Organiser Management (`/api`)
- `GET /events`, `POST /events`, `PUT /events/:id`, `DELETE /events/:id` — Manage events.
- `GET /venues`, `POST /venues`, `PUT /venues/:id`, `DELETE /venues/:id` — Manage venues.
- `GET /venues/:venueId/seats`, `POST /venues/:venueId/seats`, `DELETE /venues/:venueId/seats/:id` — Configure seats.
- `GET /shows`, `POST /shows`, `PUT /shows/:id`, `DELETE /shows/:id` — Schedule shows.
- `GET /shows/:id/prices`, `POST /shows/:id/prices`, `DELETE /shows/:id/prices/:priceId` — Configure pricing.

---

## Getting Started & Local Setup

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm

### 1. Clone & Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

Copy the example environment file:

```bash
# From project root
Copy-Item .env.example .env

# Configure backend/.env
cd backend
Copy-Item ../.env.example .env
```

Ensure your `DATABASE_URL` in `backend/.env` points to your PostgreSQL instance:
```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/ticket_booking"
PORT=5000
JWT_SECRET="your_secret_key_here"
FRONTEND_URL="http://localhost:5173"
SEAT_HOLD_DURATION_MINUTES=10
WAITLIST_OFFER_DURATION_MINUTES=15
```

---

## Database Migrations & Seeding

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Seed initial demo data (Organiser, Customer, Admin, Venues, Seats, Shows, Prices)
npm run seed
```

---

## Automated Testing & Build Commands

### Run Integration Test Suite
Executes **83 end-to-end automated tests** covering authentication, RBAC authorization, cross-organiser ownership isolation, seat holds, concurrency race conditions, bookings, booking cancellation with seat release, waitlist auto-promotion, and Admin operations:

```bash
cd backend
npm test
```

### Production Build Verification

```bash
# Build Backend
cd backend
npm run build

# Build Frontend
cd ../frontend
npm run build
```

Both builds compile with **0 TypeScript errors**.

---

## Demonstration Scenario

1. **Start the Backend API Server**:
   ```bash
   cd backend
   npm run dev
   ```
2. **Start the Frontend Application**:
   ```bash
   cd frontend
   npm run dev
   ```
3. **Test Customer Booking & Cancellation Flow**:
   - Navigate to `http://localhost:5173`.
   - Login as Customer:
     - **Email**: `customer@ticketbooking.com`
     - **Password**: `Password123!`
   - Select **Interstellar: IMAX Special Presentation**.
   - Pick the showtime and click **Select Seats**.
   - Click available seats on the interactive seat grid and click **Hold Selected Seats**.
   - Watch the live countdown timer activate.
   - Click **Confirm & Book Tickets** to generate a confirmed booking reference and view the ticket summary.
   - Click **My Bookings** to review the reservation.
   - Click **Cancel Booking**, review the confirmation prompt, and confirm cancellation to release seats.
4. **Test Organiser Management Portal**:
   - Logout and login as Organiser:
     - **Email**: `organiser@ticketbooking.com`
     - **Password**: `Password123!`
   - View overview metrics, create new venues, configure seats, schedule shows, and manage pricing.
5. **Test Admin Console**:
   - Logout and login as Admin:
     - **Email**: `admin@ticketbooking.com`
     - **Password**: `Password123!`
   - Open **Admin Console** to view global platform KPIs, user directory, and platform bookings.

---

## Submission

- **Repository**: https://github.com/shenal19/ticket-booking-system
- **System Design**: [docs/system-design.md](docs/system-design.md)
- **Deployment Guide**: [docs/deployment.md](docs/deployment.md)
- **Final Audit Matrix**: [docs/final-audit.md](docs/final-audit.md)
- **Live Application**: `<PLACEHOLDER UNTIL DEPLOYED>`
- **Backend API**: `<PLACEHOLDER UNTIL DEPLOYED>`

---

## License

This project is developed for professional evaluation and demonstration.


