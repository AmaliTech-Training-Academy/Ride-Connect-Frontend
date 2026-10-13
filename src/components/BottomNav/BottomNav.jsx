import { useLocation, useNavigate } from 'react-router-dom'
import './BottomNav.css'

const ITEMS = [
  { label: 'Find', path: '/find-a-ride', icon: 'fa-magnifying-glass' },
  { label: 'My Rides', path: '/my-rides', icon: 'fa-car-side' },
  { label: 'Offer', path: '/offer-a-ride', icon: 'fa-plus' },
]

/**
 * Phone navigation, pinned to the bottom of the screen.
 *
 * On a narrow viewport the floating header had to wrap to three rows to fit
 * the same controls, which cost a fifth of the screen and pushed the hero text
 * underneath it. Moving navigation down here keeps the header to a single row
 * and puts the destinations within reach of a thumb.
 *
 * The account control is passed in already built rather than rebuilt from its
 * handlers, so there is only ever one of it mounted and the header and the bar
 * cannot drift apart.
 */
function BottomNav({ profile }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {ITEMS.map(({ label, path, icon }) => {
        const isActive = pathname.startsWith(path)
        return (
          <button
            key={path}
            type="button"
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => navigate(path)}
          >
            <i className={`fa-solid ${icon}`} aria-hidden="true" />
            <span>{label}</span>
          </button>
        )
      })}
      {profile}
    </nav>
  )
}

export default BottomNav
