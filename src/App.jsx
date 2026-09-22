import { useEffect, useState } from 'react'
import PostRideForm from './components/PostRideForm/PostRideForm'
import FindARide from './pages/FindARide'
import LoginScreen from './pages/LoginScreen'
import MyRidesDashboard from './pages/MyRidesDashboard'
import RegisterScreen from './pages/RegisterScreen'
import { onSessionExpired } from './lib/session'

function App() {
  const [screen, setScreen] = useState('register')
  const [user, setUser] = useState(null)
  const [rideScreen, setRideScreen] = useState('post')
  const [highlightedRideId, setHighlightedRideId] = useState(null)

  // Session expiry is announced by the API layer, so no screen has to
  // remember to handle a 401 of its own.
  useEffect(
    () =>
      onSessionExpired(() => {
        setUser(null)
        setScreen('login')
      }),
    [],
  )

  if (user) {
    if (rideScreen === 'my-rides') {
      return (
        <MyRidesDashboard
          onFindRide={() => setRideScreen('find')}
          onOfferRide={() => setRideScreen('post')}
        />
      )
    }

    return rideScreen === 'find' ? (
      <FindARide
        onOfferRide={() => setRideScreen('post')}
        onMyRides={() => setRideScreen('my-rides')}
        currentUserId={user?.id}
        highlightedRideId={highlightedRideId}
      />
    ) : (
      <PostRideForm
        onFindRide={(rideId) => {
          setHighlightedRideId(rideId)
          setRideScreen('find')
        }}
        onMyRides={() => setRideScreen('my-rides')}
      />
    )
  }

  if (screen === 'register') {
    return (
      <RegisterScreen
        onRegistered={setUser}
        onLoginClick={() => setScreen('login')}
      />
    )
  }

  return (
    <LoginScreen
      onCreateAccount={() => setScreen('register')}
      onLoggedIn={setUser}
    />
  )
}

export default App
