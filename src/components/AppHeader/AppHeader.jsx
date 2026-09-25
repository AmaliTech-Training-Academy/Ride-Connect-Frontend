import { useLocation, useNavigate } from 'react-router-dom'
import NotificationsBell from '../NotificationsBell/NotificationsBell'
import UserMenu from '../UserMenu/UserMenu'
import './AppHeader.css'

const NAV_ITEMS = [
  { label: 'Find a Ride', path: '/find-a-ride' },
  { label: 'My Rides', path: '/my-rides' },
]

function AppHeader({ userInitials, onLogout }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <header className="site-header">
      <button
        type="button"
        className="site-header-brand"
        onClick={() => navigate('/find-a-ride')}
      >
        <span className="site-header-logo" aria-hidden="true">
          <i className="fa-solid fa-car-side" />
        </span>
        <span>RideConnect</span>
      </button>

      <nav className="site-header-nav" aria-label="Main navigation">
        {NAV_ITEMS.map(({ label, path }) => {
          const isActive = pathname.startsWith(path)
          return (
            <button
              key={path}
              type="button"
              className={`site-header-nav-link ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => navigate(path)}
            >
              {label}
            </button>
          )
        })}
      </nav>

      <div className="site-header-actions">
        <button
          type="button"
          className="site-header-offer"
          aria-current={
            pathname.startsWith('/offer-a-ride') ? 'page' : undefined
          }
          onClick={() => navigate('/offer-a-ride')}
        >
          <i className="fa-solid fa-plus" aria-hidden="true" /> Offer a Ride
        </button>
        <div className="site-header-profile">
          <NotificationsBell
            className="site-header-icon-button"
            onOpenRide={(rideId, audience) =>
              navigate(`/my-rides?manage=${rideId}&tab=${audience}`)
            }
          />
          <UserMenu initials={userInitials || '?'} onLogout={onLogout} />
        </div>
      </div>
    </header>
  )
}

export default AppHeader
