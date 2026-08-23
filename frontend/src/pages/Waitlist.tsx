import { useEffect, useState } from 'react'
import { apiRequest } from '../services/api'
import type { ApiResponse, WaitlistEntryItem, BookingItem } from '../types'

interface WaitlistProps {
  onBookingSuccess: (booking: BookingItem) => void
  onBrowseEvents: () => void
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Waitlist({ onBookingSuccess, onBrowseEvents }: WaitlistProps) {
  const [entries, setEntries] = useState<WaitlistEntryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)

  async function loadWaitlist() {
    setLoading(true)
    setError('')
    setActionError('')

    try {
      const response = await apiRequest<ApiResponse<WaitlistEntryItem[]>>('/waitlist/mine')
      setEntries(response.data || [])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load waitlist entries',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWaitlist()
  }, [])

  // Leave / Cancel Waitlist Entry
  async function handleLeaveWaitlist(waitlistEntryId: string) {
    setProcessingId(waitlistEntryId)
    setActionError('')

    try {
      await apiRequest<ApiResponse<unknown>>(`/waitlist/${waitlistEntryId}`, {
        method: 'DELETE',
      })
      await loadWaitlist()
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to cancel waitlist entry',
      )
    } finally {
      setProcessingId(null)
    }
  }

  // Book Offered Seat
  async function handleBookOfferedSeat(entry: WaitlistEntryItem) {
    if (!entry.offer) return
    setProcessingId(entry.id)
    setActionError('')

    try {
      // Direct booking with the offered seat and holdToken
      const response = await apiRequest<ApiResponse<BookingItem>>('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          showId: entry.showId,
          showSeatIds: [entry.offer.showSeatId],
          holdToken: entry.offer.holdToken,
        }),
      })

      onBookingSuccess(response.data)
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Failed to complete booking for offered seat. The offer may have expired.',
      )
      loadWaitlist()
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <main className="waitlist-page">
      <div className="waitlist-header">
        <h1>My Waitlist Entries</h1>
        <p>Track your position in line for sold-out shows and accept seat offers.</p>
      </div>

      {actionError && (
        <div className="error-message alert-banner">
          <p>{actionError}</p>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <p>Loading your waitlist status...</p>
        </div>
      )}

      {!loading && error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="empty-state">
          <h2>No active waitlist entries</h2>
          <p>You are not currently waiting in line for any shows.</p>
          <button
            type="button"
            className="primary-btn"
            style={{ marginTop: '16px' }}
            onClick={onBrowseEvents}
          >
            Browse Available Events
          </button>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <div className="waitlist-grid">
          {entries.map((entry) => {
            const isOffered = entry.status === 'OFFERED'
            const isWaiting = entry.status === 'WAITING'
            const isProcessing = processingId === entry.id

            return (
              <article
                key={entry.id}
                className={`waitlist-card ${isOffered ? 'offer-active' : ''}`}
              >
                <div className="waitlist-card-header">
                  <div className="category-tag">{entry.category} Category</div>
                  <span className={`status-pill ${entry.status.toLowerCase()}`}>
                    {entry.status}
                  </span>
                </div>

                <div className="waitlist-card-body">
                  <div className="waitlist-show-info">
                    <h3>Show ID: {entry.showId}</h3>
                    <p className="waitlist-date">
                      Joined on {formatDate(entry.createdAt)}
                    </p>
                  </div>

                  {isWaiting && (
                    <div className="queue-position-box">
                      <span className="queue-label">Position in Queue</span>
                      <span className="queue-number">#{entry.position}</span>
                      <span className="queue-desc">
                        You will receive an offer automatically when a seat frees up.
                      </span>
                    </div>
                  )}

                  {isOffered && entry.offer && (
                    <div className="offer-banner">
                      <div className="offer-title">🎉 A Seat Is Reserved For You!</div>
                      <div className="offered-seat-coords">
                        Row <strong>{entry.offer.rowLabel}</strong>, Seat{' '}
                        <strong>{entry.offer.seatNumber}</strong>
                      </div>
                      <div className="offer-expiry">
                        Offer expires at: {formatDate(entry.offer.expiresAt.toString())}
                      </div>

                      <div className="offer-actions">
                        <button
                          type="button"
                          className="primary-btn"
                          disabled={isProcessing}
                          onClick={() => handleBookOfferedSeat(entry)}
                        >
                          {isProcessing ? 'Booking...' : 'Book This Seat Now'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="waitlist-footer-actions">
                    {(isWaiting || isOffered) && (
                      <button
                        type="button"
                        className="danger-outline-btn"
                        disabled={isProcessing}
                        onClick={() => handleLeaveWaitlist(entry.id)}
                      >
                        {isProcessing ? 'Leaving...' : 'Leave Waitlist'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </main>
  )
}

export default Waitlist
