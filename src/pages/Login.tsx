import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, LogIn } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";

const ease = [0.16, 1, 0.3, 1] as const;

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    setError("");
    const err = await login(email, password);
    if (err) { setError(err); setLoading(false); }
    else navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }} className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "hsl(350 85% 10%)", border: "1px solid hsl(350 85% 30%)" }}>
              <LogIn size={20} className="text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Welcome back</h1>
            <p className="text-xs text-muted-foreground mt-1">Sign in to your NetherNodes account</p>
          </div>

          <form onSubmit={handleSubmit} className="glass-surface rounded-sm p-6 space-y-4" style={{ border: "1px solid hsl(0 0% 16%)" }}>
            <div>
              <label className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider block mb-1.5">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"
                className="w-full rounded-sm px-3 py-2.5 text-sm text-foreground bg-transparent outline-none transition-all"
                style={{ border: "1px solid hsl(0 0% 22%)" }}
                onFocus={e => (e.currentTarget.style.borderColor = "hsl(350 85% 45%)")}
                onBlur={e => (e.currentTarget.style.borderColor = "hsl(0 0% 22%)")} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider">Password</label>
                <Link to="/forgot-password" className="text-[10px] text-primary/70 hover:text-primary transition-colors">Forgot password?</Link>
              </div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password"
                className="w-full rounded-sm px-3 py-2.5 text-sm text-foreground bg-transparent outline-none transition-all"
                style={{ border: "1px solid hsl(0 0% 22%)" }}
                onFocus={e => (e.currentTarget.style.borderColor = "hsl(350 85% 45%)")}
                onBlur={e => (e.currentTarget.style.borderColor = "hsl(0 0% 22%)")} />
            </div>

            {error && (
              <div className="rounded-sm px-3 py-2 text-xs" style={{ background: "hsl(350 85% 8%)", border: "1px solid hsl(350 85% 25%)", color: "hsl(350 85% 65%)" }}>
                {error}
                {error.includes("verify your email") && (
                  <Link to="/resend-verification" className="block mt-1 underline text-primary/80">Resend verification email</Link>
                )}
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full h-10 rounded-sm text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-50" style={{ background: "hsl(350 85% 45%)", color: "white" }}>
              {loading ? <><Loader2 size={14} className="animate-spin" /> Signing in…</> : "Sign In"}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:brightness-125 transition-all">Sign up</Link>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
