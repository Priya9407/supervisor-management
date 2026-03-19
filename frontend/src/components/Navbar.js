import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'

const Navbar = () => {
  const { supervisor, logout } = useAuth()
  const { colors, isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  const navLinks = [
    { path: '/dashboard', label: '📊 Dashboard' },
    { path: '/stock',     label: '📦 Stock'     },
    { path: '/sales',     label: '💰 Sales'     },
    { path: '/inventory', label: '🗂️ Inventory' },
    ...(supervisor?.role === 'admin'
      ? [{ path: '/users', label: '👥 Users' }]
      : []
    ),
  ]

  return (
    <nav style={{
      backgroundColor: colors.navbar,
      padding: '0 24px',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>

      {/* Logo */}
      <div style={{
        color: '#ffffff',
        fontSize: '20px',
        fontWeight: '700',
      }}>
        🍷 Wine Shop
      </div>

      {/* Nav Links */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {navLinks.map(link => (
          <Link
            key={link.path}
            to={link.path}
            style={{
              color: location.pathname === link.path ? '#ffffff' : '#ffcccc',
              textDecoration: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: location.pathname === link.path ? '700' : '500',
              backgroundColor: location.pathname === link.path
                ? 'rgba(255,255,255,0.2)'
                : 'transparent',
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Right Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            backgroundColor: 'rgba(255,255,255,0.15)',
            border: 'none',
            color: '#ffffff',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        {/* User Name */}
        <span style={{ color: '#ffffff', fontSize: '14px' }}>
          {supervisor?.role === 'admin' ? '👑' : '👤'} {supervisor?.name}
        </span>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid rgba(255,255,255,0.5)',
            color: '#ffffff',
            padding: '6px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Logout
        </button>

      </div>
    </nav>
  )
}

export default Navbar