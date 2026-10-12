import './RideListScreen.css'

/**
 * Placeholder for the ride listing. It exists so that a successful login or
 * registration has somewhere to land; the real listing belongs to its own
 * story and replaces this wholesale.
 */
function RideListScreen({ user, onLogout }) {
  return (
    <main className="ride-list">
      <header className="ride-list-header">
        <h1>Find a Ride</h1>
        {user?.email && (
          <p className="ride-list-user">Signed in as {user.email}</p>
        )}
      </header>

      <p className="ride-list-empty">
        Ride listings are not built yet. You have been redirected here because
        your sign in succeeded.
      </p>

      <button type="button" className="ride-list-logout" onClick={onLogout}>
        Log out
      </button>
    </main>
  )
}

export default RideListScreen
