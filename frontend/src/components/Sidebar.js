import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import useWindowSize from '../hooks/useWindowSize'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard',   icon: '📊' },
  { path: '/stock',     label: 'Stock Entry', icon: '📦' },
  { path: '/sales',     label: 'Sales',       icon: '💰' },
  { path: '/inventory', label: 'Inventory',   icon: '🗂️' },
  { path: '/report', label: 'Report', icon: '📄' },
]

const ADMIN_ITEMS = [
  { path: '/users', label: 'Users', icon: '👥' },
]

const Sidebar = ({ mobileOpen, onClose }) => {
  const { supervisor, logout } = useAuth()
  const { colors, isDark, toggleTheme } = useTheme()
  const { isMobile, isTablet } = useWindowSize()
  const location = useLocation()
  const navigate = useNavigate()

  const collapsed = isTablet
  const sidebarWidth = isMobile ? '240px' : collapsed ? '64px' : '220px'

  const handleLogout = () => {
    logout()
    toast.success('Logged out!')
    navigate('/login')
  }

  const allLinks = supervisor?.role === 'admin'
    ? [...NAV_ITEMS, ...ADMIN_ITEMS]
    : NAV_ITEMS

  const handleLinkClick = () => {
    if (isMobile) onClose()
  }

  const sidebarContent = (
    <div style={{
      width: sidebarWidth,
      height: '100%',
      backgroundColor: colors.navbar,
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s ease',
      overflow: 'hidden',
    }}>

      {/* Logo */}
      <div style={{
        padding: collapsed ? '20px 0' : '24px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: '10px',
      }}>
        {!collapsed && (
          <div>
            <div style={{
              fontSize: '17px',
              fontWeight: '700',
              color: '#ffffff',
            }}>
              🍷 Wine Shop
            </div>
            <div style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.55)',
              marginTop: '2px',
            }}>
              Supervisor Portal
            </div>
          </div>
        )}
        {collapsed && (
          <span style={{ fontSize: '22px' }}>🍷</span>
        )}
        {/* Close button on mobile */}
        {isMobile && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Nav Links */}
      <nav style={{
        padding: collapsed ? '12px 8px' : '12px 10px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        overflowY: 'auto',
      }}>
        {allLinks.map(link => {
          const isActive = location.pathname === link.path
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={handleLinkClick}
              title={collapsed ? link.label : ''}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: '10px',
                padding: collapsed ? '12px 0' : '10px 14px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: isActive ? '600' : '400',
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.65)',
                backgroundColor: isActive
                  ? 'rgba(255,255,255,0.18)'
                  : 'transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '18px', flexShrink: 0 }}>
                {link.icon}
              </span>
              {!collapsed && link.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div style={{
        padding: collapsed ? '12px 8px' : '16px',
        borderTop: '1px solid rgba(255,255,255,0.12)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: collapsed ? 'center' : 'stretch',
      }}>

        {/* User Info — hide when collapsed */}
        {!collapsed && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 4px',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              color: '#ffffff',
              fontWeight: '600',
              flexShrink: 0,
            }}>
              {supervisor?.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {supervisor?.name}
              </div>
              <div style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.55)',
                textTransform: 'capitalize',
              }}>
                {supervisor?.role}
              </div>
            </div>
          </div>
        )}

        {/* Avatar only when collapsed */}
        {collapsed && (
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: '#ffffff',
            fontWeight: '600',
          }}>
            {supervisor?.name?.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Light Mode' : 'Dark Mode'}
          style={{
            width: collapsed ? '40px' : '100%',
            height: '36px',
            backgroundColor: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: collapsed ? '16px' : '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          {isDark ? '☀️' : '🌙'}
          {!collapsed && (isDark ? ' Light Mode' : ' Dark Mode')}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Logout"
          style={{
            width: collapsed ? '40px' : '100%',
            height: '36px',
            backgroundColor: 'transparent',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '8px',
            color: 'rgba(255,255,255,0.8)',
            fontSize: collapsed ? '16px' : '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {collapsed ? '🚪' : 'Logout'}
        </button>

      </div>
    </div>
  )

  // Mobile — overlay drawer
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {mobileOpen && (
          <div
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 200,
            }}
          />
        )}
        {/* Drawer */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          zIndex: 201,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
        }}>
          {sidebarContent}
        </div>
      </>
    )
  }

  // Desktop/Tablet — static sidebar
  return (
    <div style={{
      height: '100vh',
      position: 'sticky',
      top: 0,
      flexShrink: 0,
    }}>
      {sidebarContent}
    </div>
  )
}

export default Sidebar