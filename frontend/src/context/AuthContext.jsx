import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("eduflow-token");
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/api/users/me")
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem("eduflow-token");
        setUser(null);
      })
      .finally(() => setLoading(false));
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

  function logout() {
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
