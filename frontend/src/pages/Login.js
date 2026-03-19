import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import useWindowSize from '../hooks/useWindowSize'
import API from '../api/axios'
import toast from 'react-hot-toast'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const { login, supervisor } = useAuth()
  const { colors, isDark, toggleTheme } = useTheme()
  const { isMobile } = useWindowSize()
  const navigate = useNavigate()

  if (supervisor) {
    navigate('/dashboard')
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }
    try {
      setLoading(true)
      const response = await API.post('/auth/login', { email, password })
      login(response.data.token, response.data.supervisor)
      toast.success(`Welcome back, ${response.data.supervisor.name}!`)
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bg,
      transition: 'background-color 0.3s ease',
    }}>

      {/* Theme Toggle — top right */}
      <button
        onClick={toggleTheme}
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          backgroundColor: colors.accent,
          border: 'none',
          color: '#ffffff',
          padding: '8px 14px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px',
          zIndex: 10,
        }}
      >
        {isDark ? '☀️' : '🌙'}
      </button>

      {/* Login Card */}
      <div style={{
        backgroundColor: colors.card,
        borderRadius: isMobile ? '0' : '16px',
        padding: isMobile ? '40px 24px' : '48px 40px',
        width: '100%',
        maxWidth: isMobile ? '100%' : '400px',
        minHeight: isMobile ? '100vh' : 'auto',
        boxShadow: isDark
          ? '0 20px 60px rgba(0,0,0,0.5)'
          : '0 20px 60px rgba(0,0,0,0.15)',
        border: `1px solid ${colors.border}`,
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🍷</div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: colors.text,
            marginBottom: '6px',
          }}>
            Wine Shop
          </h1>
          <p style={{ color: colors.textSub, fontSize: '14px' }}>
            Supervisor Portal — Please sign in
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{
              fontSize: '13px',
              fontWeight: '600',
              color: colors.textSub,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={loading}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: `1px solid ${colors.inputBorder}`,
                backgroundColor: colors.input,
                color: colors.text,
                fontSize: '14px',
                outline: 'none',
                transition: 'border 0.2s',
              }}
            />
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{
              fontSize: '13px',
              fontWeight: '600',
              color: colors.textSub,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: `1px solid ${colors.inputBorder}`,
                backgroundColor: colors.input,
                color: colors.text,
                fontSize: '14px',
                outline: 'none',
                transition: 'border 0.2s',
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '13px',
              backgroundColor: loading ? colors.textSub : colors.accent,
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px',
              transition: 'background-color 0.2s',
              letterSpacing: '0.3px',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

        </form>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          marginTop: '24px',
          fontSize: '12px',
          color: colors.textSub,
        }}>
          Authorized personnel only
        </p>

      </div>
    </div>
  )
}

export default Login