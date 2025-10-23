// 'use client'
// import { createContext, useEffect, useState, useContext } from 'react'
// // import { setCookie, parseCookies, destroyCookie } from 'nookies'
// import { getLoggedUser, LogoutUser } from '@/services/User'
// import { api, getEnvironmentSettings } from "@/services/Api";
// export const AuthContext = createContext({})

// export function AuthProvider({ children }) {
//   const [user, setUser] = useState()
//   const [settings, setSettings] = useState({})

//   useEffect(() => {
//     // TODO: Usando o cookie do target por que está usando o mesmo backend
//     const { 'target.csrftoken': access_token } = parseCookies()

//     // Recupera as variaveis de ambiente a partir do backend
//     if (Object.keys(settings).length === 0) {
//       getEnvironmentSettings().then(res => {
//         const tempSettings = res.data
//         setSettings(tempSettings)
//         // Verifica se o usuario ja esta logado
//         // Se o usuario ja estiver logado, recupera os dados do usuario
//         if (access_token && !user) {
//           getLoggedUser().then(res => {
//             setUser(res.data)
//           }).catch(err => {
//             // Se o token estiver expirado, remove o cookie
//             destroyCookie(null, 'target.csrftoken')
//             // Redireciona para a pagina de login
//             // window.location.href = '/admin/login/?next=/'
//             window.location.href = tempSettings.login_url
//           })
//         } else {
//           // window.location.href = '/admin/login/?next=/'
//           window.location.href = tempSettings.login_url
//         }
//       }).catch(err => {
//         console.log('Erro ao recuperar settings', err)
//       })
//     }
//   }, [])

//   function logout() {
//     const { 'target.csrftoken': csrftoken } = parseCookies()
//     if (csrftoken) {
//       LogoutUser()
//         .then(res => {
//           console.log('Backend Logout Success')
//         })
//         .catch(res => {
//           console.log('Failed on Backend logout.')
//         })
//     }

//     destroyCookie(null, 'target.csrftoken')
//     destroyCookie(null, 'sessionid') // Django session cookie
//     setUser(null)

//     delete api.defaults.headers.Authorization
//     delete api.defaults.headers['X-CSRFToken']

//     window.location.href = '/'
//     window.location.reload()
//   }

//   return (
//     <AuthContext.Provider value={{ user, logout, settings }}>
//       {children}
//     </AuthContext.Provider>
//   )
// }

// export const useAuth = () => useContext(AuthContext)
