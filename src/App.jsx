import { useState } from 'react'
import PostRideForm from './components/PostRideForm/PostRideForm'
import FindARide from './pages/FindARide'
import LoginScreen from './pages/LoginScreen'
import RegisterScreen from './pages/RegisterScreen'

function App() {
  const [screen, setScreen] = useState('register')
  const [user, setUser] = useState(null)
  const [rideScreen, setRideScreen] = useState('post')
  const [highlightedRideId, setHighlightedRideId] = useState(null)

  const handleUnauthorized = () => {
    setUser(null)
    setScreen('login')
  }

  if (user) {
    return rideScreen === 'find' ? (
      <FindARide
        onOfferRide={() => setRideScreen('post')}
        currentUserId={user?.id}
        highlightedRideId={highlightedRideId}
        onUnauthorized={handleUnauthorized}
      />
    ) : (
      <PostRideForm
        onFindRide={(rideId) => {
          setHighlightedRideId(rideId)
          setRideScreen('find')
        }}
        onUnauthorized={handleUnauthorized}
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
