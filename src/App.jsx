import { useState } from 'react'
import LoginScreen from './pages/LoginScreen'
import RegisterScreen from './pages/RegisterScreen'
import RideListScreen from './pages/RideListScreen'

function App() {
  const [screen, setScreen] = useState('register')
  const [user, setUser] = useState(null)

  if (user) {
    return <RideListScreen user={user} onLogout={() => setUser(null)} />
  }

  if (screen === 'register') {
    return (
      <RegisterScreen
        onRegistered={setUser}
        onLoginClick={() => setScreen('login')}
      />
    )
  }

  return <LoginScreen onCreateAccount={() => setScreen('register')} />
import PostRideForm from './components/PostRideForm/PostRideForm'

function App() {
  return <PostRideForm />
}

export default App
