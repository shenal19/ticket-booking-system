import { useEffect, useState } from 'react'
import { apiRequest } from '../services/api'
import type {
  ApiResponse,
  EventItem,
  ShowItem,
  VenueItem,
  SeatItem,
  ShowPriceItem,
  SeatCategory,
  EventType,
} from '../types'

interface OrganiserDashboardProps {
  initialTab?: string
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function OrganiserDashboard({ initialTab = 'overview' }: OrganiserDashboardProps) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  // Data lists
  const [events, setEvents] = useState<EventItem[]>([])
  const [shows, setShows] = useState<ShowItem[]>([])
  const [venues, setVenues] = useState<VenueItem[]>([])

  // Modal / sub-view states
  // 1. Event Modals
  const [showCreateEventModal, setShowCreateEventModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null)
  const [eventTitle, setEventTitle] = useState('')
  const [eventDesc, setEventDesc] = useState('')
  const [eventType, setEventType] = useState<EventType>('MOVIE')

  // 2. Show Modals
  const [showCreateShowModal, setShowCreateShowModal] = useState(false)
  const [editingShow, setEditingShow] = useState<ShowItem | null>(null)
  const [showEventId, setShowEventId] = useState('')
  const [showVenueId, setShowVenueId] = useState('')
  const [showStartTime, setShowStartTime] = useState('')
  const [showEndTime, setShowEndTime] = useState('')

