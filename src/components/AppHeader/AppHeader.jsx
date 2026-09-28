import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import NotificationsBell from '../NotificationsBell/NotificationsBell'
import UserMenu from '../UserMenu/UserMenu'
import ChangePasswordPanel from '../ChangePasswordPanel/ChangePasswordPanel'
import { uploadImage } from '../../services/cloudinary'
import { updateProfileImage } from '../../services/auth'
import './AppHeader.css'

const NAV_ITEMS = [
  { label: 'Find a Ride', path: '/find-a-ride' },
  { label: 'My Rides', path: '/my-rides' },
]

function AppHeader({ userInitials, userImage, onLogout, onUserUpdated }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [isPasswordPanelOpen, setPasswordPanelOpen] = useState(false)
  const [isUploadingImage, setUploadingImage] = useState(false)
  const [toast, setToast] = useState(null)
  const passwordTriggerRef = useRef(null)

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const handleChangePicture = async (file) => {
    setUploadingImage(true)
    try {
      const imageUrl = await uploadImage(file)
      await updateProfileImage(imageUrl)
      onUserUpdated?.({ image: imageUrl })
      setToast({ tone: 'success', message: 'Profile picture updated.' })
    } catch (error) {
      setToast({
        tone: 'error',
        message: error?.message || 'Could not update your picture.',
      })
    } finally {
      setUploadingImage(false)
    }
  }

  const openPasswordPanel = (trigger) => {
    passwordTriggerRef.current = trigger
    setPasswordPanelOpen(true)
  }

  return (
    <>
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
            <UserMenu
              initials={userInitials || '?'}
              imageUrl={userImage}
              isUploadingImage={isUploadingImage}
              onChangePicture={handleChangePicture}
              onChangePassword={openPasswordPanel}
              onLogout={onLogout}
            />
          </div>
        </div>
      </header>

      {toast && (
        <div
          className={`site-header-toast site-header-toast-${toast.tone}`}
          role={toast.tone === 'error' ? 'alert' : 'status'}
        >
          <i
            className={
              toast.tone === 'error'
                ? 'fa-solid fa-circle-exclamation'
                : 'fa-solid fa-circle-check'
            }
            aria-hidden="true"
          />
          <span>{toast.message}</span>
        </div>
      )}

      {isPasswordPanelOpen && (
        <ChangePasswordPanel
          returnFocusTo={passwordTriggerRef}
          onClose={() => setPasswordPanelOpen(false)}
          onChanged={() => {
            setPasswordPanelOpen(false)
            setToast({
              tone: 'success',
              message: 'Your password has been updated.',
            })
          }}
        />
      )}
    </>
  )
}

export default AppHeader
