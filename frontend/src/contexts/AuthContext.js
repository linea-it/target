'use client'
import { createContext, useEffect, useState, useContext } from 'react'
import { setCookie, parseCookies, destroyCookie } from 'nookies'
import { getLoggedUser, LogoutUser } from '@/services/User'
import { useRouter } from 'next/navigation'
import { api } from "@/services/Api";
export const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const router = useRouter()
  const [user, setUser] = useState()

  const isAuthenticated = !!user


  useEffect(() => {
    const { 'target.csrftoken': access_token } = parseCookies()

    if (access_token) {
      console.log('Tem access token')
      getLoggedUser().then(res => {
        console.log("Usuario Logado:", res.data)
        setUser(res.data)
      }).catch(err => {
        console.log('Erro ao recuperar usuario', err)
        // Se o token estiver expirado, remove o cookie
        destroyCookie(null, 'target.csrftoken')
        // Redireciona para a pagina de login
        window.location.href = '/admin/login/?next=/'
      })
    } else {
      console.log('Não tem access token')
      window.location.href = '/admin/login/?next=/'
    }
  }, [])


  // console.log('user', user)
  // console.log('isAuthenticated', isAuthenticated)

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

    window.location.href = '/'
    window.location.reload()
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
