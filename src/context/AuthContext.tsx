import React, { createContext, useContext, useState, useEffect } from "react";
import { getTelegramInitData, isTelegramMiniApp as detectTelegramMiniApp } from "@/lib/telegram";

export interface User {
  id: number;
  telegramId: string;
  username: string;
  firstName: string;
  lastName: string;
  profilePhoto: string;
  languageCode: string;
  name: string;
  balance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  vipLevel: number;
  referralCode: string;
  isAdmin: boolean;
  isBanned: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isReady: boolean;
  isTelegramMiniApp: boolean;
  isAuthenticatingWithTelegram: boolean;
  authError: string;
  authenticateWithTelegram: (initData?: string) => Promise<void>;
  loginAsWebAdmin: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const API = "/api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("clickearn_token");
  });
  const [isReady, setIsReady] = useState(false);
  const [isTelegramMiniApp, setIsTelegramMiniApp] = useState(false);
  const [isAuthenticatingWithTelegram, setIsAuthenticatingWithTelegram] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const telegramAvailable = detectTelegramMiniApp();
    setIsTelegramMiniApp(telegramAvailable);

    const storedToken = localStorage.getItem("clickearn_token");
    if (storedToken) {
      setToken(storedToken);
      refreshUser(storedToken).then((ok) => {
        if (!ok && telegramAvailable) {
          authenticateWithTelegram().finally(() => setIsReady(true));
          return;
        }
        setIsReady(true);
      });
      return;
    }

    if (telegramAvailable) {
      authenticateWithTelegram().finally(() => setIsReady(true));
      return;
    }

    setIsReady(true);
  }, []);

  async function apiFetch(path: string, init?: RequestInit, explicitToken?: string) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const bearer = explicitToken ?? token;
    if (bearer) headers["Authorization"] = `Bearer ${bearer}`;
    const res = await fetch(`${API}${path}`, { ...init, headers: { ...headers, ...(init?.headers as any) } });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Request failed");
    }
    return res.json();
  }

  async function authenticateWithTelegram(initData?: string) {
    const telegramInitData = initData ?? getTelegramInitData();
    if (!telegramInitData) {
      setAuthError("Open this app from Telegram to continue.");
      throw new Error("Telegram session not found");
    }

    setIsAuthenticatingWithTelegram(true);
    try {
      setAuthError("");
      const data = await fetch(`${API}/auth/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: telegramInitData }),
      }).then(async (r) => {
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          throw new Error(e.error || "Telegram sign-in failed");
        }
        return r.json();
      });

      localStorage.setItem("clickearn_token", data.token);
      setToken(data.token);
      setUser(data.user);
      setAuthError("");
    } catch (error: any) {
      setAuthError(error?.message || "Telegram sign-in failed");
      throw error;
    } finally {
      setIsAuthenticatingWithTelegram(false);
    }
  }

  async function loginAsWebAdmin(username: string, password: string) {
    try {
      setAuthError("");
      const data = await fetch(`${API}/auth/web-admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      }).then(async (r) => {
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          throw new Error(e.error || "Admin sign-in failed");
        }
        return r.json();
      });

      localStorage.setItem("clickearn_token", data.token);
      setToken(data.token);
      setUser(data.user);
      setAuthError("");
    } catch (error: any) {
      setAuthError(error?.message || "Admin sign-in failed");
      throw error;
    }
  }

  async function refreshUser(explicitToken?: string): Promise<boolean> {
    try {
      if (typeof window === "undefined") return false;
      const storedToken = explicitToken ?? localStorage.getItem("clickearn_token");
      if (!storedToken) return false;
      const u = await apiFetch("/auth/me", undefined, storedToken);
      setToken(storedToken);
      setUser(u);
      setAuthError("");
      return true;
    } catch {
      logout();
      return false;
    }
  }

  function logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("clickearn_token");
    }
    setToken(null);
    setUser(null);
    setAuthError("");
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isReady,
      isTelegramMiniApp,
      isAuthenticatingWithTelegram,
      authError,
      authenticateWithTelegram,
      loginAsWebAdmin,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
