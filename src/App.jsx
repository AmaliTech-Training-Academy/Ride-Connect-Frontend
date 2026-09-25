import { useEffect, useState } from 'react'
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import AppHeader from './components/AppHeader/AppHeader'
import PostRideForm from './components/PostRideForm/PostRideForm'
import FindARide from './pages/FindARide'
import LoginScreen from './pages/LoginScreen'
import MyRidesDashboard from './pages/MyRidesDashboard'
import RegisterScreen from './pages/RegisterScreen'
import RequireAuth from './routes/RequireAuth'
import RedirectIfAuthed from './routes/RedirectIfAuthed'
import { getCurrentUser, logoutUser } from './services/auth'
import { onSessionExpired } from './lib/session'
import { initialsFrom } from './lib/myRides'

function App() {
  const [user, setUser] = useState(null)
  const [authStatus, setAuthStatus] = useState('checking')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { pathname } = useLocation()

  // The header stays mounted, so without this a new screen opens at the old
  // scroll position with its top hidden under the sticky header.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    let isMounted = true

    getCurrentUser()
      .then((currentUser) => {
        if (!isMounted) return
        setUser(currentUser)
        setAuthStatus(currentUser ? 'authenticated' : 'unauthenticated')
      })
      .catch(() => {
        if (!isMounted) return
        setUser(null)
        setAuthStatus('unauthenticated')
      })

    return () => {
      isMounted = false
    }
  }, [])

  const handleAuthenticated = (authenticatedUser) => {
    setUser(authenticatedUser)
    setAuthStatus('authenticated')
  }

  // Session expiry is announced by the API layer, so no screen has to
  // remember to handle a 401 of its own.
  useEffect(
    () =>
      onSessionExpired(() => {
        setUser(null)
        setAuthStatus('unauthenticated')
      }),
    [],
  )

  const handleLogout = async () => {
    try {
      await logoutUser()
    } catch (error) {
      // The server-side session may still be live, so local state must not
      // be cleared as if logout succeeded.
      console.error('Failed to log out:', error)
      return
    }
    setUser(null)
    setAuthStatus('unauthenticated')
    navigate('/login', { replace: true })
  }

  if (authStatus === 'checking') {
    return null
  }

  const userInitials = initialsFrom(user?.name || user?.email || '')

  return (
    <Routes>
      <Route
        path="/register"
        element={
          <RedirectIfAuthed user={user}>
            <RegisterScreen
              onRegistered={handleAuthenticated}
              onLoginClick={() => navigate('/login')}
            />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/login"
        element={
          <RedirectIfAuthed user={user}>
            <LoginScreen
              onCreateAccount={() => navigate('/register')}
              onLoggedIn={handleAuthenticated}
            />
          </RedirectIfAuthed>
        }
      />
      {/* One header for every signed-in screen, so it stays put on navigation. */}
      <Route
        element={
          <RequireAuth user={user}>
            <AppHeader userInitials={userInitials} onLogout={handleLogout} />
            <Outlet />
          </RequireAuth>
        }
      >
        <Route
          path="/offer-a-ride"
          element={
            <PostRideForm
              onFindRide={(rideId) =>
                navigate(
                  rideId ? `/find-a-ride?ride=${rideId}` : '/find-a-ride',
                )
              }
            />
          }
        />
        <Route
          path="/find-a-ride"
          element={
            <FindARide
              onOfferRide={() => navigate('/offer-a-ride')}
              onManageRide={(ride) => navigate(`/my-rides?manage=${ride.id}`)}
              currentUserId={user?.id}
              highlightedRideId={searchParams.get('ride')}
              userName={user?.name}
            />
          }
        />
        <Route
          path="/my-rides"
          element={
            <MyRidesDashboard
              onFindRide={() => navigate('/find-a-ride')}
              onOfferRide={() => navigate('/offer-a-ride')}
              managedRideId={searchParams.get('manage')}
              initialTab={searchParams.get('tab')}
            />
          }
        />
      </Route>
      <Route
        path="/"
        element={<Navigate to={user ? '/find-a-ride' : '/register'} replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
