import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const AdminRoute = ({ children }) => {
  const { supervisor, loading } = useAuth()

  if (loading) return <div>Loading...</div>

  if (!supervisor) {
    return <Navigate to="/login" />
  }

  if (supervisor.role !== 'admin') {
    return <Navigate to="/dashboard" />
  }

  return children
}

export default AdminRoute