import { useState } from 'react'
import RegisterScreen from './pages/RegisterScreen'
import RideListScreen from './pages/RideListScreen'

// Screen switching is deliberately minimal. It moves to a router once the
// login screen joins it and these screens need their own URLs.
function App() {
  const [user, setUser] = useState(null)

  if (user) {
    return <RideListScreen user={user} onLogout={() => setUser(null)} />
  }

  return <RegisterScreen onRegistered={setUser} />
}

export default App
