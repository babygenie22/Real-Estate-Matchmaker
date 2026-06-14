import React, { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken, removeToken } from "./api";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: string | null;
  onboardingCompleted: boolean | null;
  location: string | null;
  budget: string | null;
  propertyType: string | null;
  preferredStyle: string | null;
  communicationStyle: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName?: string; lastName?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      let token = await getToken();
      // DEV-ONLY demo convenience: auto-login as the demo buyer so the app opens
      // without a login screen. Gated behind __DEV__ so it is stripped from any
      // production/release build (and never authenticates real users).
      if (!token && __DEV__) {
        try {
          const { token: t, user: u } = await api.post<{ token: string; user: User }>(
            "/api/auth/mobile/login",
            { email: "demo@homematch.test", password: "demo1234" }
          );
          await setToken(t);
          setUser(u);
          setIsLoading(false);
          return;
        } catch {
          setIsLoading(false);
          return;
        }
      }
      const u = await api.get<User>("/api/auth/user");
      setUser(u);
    } catch {
      await removeToken();
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const { token, user: u } = await api.post<{ token: string; user: User }>("/api/auth/mobile/login", { email, password });
    await setToken(token);
    setUser(u);
  }

  async function register(data: { email: string; password: string; firstName?: string; lastName?: string }) {
    const { token, user: u } = await api.post<{ token: string; user: User }>("/api/auth/mobile/register", data);
    await setToken(token);
    setUser(u);
  }

  async function logout() {
    await removeToken();
    setUser(null);
  }

  async function refreshUser() {
    try {
      const u = await api.get<User>("/api/auth/user");
      setUser(u);
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
