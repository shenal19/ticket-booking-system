import type { User } from '../types'

interface NavbarProps {
  isLoggedIn: boolean
  user: User | null
  activeView: string
  onNavigate: (view: string) => void
  onLogout: () => void
}

function Navbar({
  isLoggedIn,
  user,
  activeView,
  onNavigate,
  onLogout,
}: NavbarProps) {
  const isCustomer = user?.role === 'CUSTOMER'
  const isOrganiser = user?.role === 'ORGANISER' || user?.role === 'ADMIN'

  return (
    <nav className="navbar">
      <div
        className="navbar-brand"
        onClick={() => onNavigate(isOrganiser ? 'dashboard' : 'events')}
        style={{ cursor: 'pointer' }}
      >
        Ticket Booking System
      </div>

      <ul className="navbar-links">
        {isLoggedIn && isCustomer && (
          <>
            <li>
              <button
                type="button"
                className={`nav-link-btn ${activeView === 'events' ? 'active' : ''}`}
                onClick={() => onNavigate('events')}
              >
                Events
              </button>
            </li>

            <li>
              <button
                type="button"
                className={`nav-link-btn ${activeView === 'bookings' ? 'active' : ''}`}
                onClick={() => onNavigate('bookings')}
              >
                My Bookings
              </button>
            </li>

            <li>
              <button
                type="button"
                className={`nav-link-btn ${activeView === 'waitlist' ? 'active' : ''}`}
                onClick={() => onNavigate('waitlist')}
              >
                My Waitlist
              </button>
            </li>
          </>
        )}

        {isLoggedIn && isOrganiser && (
          <>
            <li>
              <button
                type="button"
                className={`nav-link-btn ${activeView === 'dashboard' ? 'active' : ''}`}
                onClick={() => onNavigate('dashboard')}
              >
                Dashboard
              </button>
            </li>

            <li>
              <button
                type="button"
                className={`nav-link-btn ${activeView === 'org-events' ? 'active' : ''}`}
                onClick={() => onNavigate('org-events')}
              >
                Events
              </button>
            </li>

            <li>
              <button
                type="button"
                className={`nav-link-btn ${activeView === 'org-shows' ? 'active' : ''}`}
                onClick={() => onNavigate('org-shows')}
              >
                Shows
              </button>
            </li>

            <li>
              <button
                type="button"
                className={`nav-link-btn ${activeView === 'org-venues' ? 'active' : ''}`}
                onClick={() => onNavigate('org-venues')}
              >
                Venues
              </button>
            </li>
          </>
        )}

        {isLoggedIn && (
          <li className="user-badge-container">
            <span className="user-role-badge">
              {user?.role}
            </span>
            <span className="user-email-text" title={user?.email}>
              {user?.name || user?.email}
            </span>
            <button
              type="button"
              className="logout-btn"
              onClick={onLogout}
            >
              Logout
            </button>
          </li>
        )}

        {!isLoggedIn && (
          <li>
            <button
              type="button"
              className="nav-link-btn active"
              onClick={() => onNavigate('login')}
            >
              Login / Register
            </button>
          </li>
        )}
      </ul>
    </nav>
  )
}

export default Navbar