import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import useWindowSize from '../hooks/useWindowSize'
import Sidebar from './Sidebar'

const PageLayout = ({ children, title }) => {
  const { colors } = useTheme()
  const { isMobile } = useWindowSize()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: colors.bg,
      transition: 'background-color 0.3s ease',
    }}>

      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}>

        {/* Top Bar */}
        <div style={{
          height: '56px',
          backgroundColor: colors.card,
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          gap: '12px',
        }}>

          {/* Left — hamburger on mobile + title */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: 0,
          }}>
            {/* Hamburger — mobile only */}
            {isMobile && (
              <button
                onClick={() => setMobileOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '22px',
                  cursor: 'pointer',
                  color: colors.text,
                  flexShrink: 0,
                  padding: '4px',
                }}
              >
                ☰
              </button>
            )}
            <h2 style={{
              fontSize: '15px',
              fontWeight: '600',
              color: colors.text,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {title}
            </h2>
          </div>

          {/* Right — date */}
          <span style={{
            fontSize: '12px',
            color: colors.textSub,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>

        {/* Page Content */}
        <div style={{
          flex: 1,
          padding: isMobile ? '16px' : '24px',
          overflowY: 'auto',
        }}>
          {children}
        </div>

      </div>
    </div>
  )
}

export default PageLayout