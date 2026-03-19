import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children }) => {
  const { supervisor, loading } = useAuth()

  if (loading) return <div>Loading...</div>

  if (!supervisor) {
    return <Navigate to="/login" />
  }

  return children
}

export default ProtectedRoute