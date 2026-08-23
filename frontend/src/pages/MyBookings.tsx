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

  useEffect(() => {
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

    loadBookings()
  }, [])

  return (
    <main className="bookings-page">
      <div className="bookings-header">
        <h1>My Bookings</h1>
        <p>Review your confirmed reservations and ticket details.</p>
      </div>

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
          {bookings.map((booking) => (
            <article key={booking.id} className="booking-card">
              <div className="booking-card-header">
                <div className="booking-ref-block">
                  <span className="detail-label">REFERENCE</span>
                  <strong className="booking-ref-code">{booking.bookingReference}</strong>
                </div>

                <div className="booking-status-block">
                  <span
                    className={`status-pill ${
                      booking.status.toLowerCase() === 'confirmed'
                        ? 'confirmed'
                        : 'cancelled'
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
                  <div className="booked-total">
                    <span>Total Amount:</span>
                    <strong>${Number(booking.totalAmount).toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}

export default MyBookings
