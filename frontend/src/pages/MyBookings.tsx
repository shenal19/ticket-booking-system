import { useEffect, useState } from 'react'
import { apiRequest } from '../services/api'
import type { ApiResponse, BookingItem } from '../types'

interface MyBookingsProps {
  onBrowseEvents: () => void
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function MyBookings({ onBrowseEvents }: MyBookingsProps) {
  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Cancellation Modal State
  const [cancellingBooking, setCancellingBooking] = useState<BookingItem | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelError, setCancelError] = useState('')

  async function loadBookings() {
    setLoading(true)
    setError('')

    try {
      const response = await apiRequest<ApiResponse<BookingItem[]>>('/bookings/mine')
      setBookings(response.data || [])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load bookings',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
  }, [])

  async function handleConfirmCancel() {
    if (!cancellingBooking) return

    setCancelLoading(true)
    setCancelError('')

    try {
      await apiRequest<ApiResponse<BookingItem>>(
        `/bookings/${cancellingBooking.id}/cancel`,
        {
          method: 'PATCH',
        },
      )

      const ref = cancellingBooking.bookingReference
      setCancellingBooking(null)
      setSuccessMessage(`Booking ${ref} was successfully cancelled. Seats have been released.`)
      setTimeout(() => setSuccessMessage(''), 5000)

      await loadBookings()
    } catch (err) {
      setCancelError(
        err instanceof Error ? err.message : 'Failed to cancel booking. Please try again.',
      )
    } finally {
      setCancelLoading(false)
    }
  }

  return (
    <main className="bookings-page">
      <div className="bookings-header">
        <h1>My Bookings</h1>
        <p>Review your confirmed reservations, ticket details, and manage cancellations.</p>
      </div>

      {successMessage && (
        <div className="success-message alert-banner" style={{ marginBottom: '24px' }}>
          <p>✓ {successMessage}</p>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <p>Loading your booking history...</p>
        </div>
      )}

      {!loading && error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && bookings.length === 0 && (
        <div className="empty-state">
          <h2>No bookings found</h2>
          <p>You haven't booked any tickets yet.</p>
          <button
            type="button"
            className="primary-btn"
            style={{ marginTop: '16px' }}
            onClick={onBrowseEvents}
          >
            Explore Events & Shows
          </button>
        </div>
      )}

      {!loading && !error && bookings.length > 0 && (
        <div className="bookings-list">
          {bookings.map((booking) => {
            const isConfirmed = booking.status.toUpperCase() === 'CONFIRMED'
            return (
              <article key={booking.id} className="booking-card">
                <div className="booking-card-header">
                  <div className="booking-ref-block">
                    <span className="detail-label">REFERENCE</span>
                    <strong className="booking-ref-code">{booking.bookingReference}</strong>
                  </div>

                  <div className="booking-status-block">
                    <span
                      className={`status-pill ${
                        isConfirmed ? 'confirmed' : 'cancelled'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>
                </div>

                <div className="booking-card-body">
                  <div className="booking-main-info">
                    <h2>{booking.show?.event?.title || 'Event Booking'}</h2>
                    <div className="booking-meta">
                      <span>
                        🏛️ {booking.show?.venue?.name || 'Main Auditorium'}
                        {booking.show?.venue?.address && ` (${booking.show.venue.address})`}
                      </span>
                      {booking.show?.startTime && (
                        <span>
                          📅 {formatDate(booking.show.startTime)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="booking-seats-block">
                    <span className="detail-label">SEATS BOOKED</span>
                    <div className="booking-seats-tags">
                      {booking.seats.map((seat) => (
                        <span key={seat.showSeatId} className="seat-pill">
                          Row {seat.rowLabel}-{seat.seatNumber} ({seat.category}) - $
                          {Number(seat.price).toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="booking-card-footer">
                    <div className="booked-timestamp">
                      Booked on {formatDate(booking.createdAt)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div className="booked-total">
                        <span>Total:</span>
                        <strong>${Number(booking.totalAmount).toFixed(2)}</strong>
                      </div>

                      {isConfirmed && (
                        <button
                          type="button"
                          className="danger-outline-btn"
                          onClick={() => {
                            setCancelError('')
                            setCancellingBooking(booking)
                          }}
                        >
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* CANCELLATION CONFIRMATION MODAL */}
      {cancellingBooking && (
        <div className="modal-overlay" onClick={() => !cancelLoading && setCancellingBooking(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: '#f87171', margin: '0 0 12px' }}>Confirm Booking Cancellation</h2>

            <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: '1.5', margin: '0 0 16px' }}>
              Are you sure you want to cancel booking{' '}
              <strong style={{ color: '#818cf8', fontFamily: 'monospace' }}>
                {cancellingBooking.bookingReference}
              </strong>{' '}
              for{' '}
              <strong style={{ color: '#f8fafc' }}>
                {cancellingBooking.show?.event?.title || 'this event'}
              </strong>
              ?
            </p>

            <div
              style={{
                background: '#0b1324',
                padding: '14px 18px',
                borderRadius: '8px',
                border: '1px solid #293958',
                marginBottom: '18px',
              }}
            >
              <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                <strong>Seats to be released:</strong>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {cancellingBooking.seats.map((s) => (
                  <span
                    key={s.showSeatId}
                    style={{
                      background: '#1e293b',
                      color: '#cbd5e1',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    Row {s.rowLabel}-{s.seatNumber} ({s.category})
                  </span>
                ))}
              </div>
              <div style={{ marginTop: '10px', fontSize: '13px', color: '#cbd5e1' }}>
                Total Reservation Value: <strong>${Number(cancellingBooking.totalAmount).toFixed(2)}</strong>
              </div>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 24px' }}>
              ⚠ <em>This action will immediately release your booked seats back into available inventory and cannot be undone.</em>
            </p>

            {cancelError && (
              <div className="error-message alert-banner" style={{ marginBottom: '18px' }}>
                <p>⚠ {cancelError}</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="secondary-btn"
                disabled={cancelLoading}
                onClick={() => setCancellingBooking(null)}
              >
                Keep Reservation
              </button>
              <button
                type="button"
                className="danger-btn"
                disabled={cancelLoading}
                onClick={handleConfirmCancel}
              >
                {cancelLoading ? 'Cancelling...' : 'Yes, Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default MyBookings
