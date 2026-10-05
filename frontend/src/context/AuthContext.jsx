import { createContext, useContext, useEffect, useState } from "react";
import { AUTH_UNAUTHORIZED_EVENT, api } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function handleUnauthorized() {
      localStorage.removeItem("eduflow-token");
      setUser(null);
      setLoading(false);
    }

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);

    const token = localStorage.getItem("eduflow-token");
    if (!token) {
      setLoading(false);
      return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    }

    api
      .get("/api/users/me")
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem("eduflow-token");
        setUser(null);
      })
      .finally(() => setLoading(false));

    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  async function login(credentials) {
    const data = await api.post("/api/auth/login", credentials);
    localStorage.setItem("eduflow-token", data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    return api.post("/api/auth/register", payload);
  }

  async function logout() {
    try {
      await api.post("/api/auth/logout", {});
    } catch (_error) {
      // Local logout must still work if the session is already invalid or the server is unavailable.
    }

    localStorage.removeItem("eduflow-token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
