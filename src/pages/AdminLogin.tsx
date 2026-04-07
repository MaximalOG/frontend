import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Loader2 } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const ease = [0.16, 1, 0.3, 1] as const;

const AdminLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError("Enter username and password."); return; }
    setLoading(true);
    setError("");
    const err = await login(username, password);
    if (err) { setError(err); setLoading(false); }
    else navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "hsl(350 85% 10%)", border: "1px solid hsl(350 85% 30%)" }}>
            <Lock size={20} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">NetherNodes Admin</h1>
          <p className="text-xs text-muted-foreground mt-1">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-surface rounded-sm p-6 space-y-4"
          style={{ border: "1px solid hsl(0 0% 16%)" }}>
          <div>
            <label className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider block mb-1.5">Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="username"
              className="w-full rounded-sm px-3 py-2.5 text-sm text-foreground bg-transparent outline-none"
              style={{ border: "1px solid hsl(0 0% 22%)" }}
              onFocus={e => (e.currentTarget.style.borderColor = "hsl(350 85% 45%)")}
              onBlur={e => (e.currentTarget.style.borderColor = "hsl(0 0% 22%)")}
            />
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider block mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              className="w-full rounded-sm px-3 py-2.5 text-sm text-foreground bg-transparent outline-none"
              style={{ border: "1px solid hsl(0 0% 22%)" }}
              onFocus={e => (e.currentTarget.style.borderColor = "hsl(350 85% 45%)")}
              onBlur={e => (e.currentTarget.style.borderColor = "hsl(0 0% 22%)")}
            />
          </div>

          {error && (
            <p className="text-xs" style={{ color: "hsl(350 85% 60%)" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-sm text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: "hsl(350 85% 45%)", color: "white" }}
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Signing in…</> : "Sign In"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
