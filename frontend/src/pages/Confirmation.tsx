import type { BookingView } from './BookingSummary'

interface ConfirmationProps {
  booking: BookingView
  eventTitle: string
  showStartTime: string
  onBackToEvents: () => void
}

function formatDateTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function Confirmation({
  booking,
  eventTitle,
  showStartTime,
  onBackToEvents,
}: ConfirmationProps) {
  return (
    <main className="confirmation-page">
      <div className="confirmation-card">
        <div className="confirmation-badge">✓</div>

        <h1>Booking Confirmed</h1>

        <dl className="confirmation-details">
          <div>
            <dt>Booking ID</dt>
            <dd>{booking.bookingReference}</dd>
          </div>

          <div>
            <dt>Event</dt>
            <dd>{eventTitle}</dd>
          </div>

          <div>
            <dt>Show</dt>
            <dd>{formatDateTime(showStartTime)}</dd>
          </div>

          <div>
            <dt>Seats</dt>
            <dd>
              {booking.seats
                .map(
                  (seat) =>
                    `${seat.rowLabel}${seat.seatNumber}`,
                )
                .join(', ')}
            </dd>
          </div>

          <div>
            <dt>Amount</dt>
            <dd>₹{booking.totalAmount}</dd>
          </div>

          <div>
            <dt>Booking Status</dt>
            <dd className="confirmation-status">
              {booking.status}
            </dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={onBackToEvents}
        >
          Back to Events
        </button>
      </div>
    </main>
  )
}

export default Confirmation
