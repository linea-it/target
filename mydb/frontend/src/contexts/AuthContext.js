"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { api, getEnvironmentSettings } from "@/services/Api";
import { getLoggedUser, LogoutUser } from "@/services/User";

export const AuthContext = createContext({});

// Helpers para cookies no client
function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="))
    ?.split("=")[1];
}

function deleteCookie(name) {
  document.cookie = `${name}=; Max-Age=0; path=/`;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState();
  const [settings, setSettings] = useState({});

  useEffect(() => {
    const access_token = getCookie("target.csrftoken");

    if (Object.keys(settings).length === 0) {
      getEnvironmentSettings()
        .then((res) => {
          const tempSettings = res.data;
          setSettings(tempSettings);

          // Verifica se o usuário já está logado
          if (access_token && !user) {
            getLoggedUser()
              .then((res) => setUser(res.data))
              .catch(() => {
                deleteCookie("target.csrftoken");
                window.location.href = tempSettings.login_url;
              });
          } else {
            window.location.href = tempSettings.login_url;
          }
        })
        .catch((err) => console.error("Erro ao recuperar settings", err));
    }
  }, []);

  function logout() {
    const csrftoken = getCookie("target.csrftoken");
    if (csrftoken) {
      LogoutUser()
        .then(() => console.log("Backend Logout Success"))
        .catch(() => console.log("Failed on Backend logout."));
    }

    deleteCookie("target.csrftoken");
    deleteCookie("sessionid");
    setUser(null);

    delete api.defaults.headers.Authorization;
    delete api.defaults.headers["X-CSRFToken"];

    window.location.href = "/";
    window.location.reload();
  }

  return (
    <AuthContext.Provider value={{ user, logout, settings }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
