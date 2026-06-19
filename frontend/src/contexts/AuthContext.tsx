import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "../api/client";

interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("geomanager_token"));

  useEffect(() => {
    const savedUser = localStorage.getItem("geomanager_user");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  function persist(token: string, user: User) {
    localStorage.setItem("geomanager_token", token);
    localStorage.setItem("geomanager_user", JSON.stringify(user));
    setToken(token);
    setUser(user);
  }

  async function login(email: string, password: string) {
    const result = await api.login(email, password);
    persist(result.token, result.user);
  }

  async function register(email: string, password: string, name: string) {
    const result = await api.register(email, password, name);
    persist(result.token, result.user);
  }

  function logout() {
    localStorage.removeItem("geomanager_token");
    localStorage.removeItem("geomanager_user");
    setToken(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, token, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
