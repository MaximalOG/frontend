import { useState, useEffect, useCallback } from "react";

export interface AdminUser {
  id: string;
  username: string;
  role: "owner" | "staff";
  permissions: string[];
}

const TOKEN_KEY = "nn_admin_token";

export function useAdminAuth() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const token = () => localStorage.getItem(TOKEN_KEY) || "";

  const check = useCallback(async () => {
    const t = token();
    if (!t) { setLoading(false); return; }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/me`, { headers: { "x-admin-token": t } });
      if (res.ok) setUser(await res.json());
      else { localStorage.removeItem(TOKEN_KEY); setUser(null); }
    } catch { setUser(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { check(); }, [check]);

  const login = async (username: string, password: string): Promise<string | null> => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) return data.error || "Login failed";
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return null;
  };

  const logout = async () => {
    await fetch(`${import.meta.env.VITE_API_URL}/api/admin/logout`, { method: "POST", headers: { "x-admin-token": token() } });
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  const hasPermission = (perm: string) =>
    user?.role === "owner" || user?.permissions.includes(perm) || false;

  const isOwner = user?.role === "owner";

  return { user, loading, login, logout, hasPermission, isOwner, token };
}
