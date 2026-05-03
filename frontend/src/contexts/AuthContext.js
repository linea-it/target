'use client'
import { createContext, useEffect, useState, useContext } from 'react'
import { parseCookies, destroyCookie } from 'nookies'
import { getLoggedUser, LogoutUser } from '@/services/User'
import { api, getEnvironmentSettings } from "@/services/Api";
export const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [settings, setSettings] = useState({})
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [authResolved, setAuthResolved] = useState(false)

  useEffect(() => {
    async function bootstrap() {
      try {
        // Primeira chamada da aplicacao: carregar settings globais
        const settingsResponse = await getEnvironmentSettings()
        const tempSettings = settingsResponse.data || {}
        setSettings(tempSettings)
      } catch (err) {
        console.log('Erro ao recuperar settings', err)
      } finally {
        setSettingsLoaded(true)
      }

      const { 'target.csrftoken': access_token } = parseCookies()
      if (!access_token) {
        setUser(null)
        setAuthResolved(true)
        return
      }

      try {
        const userResponse = await getLoggedUser()
        setUser(userResponse.data)
      } catch (err) {
        // Se o token estiver expirado, remove o cookie
        destroyCookie(null, 'target.csrftoken')
        setUser(null)
      } finally {
        setAuthResolved(true)
      }
    }

    bootstrap()
  }, [])

  function logout() {
    const { 'target.csrftoken': csrftoken } = parseCookies()
    if (csrftoken) {
      LogoutUser()
        .then(res => {
          console.log('Backend Logout Success')
        })
        .catch(res => {
          console.log('Failed on Backend logout.')
        })
    }

    destroyCookie(null, 'target.csrftoken')
    destroyCookie(null, 'sessionid') // Django session cookie
    setUser(null)

    delete api.defaults.headers.Authorization
    delete api.defaults.headers['X-CSRFToken']

    window.location.href = settings?.login_url || '/'
    window.location.reload()
  }

  return (
    <AuthContext.Provider value={{ user, logout, settings, settingsLoaded, authResolved }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
