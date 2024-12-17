import { createContext, useEffect, useState, useContext } from 'react'

export const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState({ username: 'glauber' })

  // useEffect(() => {
  //     const user = localStorage.getItem('user')
  //     if (user) {
  //     setUser(JSON.parse(user))
  //     }
  // }, [])

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
