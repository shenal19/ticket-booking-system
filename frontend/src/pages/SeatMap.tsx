import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../services/api'
import type {
  ApiResponse,
  ShowSeatItem,
  HeldShowSeatItem,
  ShowItem,
  BookingItem,
} from '../types'

interface SeatMapProps {
  show: ShowItem
  eventTitle: string
  onBack: () => void
  onBookingSuccess: (booking: BookingItem) => void
}

function SeatMap({
  show,
  eventTitle,
  onBack,
  onBookingSuccess,
}: SeatMapProps) {
  const [seats, setSeats] = useState<ShowSeatItem[]>([])
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([])
  const [holdToken, setHoldToken] = useState<string | null>(null)
  const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null)
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [holding, setHolding] = useState(false)
  const [booking, setBooking] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  // Map category to price from show.showPrices
  const priceMap = useMemo(() => {
    const map = new Map<string, number>()
    if (show.showPrices) {
      for (const p of show.showPrices) {
        map.set(p.category, Number(p.price))
      }
    }
    return map
  }, [show.showPrices])

  async function loadSeats() {
    setLoading(true)
    setError('')
    setActionError('')

    try {
      const response = await apiRequest<ApiResponse<ShowSeatItem[]>>(
        `/show-seats/${show.id}/seats`,
      )
      setSeats(response.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load seat map')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSeats()
  }, [show.id])

  // Countdown timer for hold expiration
  useEffect(() => {
    if (!holdExpiresAt) {
      setTimeLeftSeconds(null)
      return
    }

    function updateTimer() {
      if (!holdExpiresAt) return
      const remainingMs = holdExpiresAt.getTime() - Date.now()
      const remainingSec = Math.max(0, Math.floor(remainingMs / 1000))
      setTimeLeftSeconds(remainingSec)

      if (remainingSec <= 0) {
        // Hold expired!
        setHoldToken(null)
        setHoldExpiresAt(null)
        setSelectedSeatIds([])
        setActionError('Your seat hold has expired. Please select seats again.')
        loadSeats()
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [holdExpiresAt])

  function toggleSeat(showSeatId: string) {
    if (holdToken) return // Cannot toggle while holding

    const seat = seats.find((item) => item.showSeatId === showSeatId)
    if (!seat || seat.status !== 'AVAILABLE') return

    setSelectedSeatIds((current) =>
      current.includes(showSeatId)
        ? current.filter((id) => id !== showSeatId)
        : [...current, showSeatId],
    )
    setActionError('')
  }

  // Hold Seats Action
  async function handleHoldSeats() {
    if (selectedSeatIds.length === 0) return
    setHolding(true)
    setActionError('')

    try {
      const response = await apiRequest<ApiResponse<HeldShowSeatItem[]>>(
        `/show-seats/${show.id}/hold`,
        {
          method: 'POST',
          body: JSON.stringify({
            showSeatIds: selectedSeatIds,
          }),
        },
      )

      const held = response.data || []
      if (held.length > 0) {
        setHoldToken(held[0].holdToken)
        setHoldExpiresAt(new Date(held[0].holdExpiresAt))
      }
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Failed to hold selected seats. Another user may have just taken them.',
      )
      // Refresh seat map to reflect current availability
      loadSeats()
    } finally {
      setHolding(false)
    }
  }

  // Release Hold Action
  async function handleReleaseHold() {
    if (!holdToken || selectedSeatIds.length === 0) return
    setReleasing(true)
    setActionError('')

    try {
      await apiRequest<ApiResponse<ShowSeatItem[]>>(
        `/show-seats/${show.id}/release`,
        {
          method: 'POST',
          body: JSON.stringify({
            showSeatIds: selectedSeatIds,
          }),
        },
      )

      setHoldToken(null)
      setHoldExpiresAt(null)
      setSelectedSeatIds([])
      await loadSeats()
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to release hold',
      )
    } finally {
      setReleasing(false)
    }
  }

  // Confirm Booking Action
  async function handleConfirmBooking() {
    if (!holdToken || selectedSeatIds.length === 0) return
    setBooking(true)
    setActionError('')

    try {
      const response = await apiRequest<ApiResponse<BookingItem>>('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          showId: show.id,
          showSeatIds: selectedSeatIds,
          holdToken,
        }),
      })

      onBookingSuccess(response.data)
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Failed to confirm booking. Your hold may have expired.',
      )
    } finally {
      setBooking(false)
    }
  }

  // Group seats by row
  const rows = useMemo(() => {
    const grouped = new Map<string, ShowSeatItem[]>()

    for (const seat of seats) {
      const row = grouped.get(seat.rowLabel)
      if (row) {
        row.push(seat)
      } else {
        grouped.set(seat.rowLabel, [seat])
      }
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([rowLabel, rowSeats]) => ({
        rowLabel,
        seats: rowSeats.sort((a, b) => a.seatNumber - b.seatNumber),
      }))
  }, [seats])

  const selectedSeatObjects = useMemo(() => {
    return seats.filter((seat) => selectedSeatIds.includes(seat.showSeatId))
  }, [seats, selectedSeatIds])

  const totalCalculatedAmount = useMemo(() => {
    return selectedSeatObjects.reduce((sum, seat) => {
      const price = priceMap.get(seat.category) || 0
      return sum + price
    }, 0)
  }, [selectedSeatObjects, priceMap])

  function formatTimerDisplay(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <main className="seat-map-page">
        <button type="button" className="back-button" onClick={onBack}>
          ← Back to Shows
        </button>
        <div className="loading-state">
          <p>Loading visual seat map...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="seat-map-page">
        <button type="button" className="back-button" onClick={onBack}>
          ← Back to Shows
        </button>
        <div className="error-message">
          <p>{error}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="seat-map-page">
      <div className="seat-map-header">
        <button
          type="button"
          className="back-button"
          onClick={onBack}
          disabled={Boolean(holdToken) || holding || booking}
        >
          ← Back to Shows
        </button>

        <h1>Select Your Seats</h1>
        <p>
          <strong>{eventTitle}</strong> — {show.venue?.name || 'Venue'}
        </p>
      </div>

      {actionError && (
        <div className="error-message alert-banner">
          <p>{actionError}</p>
        </div>
      )}

      {holdToken && timeLeftSeconds !== null && (
        <div className="hold-timer-banner">
          <div className="timer-icon">⏳</div>
          <div className="timer-text">
            <strong>Seats Temporarily Held!</strong> Please complete your booking in{' '}
            <span className="timer-countdown">
              {formatTimerDisplay(timeLeftSeconds)}
            </span>
          </div>
        </div>
      )}

      <div className="screen">STAGE / SCREEN</div>

      {rows.length === 0 ? (
        <div className="empty-state">
          <p>No seats found for this venue layout.</p>
        </div>
      ) : (
        <div className="seat-map">
          {rows.map((row) => (
            <div key={row.rowLabel} className="seat-row">
              <span className="row-label">{row.rowLabel}</span>

              {row.seats.map((seat) => {
                const isSelected = selectedSeatIds.includes(seat.showSeatId)
                const price = priceMap.get(seat.category)

                return (
                  <button
                    key={seat.showSeatId}
                    type="button"
                    className={[
                      'seat',
                      seat.status.toLowerCase(),
                      seat.category.toLowerCase(),
                      isSelected ? 'selected' : '',
                      holdToken && isSelected ? 'held-by-me' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    disabled={
                      seat.status !== 'AVAILABLE' ||
                      Boolean(holdToken) ||
                      holding ||
                      booking
                    }
                    onClick={() => toggleSeat(seat.showSeatId)}
                    title={`Row ${seat.rowLabel}, Seat ${seat.seatNumber} (${seat.category})${
                      price !== undefined ? ` - $${price.toFixed(2)}` : ''
                    } [${seat.status}]`}
                  >
                    {seat.seatNumber}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}

      <div className="seat-legend">
        <span>
          <span className="legend available" /> Available
        </span>
        <span>
          <span className="legend selected" /> Selected
        </span>
        <span>
          <span className="legend held" /> Held / Pending
        </span>
        <span>
          <span className="legend booked" /> Booked
        </span>
        <span>
          <span className="legend premium-dot" /> Premium
        </span>
      </div>

      {/* Booking Summary Section */}
      <div className="seat-summary">
        <div className="summary-left">
          <div className="summary-count">
            <strong>{selectedSeatIds.length}</strong> seat
            {selectedSeatIds.length !== 1 ? 's' : ''} selected
          </div>

          {selectedSeatObjects.length > 0 && (
            <div className="selected-seats-list">
              {selectedSeatObjects.map((seat) => {
                const price = priceMap.get(seat.category)
                return (
                  <span key={seat.showSeatId} className="seat-pill">
                    {seat.rowLabel}
                    {seat.seatNumber} ({seat.category}
                    {price !== undefined ? ` - $${price.toFixed(2)}` : ''})
                  </span>
                )
              })}
            </div>
          )}

          {selectedSeatObjects.length > 0 && (
            <div className="total-price-text">
              Total: <strong>${totalCalculatedAmount.toFixed(2)}</strong>
            </div>
          )}
        </div>

        <div className="summary-actions">
          {!holdToken ? (
            <button
              type="button"
              className="primary-btn"
              disabled={selectedSeatIds.length === 0 || holding}
              onClick={handleHoldSeats}
            >
              {holding ? 'Holding Seats...' : 'Hold Selected Seats'}
            </button>
          ) : (
            <div className="hold-action-buttons">
              <button
                type="button"
                className="secondary-btn"
                disabled={releasing || booking}
                onClick={handleReleaseHold}
              >
                {releasing ? 'Releasing...' : 'Release Hold'}
              </button>

              <button
                type="button"
                className="primary-btn confirm-btn"
                disabled={booking || releasing}
                onClick={handleConfirmBooking}
              >
                {booking ? 'Confirming Booking...' : 'Confirm & Book Tickets'}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default SeatMap