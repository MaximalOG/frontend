import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, UserPlus } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";

const ease = [0.16, 1, 0.3, 1] as const;

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { setError("Please fill in all fields."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError("");
    const err = await signup(name, email, password);
    if (err) { setError(err); setLoading(false); }
    else navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "hsl(350 85% 10%)", border: "1px solid hsl(350 85% 30%)" }}
            >
              <UserPlus size={20} className="text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Create your account</h1>
            <p className="text-xs text-muted-foreground mt-1">Start your Minecraft server in 60 seconds</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="glass-surface rounded-sm p-6 space-y-4"
            style={{ border: "1px solid hsl(0 0% 16%)" }}
          >
            <div>
              <label className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider block mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                className="w-full rounded-sm px-3 py-2.5 text-sm text-foreground bg-transparent outline-none transition-all"
                style={{ border: "1px solid hsl(0 0% 22%)" }}
                onFocus={e => (e.currentTarget.style.borderColor = "hsl(350 85% 45%)")}
                onBlur={e => (e.currentTarget.style.borderColor = "hsl(0 0% 22%)")}
              />
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider block mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-sm px-3 py-2.5 text-sm text-foreground bg-transparent outline-none transition-all"
                style={{ border: "1px solid hsl(0 0% 22%)" }}
                onFocus={e => (e.currentTarget.style.borderColor = "hsl(350 85% 45%)")}
                onBlur={e => (e.currentTarget.style.borderColor = "hsl(0 0% 22%)")}
              />
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider block mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                className="w-full rounded-sm px-3 py-2.5 text-sm text-foreground bg-transparent outline-none transition-all"
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
              {loading ? <><Loader2 size={14} className="animate-spin" /> Creating account…</> : "Create Account"}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:brightness-125 transition-all">
                Sign in
              </Link>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;
