import { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react'

interface OwnerAuthContextType {
  ownerName: string | null
  ownerRole: string | null
  isAuthenticated: boolean
  login: (name: string, role?: string) => void
  logout: () => void
}

const OwnerAuthContext = createContext<OwnerAuthContextType | undefined>(undefined)

export function OwnerAuthProvider({ children }: PropsWithChildren) {
  const [ownerName, setOwnerName] = useState<string | null>(null)
  const [ownerRole, setOwnerRole] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Load from localStorage on mount
    const savedName = localStorage.getItem('ownerName')
    const savedRole = localStorage.getItem('ownerRole')
    if (savedName) {
      setOwnerName(savedName)
      setOwnerRole(savedRole || 'owner')
      setIsAuthenticated(true)
    }
  }, [])

  const login = (name: string, role = 'owner') => {
    setOwnerName(name)
    setOwnerRole(role)
    setIsAuthenticated(true)
    localStorage.setItem('ownerName', name)
    localStorage.setItem('ownerRole', role)
  }

  const logout = () => {
    setOwnerName(null)
    setOwnerRole(null)
    setIsAuthenticated(false)
    localStorage.removeItem('ownerName')
    localStorage.removeItem('ownerRole')
  }

  return (
    <OwnerAuthContext.Provider
      value={{
        ownerName,
        ownerRole,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </OwnerAuthContext.Provider>
  )
}

export function useOwnerAuth() {
  const context = useContext(OwnerAuthContext)
  if (!context) {
    throw new Error('useOwnerAuth must be used within OwnerAuthProvider')
  }
  return context
}
