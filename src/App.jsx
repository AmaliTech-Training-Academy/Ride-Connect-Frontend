import { useState } from 'react'
import LoginScreen from './pages/LoginScreen'
import RegisterScreen from './pages/RegisterScreen'
import RideStatusManagement from './pages/RideStatusManagement'
import FindARide from './pages/FindARide'
import PostRideForm from './components/PostRideForm/PostRideForm'

function App() {
  const [screen, setScreen] = useState('register')
  const [user, setUser] = useState(null)
  const [rideView, setRideView] = useState('my-rides')

  const handleUnauthorized = () => {
    setUser(null)
    setScreen('login')
  }

  if (user) {
    if (rideView === 'find') {
      return (
        <FindARide
          onMyRides={() => setRideView('my-rides')}
          onOfferRide={() => setRideView('post')}
          currentUserId={user?.id}
          onUnauthorized={handleUnauthorized}
        />
      )
    }

    if (rideView === 'post') {
      return (
        <PostRideForm
          onMyRides={() => setRideView('my-rides')}
          onFindRide={() => setRideView('find')}
          onUnauthorized={handleUnauthorized}
        />
      )
    }

    return (
      <RideStatusManagement
        user={user}
        currentUserId={user?.id ?? user?.email}
        onLogout={handleUnauthorized}
        onFindRide={() => setRideView('find')}
        onOfferRide={() => setRideView('post')}
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
