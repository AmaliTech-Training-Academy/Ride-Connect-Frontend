import { Navigate } from 'react-router-dom'

function RedirectIfAuthed({ user, children }) {
  if (user) {
    return <Navigate to="/offer-a-ride" replace />
  }

  return children
}

export default RedirectIfAuthed
