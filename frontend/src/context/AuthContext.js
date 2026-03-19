import { createContext, useState, useContext, useEffect } from 'react'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [supervisor, setSupervisor] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedSupervisor = localStorage.getItem('supervisor')
    if (savedToken && savedSupervisor) {
      setToken(savedToken)
      setSupervisor(JSON.parse(savedSupervisor))
    }
    setLoading(false)
  }, [])

  const login = (token, supervisorData) => {
    localStorage.setItem('token', token)
    localStorage.setItem('supervisor', JSON.stringify(supervisorData))
    setToken(token)
    setSupervisor(supervisorData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('supervisor')
    setToken(null)
    setSupervisor(null)
  }

  return (
    <AuthContext.Provider value={{ supervisor, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook — easy way to use auth anywhere 
export const useAuth = () => useContext(AuthContext)