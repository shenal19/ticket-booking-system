import type { BookingItem } from '../types'

interface BookingConfirmationProps {
  booking: BookingItem
  eventTitle?: string
  venueName?: string
  showTime?: string
  onViewMyBookings: () => void
  onBrowseEvents: () => void
}

function formatBookingDate(dateStr: string) {
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

function BookingConfirmation({
  booking,
  eventTitle,
  venueName,
  showTime,
  onViewMyBookings,
  onBrowseEvents,
}: BookingConfirmationProps) {
  return (
    <main className="confirmation-page">
      <div className="confirmation-card">
        <div className="confirmation-icon-container">
          <div className="confirmation-checkmark">✓</div>
        </div>

        <h1>Booking Confirmed!</h1>
        <p className="confirmation-subtitle">
          Your tickets have been successfully reserved and confirmed.
        </p>

        <div className="ticket-details-box">
          <div className="ticket-header-row">
            <div>
              <span className="detail-label">BOOKING REFERENCE</span>
              <div className="reference-code">{booking.bookingReference}</div>
            </div>
            <div>
              <span className="status-pill confirmed">{booking.status}</span>
            </div>
          </div>

          <div className="ticket-divider" />

          <div className="ticket-grid">
            <div className="ticket-grid-item">
              <span className="detail-label">EVENT</span>
              <div className="detail-value">
                {eventTitle || booking.show?.event?.title || 'Featured Event'}
              </div>
            </div>

            <div className="ticket-grid-item">
              <span className="detail-label">VENUE</span>
              <div className="detail-value">
                {venueName || booking.show?.venue?.name || 'Main Auditorium'}
              </div>
            </div>

            <div className="ticket-grid-item">
              <span className="detail-label">SHOWTIME</span>
              <div className="detail-value">
                {showTime ||
                  (booking.show?.startTime
                    ? formatBookingDate(booking.show.startTime)
                    : 'Scheduled Showtime')}
              </div>
            </div>

            <div className="ticket-grid-item">
              <span className="detail-label">BOOKING DATE</span>
              <div className="detail-value">
                {formatBookingDate(booking.createdAt)}
              </div>
            </div>
          </div>

          <div className="ticket-divider" />

          <div className="ticket-seats-section">
            <span className="detail-label">CONFIRMED SEATS</span>
            <div className="confirmed-seats-list">
              {booking.seats.map((seat) => (
                <div key={seat.showSeatId} className="confirmed-seat-tag">
                  <span className="seat-coords">
                    Row {seat.rowLabel}, Seat {seat.seatNumber}
                  </span>
                  <span className="seat-cat-badge">{seat.category}</span>
                  <span className="seat-price">${Number(seat.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ticket-divider" />

          <div className="ticket-total-row">
            <span>Total Paid</span>
            <strong className="total-amount">${Number(booking.totalAmount).toFixed(2)}</strong>
          </div>
        </div>

        <div className="confirmation-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={onBrowseEvents}
          >
            Browse More Events
          </button>

          <button
            type="button"
            className="primary-btn"
            onClick={onViewMyBookings}
          >
            View My Bookings
          </button>
        </div>
      </div>
    </main>
  )
}

export default BookingConfirmation
