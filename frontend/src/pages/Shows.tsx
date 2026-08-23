import { useEffect, useState } from 'react'
import { apiRequest } from '../services/api'
import type { ApiResponse, ShowItem, SeatCategory } from '../types'

interface ShowsProps {
  eventId: string
  eventTitle: string
  onBack: () => void
  onSelectShow: (show: ShowItem) => void
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Shows({
  eventId,
  eventTitle,
  onBack,
  onSelectShow,
}: ShowsProps) {
  const [shows, setShows] = useState<ShowItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [waitlistModalShow, setWaitlistModalShow] = useState<ShowItem | null>(null)
  const [waitlistCategory, setWaitlistCategory] = useState<SeatCategory>('STANDARD')
  const [waitlistMsg, setWaitlistMsg] = useState('')
  const [joiningWaitlist, setJoiningWaitlist] = useState(false)

  useEffect(() => {
    async function loadShows() {
      setLoading(true)
      setError('')

      try {
        const response = await apiRequest<ApiResponse<ShowItem[]>>(
          `/shows/event/${eventId}`,
        )
        setShows(response.data || [])
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load shows',
        )
      } finally {
        setLoading(false)
      }
    }

    loadShows()
  }, [eventId])

  async function handleJoinWaitlistSubmit() {
    if (!waitlistModalShow) return
    setJoiningWaitlist(true)
    setWaitlistMsg('')

    try {
      await apiRequest<ApiResponse<unknown>>('/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          showId: waitlistModalShow.id,
          category: waitlistCategory,
        }),
      })

      setWaitlistMsg('Successfully joined the waitlist! Check My Waitlist for updates.')
      setTimeout(() => {
        setWaitlistModalShow(null)
        setWaitlistMsg('')
      }, 2000)
    } catch (err) {
      setWaitlistMsg(
        err instanceof Error ? err.message : 'Failed to join waitlist',
      )
    } finally {
      setJoiningWaitlist(false)
    }
  }

  return (
    <main className="shows-page">
      <div className="shows-header">
        <button
          type="button"
          className="back-button"
          onClick={onBack}
        >
          ← Back to Events
        </button>

        <h1>{eventTitle}</h1>
        <p>Select a showtime to choose seats or join the waitlist.</p>
      </div>

      {loading && (
        <div className="loading-state">
          <p>Loading scheduled shows...</p>
        </div>
      )}

      {!loading && error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && shows.length === 0 && (
        <div className="empty-state">
          <h2>No shows scheduled</h2>
          <p>There are currently no showtimes scheduled for this event.</p>
        </div>
      )}

      {!loading && !error && shows.length > 0 && (
        <div className="shows-grid">
          {shows.map((show) => (
            <article key={show.id} className="show-card">
              <div className="show-card-content">
                <span className="show-label">SHOWTIME</span>
                <h2>{formatDateTime(show.startTime)}</h2>

                <div className="show-time">
                  <span>{formatTime(show.startTime)}</span>
                  <span className="time-separator">→</span>
                  <span>{formatTime(show.endTime)}</span>
                </div>

                <div className="venue-info">
                  <strong>Venue:</strong> {show.venue?.name || 'Main Auditorium'}
                  {show.venue?.address && (
                    <span className="venue-address"> ({show.venue.address})</span>
                  )}
                </div>

                {show.showPrices && show.showPrices.length > 0 && (
                  <div className="show-pricing-tags">
                    {show.showPrices.map((p) => (
                      <span key={p.id} className="price-tag">
                        {p.category}: ${Number(p.price).toFixed(2)}
                      </span>
                    ))}
                  </div>
                )}

                <div className="show-card-actions">
                  <button
                    type="button"
                    className="select-show-button"
                    onClick={() => onSelectShow(show)}
                  >
                    Select Seats
                  </button>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setWaitlistModalShow(show)}
                  >
                    Join Waitlist
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {waitlistModalShow && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Join Waitlist</h2>
            <p>
              Join the waitlist for <strong>{eventTitle}</strong> at{' '}
              {formatDateTime(waitlistModalShow.startTime)}.
            </p>

            <label className="modal-label">
              Seat Category:
              <select
                value={waitlistCategory}
                onChange={(e) => setWaitlistCategory(e.target.value as SeatCategory)}
              >
                <option value="STANDARD">STANDARD</option>
                <option value="PREMIUM">PREMIUM</option>
              </select>
            </label>

            {waitlistMsg && (
              <p
                className={
                  waitlistMsg.includes('Successfully')
                    ? 'success-message'
                    : 'error-message'
                }
              >
                {waitlistMsg}
              </p>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setWaitlistModalShow(null)
                  setWaitlistMsg('')
                }}
                disabled={joiningWaitlist}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleJoinWaitlistSubmit}
                disabled={joiningWaitlist}
              >
                {joiningWaitlist ? 'Joining...' : 'Confirm Join'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default Shows