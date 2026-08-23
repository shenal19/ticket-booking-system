import { useEffect, useState } from 'react'
import { apiRequest } from '../services/api'
import type { ApiResponse, EventItem } from '../types'

interface EventsProps {
  onViewShows: (eventId: string, eventTitle: string) => void
}

function Events({ onViewShows }: EventsProps) {
  const [events, setEvents] = useState<EventItem[]>([])
  const [filteredEvents, setFilteredEvents] = useState<EventItem[]>([])
  const [selectedType, setSelectedType] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadEvents() {
      try {
        setLoading(true)
        setError('')

        const response = await apiRequest<ApiResponse<EventItem[]>>('/events/discover')
        setEvents(response.data || [])
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load events',
        )
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [])

  useEffect(() => {
    let result = events

    if (selectedType !== 'ALL') {
      result = result.filter((e) => e.type === selectedType)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q),
      )
    }

    setFilteredEvents(result)
  }, [events, selectedType, searchQuery])

  return (
    <main className="events-page">
      <div className="events-header">
        <h1>Discover Events</h1>
        <p>Browse movies and concerts, pick your showtime, and book seats.</p>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search events by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="type-filter-buttons">
          <button
            type="button"
            className={`filter-btn ${selectedType === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedType('ALL')}
          >
            All Events
          </button>
          <button
            type="button"
            className={`filter-btn ${selectedType === 'MOVIE' ? 'active' : ''}`}
            onClick={() => setSelectedType('MOVIE')}
          >
            Movies
          </button>
          <button
            type="button"
            className={`filter-btn ${selectedType === 'CONCERT' ? 'active' : ''}`}
            onClick={() => setSelectedType('CONCERT')}
          >
            Concerts
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <p>Loading events...</p>
        </div>
      )}

      {!loading && error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && filteredEvents.length === 0 && (
        <div className="empty-state">
          <h2>No events found</h2>
          <p>
            {searchQuery || selectedType !== 'ALL'
              ? 'Try adjusting your search or filters.'
              : 'There are currently no events available.'}
          </p>
        </div>
      )}

      {!loading && !error && filteredEvents.length > 0 && (
        <div className="events-grid">
          {filteredEvents.map((event) => (
            <article key={event.id} className="event-card">
              <div className="event-type-badge">{event.type}</div>
              <h2>{event.title}</h2>
              <p>{event.description}</p>

              <button
                type="button"
                className="primary-btn"
                onClick={() => onViewShows(event.id, event.title)}
              >
                View Shows & Tickets
              </button>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}

export default Events