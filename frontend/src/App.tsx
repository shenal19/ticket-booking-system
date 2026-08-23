import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Events from './pages/Events'
import Shows from './pages/Shows'
import SeatMap from './pages/SeatMap'
import BookingConfirmation from './pages/BookingConfirmation'
import MyBookings from './pages/MyBookings'
import Waitlist from './pages/Waitlist'
import OrganiserDashboard from './pages/OrganiserDashboard'
import type { User, ShowItem, BookingItem } from './types'
import './index.css'

interface SelectedEvent {
  id: string
  title: string
}

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function App() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('token'),
  )

  const [user, setUser] = useState<User | null>(getStoredUser)

  const isLoggedIn = Boolean(token && user)
  const isCustomer = user?.role === 'CUSTOMER'
  const isOrganiser = user?.role === 'ORGANISER' || user?.role === 'ADMIN'

  // Current active navigation view
  const [activeView, setActiveView] = useState<string>(() => {
    const stored = getStoredUser()
    if (!stored) return 'login'
    return stored.role === 'CUSTOMER' ? 'events' : 'dashboard'
  })

  // Selected event and show for customer booking path
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(null)
  const [selectedShow, setSelectedShow] = useState<ShowItem | null>(null)
  const [lastBooking, setLastBooking] = useState<BookingItem | null>(null)

  // Listen for custom 401 unauthorized event from api.ts
  useEffect(() => {
    function handleUnauthorized() {
      setToken(null)
      setUser(null)
      setSelectedEvent(null)
      setSelectedShow(null)
      setLastBooking(null)
      setActiveView('login')
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
    }
  }, [])

  function handleLoginSuccess(loggedInUser: User, receivedToken: string) {
    setToken(receivedToken)
    setUser(loggedInUser)
    setSelectedEvent(null)
    setSelectedShow(null)
    setLastBooking(null)

    if (loggedInUser.role === 'CUSTOMER') {
      setActiveView('events')
    } else {
      setActiveView('dashboard')
    }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')

    setToken(null)
    setUser(null)
    setSelectedEvent(null)
    setSelectedShow(null)
    setLastBooking(null)
    setActiveView('login')
  }

  function handleNavigate(view: string) {
    if (view === 'events') {
      setSelectedEvent(null)
      setSelectedShow(null)
      setActiveView('events')
    } else if (view === 'bookings') {
      setActiveView('bookings')
    } else if (view === 'waitlist') {
      setActiveView('waitlist')
    } else if (view === 'dashboard' || view.startsWith('org-')) {
      setActiveView(view)
    } else if (view === 'login') {
      setActiveView('login')
    }
  }

  function handleViewShows(eventId: string, eventTitle: string) {
    setSelectedEvent({ id: eventId, title: eventTitle })
    setSelectedShow(null)
    setActiveView('shows')
  }

  function handleBackToEvents() {
    setSelectedEvent(null)
    setSelectedShow(null)
    setActiveView('events')
  }

  function handleSelectShow(show: ShowItem) {
    setSelectedShow(show)
    setActiveView('seatmap')
  }

  function handleBackToShows() {
    setSelectedShow(null)
    setActiveView('shows')
  }

  function handleBookingSuccess(booking: BookingItem) {
    setLastBooking(booking)
    setActiveView('confirmation')
  }

  return (
    <>
      <Navbar
        isLoggedIn={isLoggedIn}
        user={user}
        activeView={activeView}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />

      {!isLoggedIn ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : isOrganiser ? (
        <OrganiserDashboard initialTab={activeView} />
      ) : isCustomer ? (
        <>
          {activeView === 'events' && (
            <Events onViewShows={handleViewShows} />
          )}

          {activeView === 'shows' && selectedEvent && (
            <Shows
              eventId={selectedEvent.id}
              eventTitle={selectedEvent.title}
              onBack={handleBackToEvents}
              onSelectShow={handleSelectShow}
            />
          )}

          {activeView === 'seatmap' && selectedShow && selectedEvent && (
            <SeatMap
              show={selectedShow}
              eventTitle={selectedEvent.title}
              onBack={handleBackToShows}
              onBookingSuccess={handleBookingSuccess}
            />
          )}

          {activeView === 'confirmation' && lastBooking && (
            <BookingConfirmation
              booking={lastBooking}
              eventTitle={selectedEvent?.title}
              venueName={selectedShow?.venue?.name}
              showTime={selectedShow?.startTime}
              onViewMyBookings={() => setActiveView('bookings')}
              onBrowseEvents={() => {
                setSelectedEvent(null)
                setSelectedShow(null)
                setActiveView('events')
              }}
            />
          )}

          {activeView === 'bookings' && (
            <MyBookings
              onBrowseEvents={() => {
                setSelectedEvent(null)
                setSelectedShow(null)
                setActiveView('events')
              }}
            />
          )}

          {activeView === 'waitlist' && (
            <Waitlist
              onBookingSuccess={handleBookingSuccess}
              onBrowseEvents={() => {
                setSelectedEvent(null)
                setSelectedShow(null)
                setActiveView('events')
              }}
            />
          )}
        </>
      ) : null}
    </>
  )
}

export default App