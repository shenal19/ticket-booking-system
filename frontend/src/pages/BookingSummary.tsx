import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '../services/api'

interface HeldShowSeat {
  showSeatId: string
  seatId: string
  rowLabel: string
  seatNumber: number
  category: string
  status: string
  holdToken: string
  holdExpiresAt: string
}

interface BookingSeatView {
  showSeatId: string
  rowLabel: string
  seatNumber: number
  category: string
  price: string
}

export interface BookingView {
  id: string
  bookingReference: string
  showId: string
  status: string
  totalAmount: string
  seats: BookingSeatView[]
  createdAt: string
}

interface CreateBookingResponse {
  success: boolean
  message: string
  data: BookingView
}

interface ReleaseSeatsResponse {
  success: boolean
  message: string
  data: unknown
}

interface BookingSummaryProps {
  showId: string
  eventTitle: string
  heldSeats: HeldShowSeat[]
  onBack: () => void
  onSuccess: (booking: BookingView) => void
}

function formatSeconds(totalSeconds: number) {
  const clamped = Math.max(0, totalSeconds)
  const minutes = Math.floor(clamped / 60)
  const seconds = clamped % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function BookingSummary({
  showId,
  eventTitle,
  heldSeats,
  onBack,
  onSuccess,
}: BookingSummaryProps) {
  // All seats in a single hold response share the same token and
  // expiry — see backend show-seat.service.ts holdSeats(), which
  // issues one holdToken/holdExpiresAt per call and applies it to
  // every requested seat atomically.
  const holdToken = heldSeats[0]?.holdToken ?? ''
  const holdExpiresAt = heldSeats[0]?.holdExpiresAt ?? ''

  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.floor(
      (new Date(holdExpiresAt).getTime() - Date.now()) / 1000,
    ),
  )

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [releasing, setReleasing] = useState(false)

  // React state updates aren't synchronous, so two clicks fired in
  // the same tick could both read submitting=false before either
  // re-render lands. A ref is checked/set synchronously, so it's
  // the actual guard against a duplicate POST /bookings; `submitting`
  // state still drives the UI (disabling/labelling the button).
  const submittingRef = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(
        Math.floor(
          (new Date(holdExpiresAt).getTime() - Date.now()) /
            1000,
        ),
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [holdExpiresAt])

  const expired = secondsLeft <= 0

  async function handleBack() {
    // Only release the hold if it hasn't already expired — a
    // release call against an already-expired hold is rejected by
    // the backend (expireStaleHolds() will have already flipped
    // those rows back to AVAILABLE, so the release's ownership
    // check no longer matches), and that failure isn't something
    // the user needs to see on their way back to seat selection.
    if (!expired) {
      setReleasing(true)

      try {
        await apiRequest<ReleaseSeatsResponse>(
          `/show-seats/${showId}/release`,
          {
            method: 'POST',
            body: JSON.stringify({
              showSeatIds: heldSeats.map(
                (seat) => seat.showSeatId,
              ),
            }),
          },
        )
      } catch {
        // Non-fatal — the hold will simply expire on its own.
        // Don't block navigation on this.
      } finally {
        setReleasing(false)
      }
    }

    onBack()
  }

  async function handleConfirm() {
    if (submittingRef.current || expired) {
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    setError('')

    try {
      const response =
        await apiRequest<CreateBookingResponse>(
          '/bookings',
          {
            method: 'POST',
            body: JSON.stringify({
              showId,
              showSeatIds: heldSeats.map(
                (seat) => seat.showSeatId,
              ),
              holdToken,
            }),
          },
        )

      // Hand off to the parent, which swaps this page out for
      // Confirmation — the component unmounts, so there's no
      // "re-enable the button" path that could allow a second
      // POST /bookings for the same hold.
      onSuccess(response.data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to complete booking',
      )
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <main className="booking-summary-page">
      <div className="booking-summary-header">
        <button
          type="button"
          className="back-button"
          onClick={handleBack}
          disabled={releasing || submitting}
        >
          ← Back to Seat Map
        </button>

        <h1>Booking Summary</h1>

        <p>{eventTitle}</p>
      </div>

      <div className="booking-summary-card">
        <h2>Selected Seats</h2>

        <ul className="booking-seat-list">
          {heldSeats.map((seat) => (
            <li key={seat.showSeatId}>
              <span>
                {seat.rowLabel}
                {seat.seatNumber}
              </span>

              <span className="seat-category">
                {seat.category}
              </span>
            </li>
          ))}
        </ul>

        <div className="booking-price-note">
          Price calculated at checkout
        </div>

        <div
          className={
            expired
              ? 'hold-timer expired'
              : 'hold-timer'
          }
        >
          {expired
            ? 'Your seat hold has expired'
            : `Hold expires in ${formatSeconds(secondsLeft)}`}
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {expired ? (
          <p className="hold-expired-message">
            These seats are no longer reserved for you.
            Please go back and select your seats again.
          </p>
        ) : (
          <button
            type="button"
            className="confirm-booking-button"
            disabled={submitting}
            onClick={handleConfirm}
          >
            {submitting
              ? 'Confirming...'
              : 'Confirm Booking'}
          </button>
        )}
      </div>
    </main>
  )
}

export default BookingSummary
