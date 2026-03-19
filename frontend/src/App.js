import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Stock from './pages/Stock'
import Sales from './pages/Sales'
import Users from './pages/Users'
import Report from './pages/Report'
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Protected */}
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/inventory" element={
              <ProtectedRoute><Inventory /></ProtectedRoute>
            } />
            <Route path="/stock" element={
              <ProtectedRoute><Stock /></ProtectedRoute>
            } />
            <Route path="/sales" element={
              <ProtectedRoute><Sales /></ProtectedRoute>
            } /><Route path="/report" element={
  <ProtectedRoute><Report /></ProtectedRoute>
} />

            {/* Admin only */}
            <Route path="/users" element={
              <AdminRoute><Users /></AdminRoute>
            } />

            {/* Default */}
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App