import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  emailVerified: boolean;
}

const TOKEN_KEY = "nn_user_token";
const USER_KEY = "nn_user";

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  const token = () => localStorage.getItem(TOKEN_KEY) || "";

  const verify = useCallback(async () => {
    const t = token();
    if (!t) { setLoading(false); return; }
    try {
      const data = await api.get<User>("/api/auth/me", { Authorization: `Bearer ${t}` });
      setUser(data);
      localStorage.setItem(USER_KEY, JSON.stringify(data));
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { verify(); }, [verify]);

  const login = async (email: string, password: string): Promise<string | null> => {
    try {
      const data = await api.post<{ token: string; user: User }>("/api/auth/login", { email, password });
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);
      return null;
    } catch (err) {
      return err instanceof ApiError ? err.message : "Login failed";
    }
  };

  const signup = async (name: string, username: string, email: string, password: string): Promise<string | null> => {
    try {
      const data = await api.post<{ token: string; user: User }>("/api/auth/signup", { name, username, email, password });
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);
      return null;
    } catch (err) {
      return err instanceof ApiError ? err.message : "Signup failed";
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  const setUserFromOAuth = (token: string, user: User) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setUser(user);
  };

  return { user, loading, login, signup, logout, token, setUserFromOAuth };
}
