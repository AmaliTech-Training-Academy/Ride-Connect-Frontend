import { Navigate } from 'react-router-dom'

function RedirectIfAuthed({ user, children }) {
  if (user) {
    return <Navigate to="/find-a-ride" replace />
  }

  return children
}

export default RedirectIfAuthed
