# Deployment Guide: Ticket Booking System

This guide outlines step-by-step instructions for deploying the **Ticket Booking System** to production-ready cloud platforms (e.g., **Vercel** for the frontend, **Render / Railway** for the backend, and **Supabase / Neon / PostgreSQL** for the database).

---

## Architecture Overview

```
[ Frontend (React + Vite) ]  -->  [ Backend REST API (Node/Express) ]  -->  [ PostgreSQL DB (Prisma) ]
        (Vercel)                             (Render / Railway)                 (Supabase / Neon)
```

---

## 1. Managed PostgreSQL Database Setup

1. Create a PostgreSQL instance on [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app).
2. Copy the pooled connection string formatted as:
   ```
   postgresql://postgres:<PASSWORD>@<HOST>:<PORT>/<DATABASE>?sslmode=require
   ```

---

## 2. Backend Deployment (Render / Railway)

### Step 1: Create Web Service
1. Connect your GitHub repository to Render/Railway.
2. Set Root Directory to `backend`.
3. Set Environment to `Node`.
4. Set Build Command:
   ```bash
   npm install && npx prisma generate && npm run build
   ```
5. Set Start Command:
   ```bash
   npm start
   ```

### Step 2: Configure Backend Environment Variables
Add the following variables in the provider's dashboard:

| Variable | Value / Description | Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `PORT` | Web server port (Render provides automatically) | `5000` |
| `NODE_ENV` | Environment mode | `production` |
| `JWT_SECRET` | 64+ char random secret key | `super_secret_jwt_random_key_production_123!` |
| `JWT_EXPIRES_IN` | Token expiration duration | `1h` |
| `FRONTEND_URL` | Deployed Frontend URL for CORS | `https://your-app.vercel.app` |
| `SEAT_HOLD_DURATION_MINUTES` | Hold TTL in minutes | `10` |
| `WAITLIST_OFFER_DURATION_MINUTES` | Waitlist offer TTL in minutes | `15` |
| `SMTP_HOST` | Optional SMTP server host | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `465` |
| `SMTP_SECURE` | SSL connection flag | `true` |
| `SMTP_USER` | SMTP username/email | `notifications@yourdomain.com` |
| `SMTP_PASSWORD` | App-specific password | `xxxx-xxxx-xxxx-xxxx` |
| `SMTP_FROM` | From sender header | `Ticket Booking <no-reply@yourdomain.com>` |

### Step 3: Run Database Migrations & Initial Seed
From your local terminal connected to the production database or via the Render shell:
```bash
cd backend
npx prisma migrate deploy
npm run seed
```

---

## 3. Frontend Deployment (Vercel)

### Step 1: Import Project
1. In the Vercel dashboard, import the repository.
2. Select Root Directory as `frontend`.
3. Framework Preset: **Vite**.
4. Build Command: `npm run build`.
5. Output Directory: `dist`.

### Step 2: Configure Environment Variables
Add the following environment variable:

| Variable | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://your-backend.onrender.com/api` | Base URL pointing to deployed backend API |

### Step 3: Deploy
Trigger deployment. Vercel will build the optimized production bundle.

---

## 4. Verification & Health Check

1. **Verify Backend Liveness**:
   ```bash
   curl https://your-backend.onrender.com/api/health
   # Response: {"success":true,"message":"Ticket Booking System API is running"}
   ```
2. **Verify CORS**:
   Open browser console on `https://your-app.vercel.app` and confirm network requests to `/api/events/discover` succeed with status 200 without CORS errors.
3. **Verify Demo Accounts**:
   - Customer: `customer@ticketbooking.com` / `Password123!`
   - Organiser: `organiser@ticketbooking.com` / `Password123!`
   - Admin: `admin@ticketbooking.com` / `Password123!`
