import { createContext, useState, useContext } from 'react'

const ThemeContext = createContext()

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark'
  })

  const toggleTheme = () => {
    setIsDark(prev => {
      localStorage.setItem('theme', !prev ? 'dark' : 'light')
      return !prev
    })
  }

  // Colors for light and dark mode
  const theme = {
    isDark,
    colors: isDark ? {
      // Dark mode
      bg:          '#1a1a2e',
      card:        '#16213e',
      cardHover:   '#1a2a4a',
      navbar:      '#0f0f1a',
      text:        '#ffffff',
      textSub:     '#aaaaaa',
      border:      '#2a2a4a',
      input:       '#16213e',
      inputBorder: '#2a2a4a',
      accent:      '#722f37',
      accentHover: '#8b3a44',
      success:     '#4CAF50',
      warning:     '#FF9800',
      danger:      '#f44336',
      info:        '#2196F3',
    } : {
      // Light mode
      bg:          '#f5f5f5',
      card:        '#ffffff',
      cardHover:   '#f9f9f9',
      navbar:      '#722f37',
      text:        '#1a1a2e',
      textSub:     '#666666',
      border:      '#eeeeee',
      input:       '#ffffff',
      inputBorder: '#dddddd',
      accent:      '#722f37',
      accentHover: '#8b3a44',
      success:     '#4CAF50',
      warning:     '#FF9800',
      danger:      '#f44336',
      info:        '#2196F3',
    }
  }

  return (
    <ThemeContext.Provider value={{ ...theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)