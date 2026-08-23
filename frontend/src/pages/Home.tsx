/**
 * Home
 *
 * Landing page for Phase 1. Displays the application name and a
 * short description only. No authentication, booking, seat
 * selection, waitlist, or payment logic belongs here yet.
 */
function Home() {
  return (
    <main className="home">
      <h1>Ticket Booking System</h1>
      <p className="tagline">
        Book seats for movies and concerts — find a show, pick your seats,
        and get your ticket in minutes.
      </p>
      <p className="status-note">
        This is the Phase 1 project foundation. Core features are not yet
        implemented.
      </p>
    </main>
  )
}

export default Home
