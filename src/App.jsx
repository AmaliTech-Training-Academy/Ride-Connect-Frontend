import { useState } from 'react'
import LoginScreen from './pages/LoginScreen'
import RideListScreen from './pages/RideListScreen'

// Screen switching is deliberately minimal. It moves to a router when the
// real ride listing lands and these screens need their own URLs.
function App() {
  const [user, setUser] = useState(null)

  if (user) {
    return <RideListScreen user={user} onLogout={() => setUser(null)} />
  }

  return <LoginScreen onLoggedIn={setUser} />
}

export default App