  // 3. Show Prices Sub-Modal
  const [priceShow, setPriceShow] = useState<ShowItem | null>(null)
  const [prices, setPrices] = useState<ShowPriceItem[]>([])
  const [priceCategory, setPriceCategory] = useState<SeatCategory>('STANDARD')
  const [priceAmount, setPriceAmount] = useState<string>('200')
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)

  // 4. Venue Modals
  const [showCreateVenueModal, setShowCreateVenueModal] = useState(false)
  const [editingVenue, setEditingVenue] = useState<VenueItem | null>(null)
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')

  // 5. Seats Sub-Modal
  const [seatsVenue, setSeatsVenue] = useState<VenueItem | null>(null)
  const [seats, setSeats] = useState<SeatItem[]>([])
  const [seatRow, setSeatRow] = useState('A')
  const [seatNum, setSeatNum] = useState<number>(1)
  const [seatCategory, setSeatCategory] = useState<SeatCategory>('STANDARD')
  const [editingSeatId, setEditingSeatId] = useState<string | null>(null)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  // Load all organiser resources
  async function loadAllData() {
    setLoading(true)
    setError('')
    try {
      const [resEvents, resShows, resVenues] = await Promise.all([
        apiRequest<ApiResponse<EventItem[]>>('/events'),
        apiRequest<ApiResponse<ShowItem[]>>('/shows'),
        apiRequest<ApiResponse<VenueItem[]>>('/venues'),
      ])

      setEvents(resEvents.data || [])
      setShows(resShows.data || [])
      setVenues(resVenues.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organiser data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  function showSuccess(msg: string) {
    setActionSuccess(msg)
    setTimeout(() => setActionSuccess(''), 3500)
  }

  // ==========================================
  // EVENT ACTIONS
  // ==========================================
  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await apiRequest<ApiResponse<EventItem>>('/events', {
        method: 'POST',
        body: JSON.stringify({
          title: eventTitle,
          description: eventDesc,
          type: eventType,
        }),
      })
      setShowCreateEventModal(false)
      setEventTitle('')
      setEventDesc('')
      showSuccess('Event created successfully!')
      loadAllData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event')
    }
  }

  async function handleUpdateEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!editingEvent) return
    setError('')
    try {
      await apiRequest<ApiResponse<EventItem>>(`/events/${editingEvent.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: eventTitle,
          description: eventDesc,
          type: eventType,
        }),
      })
      setEditingEvent(null)
      showSuccess('Event updated successfully!')
      loadAllData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event')
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm('Are you sure you want to delete this event?')) return
    setError('')
    try {
      await apiRequest<ApiResponse<unknown>>(`/events/${eventId}`, {
        method: 'DELETE',
      })
      showSuccess('Event deleted successfully!')
      loadAllData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event')
    }
  }

  // ==========================================
  // SHOW ACTIONS
  // ==========================================
  async function handleCreateShow(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await apiRequest<ApiResponse<ShowItem>>('/shows', {
        method: 'POST',
        body: JSON.stringify({
          eventId: showEventId,
          venueId: showVenueId,
          startTime: new Date(showStartTime).toISOString(),
          endTime: new Date(showEndTime).toISOString(),
        }),
      })
      setShowCreateShowModal(false)
      setShowEventId('')
      setShowVenueId('')
      setShowStartTime('')
      setShowEndTime('')
      showSuccess('Show created successfully!')
      loadAllData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create show')
    }
  }

  async function handleUpdateShow(e: React.FormEvent) {
    e.preventDefault()
    if (!editingShow) return
    setError('')
    try {
      await apiRequest<ApiResponse<ShowItem>>(`/shows/${editingShow.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          eventId: showEventId,
          startTime: new Date(showStartTime).toISOString(),
          endTime: new Date(showEndTime).toISOString(),
        }),
      })
      setEditingShow(null)
      showSuccess('Show updated successfully!')
      loadAllData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update show')
    }
  }

  async function handleDeleteShow(showId: string) {
    if (!confirm('Are you sure you want to delete this show?')) return
    setError('')
    try {
      await apiRequest<ApiResponse<unknown>>(`/shows/${showId}`, {
        method: 'DELETE',
      })
      showSuccess('Show deleted successfully!')
      loadAllData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete show')
    }
  }

  // ==========================================
  // SHOW PRICES ACTIONS
  // ==========================================
  async function loadPricesForShow(show: ShowItem) {
    setPriceShow(show)
    setError('')
    try {
      const res = await apiRequest<ApiResponse<ShowPriceItem[]>>(
        `/shows/${show.id}/prices`,
      )
      setPrices(res.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load show prices')
    }
  }

  async function handleSavePrice(e: React.FormEvent) {
    e.preventDefault()
    if (!priceShow) return
    setError('')
    const numPrice = Number(priceAmount)
    try {
      if (editingPriceId) {
        await apiRequest<ApiResponse<ShowPriceItem>>(
          `/shows/${priceShow.id}/prices/${editingPriceId}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              category: priceCategory,
              price: numPrice,
            }),
          },
        )
        setEditingPriceId(null)
      } else {
        await apiRequest<ApiResponse<ShowPriceItem>>(
          `/shows/${priceShow.id}/prices`,
          {
            method: 'POST',
            body: JSON.stringify({
              category: priceCategory,
              price: numPrice,
            }),
          },
        )
      }
      showSuccess('Price saved successfully!')
      loadPricesForShow(priceShow)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save price')
    }
  }

  async function handleDeletePrice(priceId: string) {
    if (!priceShow) return
    setError('')
    try {
      await apiRequest<ApiResponse<unknown>>(
        `/shows/${priceShow.id}/prices/${priceId}`,
        {
          method: 'DELETE',
        },
      )
      showSuccess('Price deleted!')
      loadPricesForShow(priceShow)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete price')
    }
  }

  // ==========================================
  // VENUE ACTIONS
  // ==========================================
  async function handleCreateVenue(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await apiRequest<ApiResponse<VenueItem>>('/venues', {
        method: 'POST',
        body: JSON.stringify({
          name: venueName,
          address: venueAddress,
        }),
      })
      setShowCreateVenueModal(false)
      setVenueName('')
      setVenueAddress('')
      showSuccess('Venue created successfully!')
      loadAllData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create venue')
    }
  }

  async function handleUpdateVenue(e: React.FormEvent) {
    e.preventDefault()
    if (!editingVenue) return
    setError('')
    try {
      await apiRequest<ApiResponse<VenueItem>>(`/venues/${editingVenue.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: venueName,
          address: venueAddress,
        }),
      })
      setEditingVenue(null)
      showSuccess('Venue updated successfully!')
      loadAllData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update venue')
    }
  }

  async function handleDeleteVenue(venueId: string) {
    if (!confirm('Are you sure you want to delete this venue?')) return
    setError('')
    try {
      await apiRequest<ApiResponse<unknown>>(`/venues/${venueId}`, {
        method: 'DELETE',
      })
      showSuccess('Venue deleted successfully!')
      loadAllData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete venue')
    }
  }

  // ==========================================
  // VENUE SEATS ACTIONS
  // ==========================================
  async function loadSeatsForVenue(venue: VenueItem) {
    setSeatsVenue(venue)
    setError('')
    try {
      const res = await apiRequest<ApiResponse<SeatItem[]>>(
        `/venues/${venue.id}/seats`,
      )
      setSeats(res.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load venue seats')
    }
  }

  async function handleSaveSeat(e: React.FormEvent) {
    e.preventDefault()
    if (!seatsVenue) return
    setError('')
    try {
      if (editingSeatId) {
        await apiRequest<ApiResponse<SeatItem>>(
          `/venues/${seatsVenue.id}/seats/${editingSeatId}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              rowLabel: seatRow,
              seatNumber: Number(seatNum),
              category: seatCategory,
            }),
          },
        )
        setEditingSeatId(null)
      } else {
        await apiRequest<ApiResponse<SeatItem>>(
          `/venues/${seatsVenue.id}/seats`,
          {
            method: 'POST',
            body: JSON.stringify({
              rowLabel: seatRow,
              seatNumber: Number(seatNum),
              category: seatCategory,
            }),
          },
        )
      }
      showSuccess('Seat saved successfully!')
      setSeatNum((prev) => prev + 1)
      loadSeatsForVenue(seatsVenue)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save seat')
    }
  }

  async function handleDeleteSeat(seatId: string) {
    if (!seatsVenue) return
    setError('')
    try {
      await apiRequest<ApiResponse<unknown>>(
        `/venues/${seatsVenue.id}/seats/${seatId}`,
        {
          method: 'DELETE',
        },
      )
      showSuccess('Seat removed!')
      loadSeatsForVenue(seatsVenue)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete seat')
    }
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Organiser Portal</h1>
          <p>Create and manage events, venues, seat layouts, shows, and category pricing.</p>
        </div>

        <div className="dashboard-nav-tabs">
          <button
            type="button"
            className={`dash-tab-btn ${activeTab === 'overview' || activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button
            type="button"
            className={`dash-tab-btn ${activeTab === 'org-events' || activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('org-events')}
          >
            🎭 Events ({events.length})
          </button>
          <button
            type="button"
            className={`dash-tab-btn ${activeTab === 'org-shows' || activeTab === 'shows' ? 'active' : ''}`}
            onClick={() => setActiveTab('org-shows')}
          >
            🎬 Shows ({shows.length})
          </button>
          <button
            type="button"
            className={`dash-tab-btn ${activeTab === 'org-venues' || activeTab === 'venues' ? 'active' : ''}`}
            onClick={() => setActiveTab('org-venues')}
          >
            🏛️ Venues ({venues.length})
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="success-message alert-banner">
          <p>✓ {actionSuccess}</p>
        </div>
      )}

      {error && (
        <div className="error-message alert-banner">
          <p>⚠ {error}</p>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <p>Loading dashboard records...</p>
        </div>
      )}

      {/* OVERVIEW TAB */}
      {(activeTab === 'overview' || activeTab === 'dashboard') && !loading && (
        <section className="dashboard-overview-section">
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Total Events</span>
              <span className="stat-number">{events.length}</span>
              <button
                type="button"
                className="secondary-btn stat-action"
                onClick={() => setActiveTab('org-events')}
              >
                Manage Events →
              </button>
            </div>

            <div className="stat-card">
              <span className="stat-label">Scheduled Shows</span>
              <span className="stat-number">{shows.length}</span>
              <button
                type="button"
                className="secondary-btn stat-action"
                onClick={() => setActiveTab('org-shows')}
              >
                Manage Shows →
              </button>
            </div>

            <div className="stat-card">
              <span className="stat-label">Managed Venues</span>
              <span className="stat-number">{venues.length}</span>
              <button
                type="button"
                className="secondary-btn stat-action"
                onClick={() => setActiveTab('org-venues')}
              >
                Manage Venues →
              </button>
            </div>
          </div>

          <div className="overview-recent-tables">
            <div className="overview-sub-card">
              <div className="sub-card-header">
                <h3>Recent Events</h3>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => {
                    setEventTitle('')
                    setEventDesc('')
                    setEventType('MOVIE')
                    setShowCreateEventModal(true)
                  }}
                >
                  + Add Event
                </button>
              </div>

              {events.length === 0 ? (
                <p className="empty-hint">No events created yet.</p>
              ) : (
                <ul className="overview-list">
                  {events.slice(0, 5).map((e) => (
                    <li key={e.id}>
                      <strong>{e.title}</strong>
                      <span className="badge-tag">{e.type}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="overview-sub-card">
              <div className="sub-card-header">
                <h3>Recent Shows</h3>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => {
                    if (events.length === 0 || venues.length === 0) {
                      setError('You need at least one event and one venue before creating a show.')
                      return
                    }
                    setShowEventId(events[0].id)
                    setShowVenueId(venues[0].id)
                    setShowCreateShowModal(true)
                  }}
                >
                  + Add Show
                </button>
              </div>

              {shows.length === 0 ? (
                <p className="empty-hint">No shows scheduled yet.</p>
              ) : (
                <ul className="overview-list">
                  {shows.slice(0, 5).map((s) => (
                    <li key={s.id}>
                      <span>{formatDate(s.startTime)}</span>
                      <button
                        type="button"
                        className="small-link-btn"
                        onClick={() => loadPricesForShow(s)}
                      >
                        Prices ({s.showPrices?.length || 0})
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      {/* EVENTS TAB */}
      {(activeTab === 'org-events' || activeTab === 'events') && !loading && (
        <section className="dashboard-tab-content">
          <div className="tab-title-row">
            <h2>Your Event Listings</h2>
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                setEventTitle('')
                setEventDesc('')
                setEventType('MOVIE')
                setShowCreateEventModal(true)
              }}
            >
              + Create New Event
            </button>
          </div>

          {events.length === 0 ? (
            <div className="empty-state">
              <p>No events found. Click "+ Create New Event" to get started.</p>
            </div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Title</th>
                    <th>Description</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <span className="badge-tag">{e.type}</span>
                      </td>
                      <td>
                        <strong>{e.title}</strong>
                      </td>
                      <td className="desc-cell">{e.description}</td>
                      <td>{formatDate(e.createdAt)}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => {
                              setEditingEvent(e)
                              setEventTitle(e.title)
                              setEventDesc(e.description)
                              setEventType(e.type)
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="danger-btn"
                            onClick={() => handleDeleteEvent(e.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* SHOWS TAB */}
      {(activeTab === 'org-shows' || activeTab === 'shows') && !loading && (
        <section className="dashboard-tab-content">
          <div className="tab-title-row">
            <h2>Your Scheduled Shows</h2>
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                if (events.length === 0 || venues.length === 0) {
                  setError('Please create at least one event and one venue before scheduling shows.')
                  return
                }
                setShowEventId(events[0].id)
                setShowVenueId(venues[0].id)
                setShowStartTime('')
                setShowEndTime('')
                setShowCreateShowModal(true)
              }}
            >
              + Schedule Show
            </button>
          </div>

          {shows.length === 0 ? (
            <div className="empty-state">
              <p>No shows scheduled. Click "+ Schedule Show" to create your first showtime.</p>
            </div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Event ID / Venue ID</th>
                    <th>Prices</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shows.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{formatDate(s.startTime)}</strong>
                      </td>
                      <td>{formatDate(s.endTime)}</td>
                      <td>
                        <div className="small-meta">Event: {s.eventId}</div>
                        <div className="small-meta">Venue: {s.venueId}</div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => loadPricesForShow(s)}
                        >
                          💰 Manage Prices
                        </button>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => {
                              setEditingShow(s)
                              setShowEventId(s.eventId)
                              setShowVenueId(s.venueId)
                              setShowStartTime(s.startTime.slice(0, 16))
                              setShowEndTime(s.endTime.slice(0, 16))
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="danger-btn"
                            onClick={() => handleDeleteShow(s.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* VENUES TAB */}
      {(activeTab === 'org-venues' || activeTab === 'venues') && !loading && (
        <section className="dashboard-tab-content">
          <div className="tab-title-row">
            <h2>Your Venues & Seat Layouts</h2>
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                setVenueName('')
                setVenueAddress('')
                setShowCreateVenueModal(true)
              }}
            >
              + Create New Venue
            </button>
          </div>

          {venues.length === 0 ? (
            <div className="empty-state">
              <p>No venues registered. Create a venue and add seat configurations.</p>
            </div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Venue Name</th>
                    <th>Address</th>
                    <th>Seats Layout</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {venues.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <strong>{v.name}</strong>
                      </td>
                      <td>{v.address}</td>
                      <td>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => loadSeatsForVenue(v)}
                        >
                          🪑 Configure Seats
                        </button>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => {
                              setEditingVenue(v)
                              setVenueName(v.name)
                              setVenueAddress(v.address)
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="danger-btn"
                            onClick={() => handleDeleteVenue(v.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ==========================================
          MODALS
         ========================================== */}

      {/* CREATE EVENT MODAL */}
      {showCreateEventModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Create New Event</h2>
            <form onSubmit={handleCreateEvent}>
              <label>
                Event Title
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Interstellar Live Concert"
                />
              </label>

              <label>
                Event Type
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as EventType)}
                >
                  <option value="MOVIE">MOVIE</option>
                  <option value="CONCERT">CONCERT</option>
                </select>
              </label>

              <label>
                Description
                <textarea
                  required
                  rows={4}
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="Event details, synopsis, etc."
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowCreateEventModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EVENT MODAL */}
      {editingEvent && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit Event</h2>
            <form onSubmit={handleUpdateEvent}>
              <label>
                Event Title
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                />
              </label>

              <label>
                Event Type
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as EventType)}
                >
                  <option value="MOVIE">MOVIE</option>
                  <option value="CONCERT">CONCERT</option>
                </select>
              </label>

              <label>
                Description
                <textarea
                  required
                  rows={4}
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setEditingEvent(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SHOW MODAL */}
      {showCreateShowModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Schedule New Show</h2>
            <form onSubmit={handleCreateShow}>
              <label>
                Select Event
                <select
                  value={showEventId}
                  onChange={(e) => setShowEventId(e.target.value)}
                  required
                >
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title} ({e.type})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Select Venue
                <select
                  value={showVenueId}
                  onChange={(e) => setShowVenueId(e.target.value)}
                  required
                >
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.address})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Start Date & Time
                <input
                  type="datetime-local"
                  required
                  value={showStartTime}
                  onChange={(e) => setShowStartTime(e.target.value)}
                />
              </label>

              <label>
                End Date & Time
                <input
                  type="datetime-local"
                  required
                  value={showEndTime}
                  onChange={(e) => setShowEndTime(e.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowCreateShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Schedule Show
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SHOW MODAL */}
      {editingShow && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit Show Schedule</h2>
            <form onSubmit={handleUpdateShow}>
              <label>
                Select Event
                <select
                  value={showEventId}
                  onChange={(e) => setShowEventId(e.target.value)}
                  required
                >
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Start Date & Time
                <input
                  type="datetime-local"
                  required
                  value={showStartTime}
                  onChange={(e) => setShowStartTime(e.target.value)}
                />
              </label>

              <label>
                End Date & Time
                <input
                  type="datetime-local"
                  required
                  value={showEndTime}
                  onChange={(e) => setShowEndTime(e.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setEditingShow(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE SHOW PRICES SUB-MODAL */}
      {priceShow && (
        <div className="modal-overlay">
          <div className="modal-content modal-wide">
            <h2>Manage Show Prices (Show: {priceShow.id.slice(0, 8)})</h2>
            <p>Set standard and premium seat prices for this showtime.</p>

            <form onSubmit={handleSavePrice} className="inline-add-form">
              <label>
                Category
                <select
                  value={priceCategory}
                  onChange={(e) => setPriceCategory(e.target.value as SeatCategory)}
                >
                  <option value="STANDARD">STANDARD</option>
                  <option value="PREMIUM">PREMIUM</option>
                </select>
              </label>

              <label>
                Price ($)
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={priceAmount}
                  onChange={(e) => setPriceAmount(e.target.value)}
                />
              </label>

              <button type="submit" className="primary-btn">
                {editingPriceId ? 'Update Price' : '+ Add Price'}
              </button>

              {editingPriceId && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setEditingPriceId(null)
                    setPriceAmount('200')
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </form>

            <div className="modal-table-box">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.length === 0 ? (
                    <tr>
                      <td colSpan={3}>No prices configured yet for this show.</td>
                    </tr>
                  ) : (
                    prices.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.category}</strong>
                        </td>
                        <td>${Number(p.price).toFixed(2)}</td>
                        <td>
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => {
                              setEditingPriceId(p.id)
                              setPriceCategory(p.category)
                              setPriceAmount(p.price.toString())
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="danger-btn"
                            onClick={() => handleDeletePrice(p.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="primary-btn"
                onClick={() => setPriceShow(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE VENUE MODAL */}
      {showCreateVenueModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Create New Venue</h2>
            <form onSubmit={handleCreateVenue}>
              <label>
                Venue Name
                <input
                  type="text"
                  required
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="e.g. Grand City Cinema"
                />
              </label>

              <label>
                Address
                <input
                  type="text"
                  required
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  placeholder="e.g. 123 Broadway Blvd, New York"
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowCreateVenueModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Create Venue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT VENUE MODAL */}
      {editingVenue && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit Venue</h2>
            <form onSubmit={handleUpdateVenue}>
              <label>
                Venue Name
                <input
                  type="text"
                  required
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                />
              </label>

              <label>
                Address
                <input
                  type="text"
                  required
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setEditingVenue(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIGURE SEATS SUB-MODAL */}
      {seatsVenue && (
        <div className="modal-overlay">
          <div className="modal-content modal-wide">
            <h2>Configure Seats ({seatsVenue.name})</h2>
            <p>Define physical seating arrangement and categories for this venue.</p>

            <form onSubmit={handleSaveSeat} className="inline-add-form">
              <label>
                Row Label
                <input
                  type="text"
                  maxLength={5}
                  required
                  value={seatRow}
                  onChange={(e) => setSeatRow(e.target.value.toUpperCase())}
                  placeholder="A"
                  style={{ width: '80px' }}
                />
              </label>

              <label>
                Seat Number
                <input
                  type="number"
                  min={1}
                  required
                  value={seatNum}
                  onChange={(e) => setSeatNum(Number(e.target.value))}
                  style={{ width: '90px' }}
                />
              </label>

              <label>
                Category
                <select
                  value={seatCategory}
                  onChange={(e) => setSeatCategory(e.target.value as SeatCategory)}
                >
                  <option value="STANDARD">STANDARD</option>
                  <option value="PREMIUM">PREMIUM</option>
                </select>
              </label>

              <button type="submit" className="primary-btn">
                {editingSeatId ? 'Update Seat' : '+ Add Seat'}
              </button>

              {editingSeatId && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setEditingSeatId(null)}
                >
                  Cancel Edit
                </button>
              )}
            </form>

            <div className="modal-table-box">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Number</th>
                    <th>Category</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {seats.length === 0 ? (
                    <tr>
                      <td colSpan={4}>No seats configured yet for this venue.</td>
                    </tr>
                  ) : (
                    seats.map((st) => (
                      <tr key={st.id}>
                        <td>
                          <strong>{st.rowLabel}</strong>
                        </td>
                        <td>{st.seatNumber}</td>
                        <td>
                          <span className="badge-tag">{st.category}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => {
                              setEditingSeatId(st.id)
                              setSeatRow(st.rowLabel)
                              setSeatNum(st.seatNumber)
                              setSeatCategory(st.category)
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="danger-btn"
                            onClick={() => handleDeleteSeat(st.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="primary-btn"
                onClick={() => setSeatsVenue(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default OrganiserDashboard
