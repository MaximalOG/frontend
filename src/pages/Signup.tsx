import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, UserPlus, CheckCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";

const ease = [0.16, 1, 0.3, 1] as const;

const Signup = () => {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    setError("");
    const err = await signup(name, username, email, password);
    if (err) { setError(err); setLoading(false); }
    else setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }} className="w-full max-w-sm text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "hsl(142 60% 10%)", border: "1px solid hsl(142 60% 25%)" }}>
              <CheckCircle size={24} className="text-green-400" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Check your inbox</h1>
            <p className="text-sm text-muted-foreground mb-6">We sent a verification link to <strong className="text-foreground">{email}</strong>. Click it to activate your account.</p>
            <Link to="/login" className="text-sm text-primary hover:brightness-125 transition-all">Back to Sign In</Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }} className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "hsl(350 85% 10%)", border: "1px solid hsl(350 85% 30%)" }}>
              <UserPlus size={20} className="text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Create your account</h1>
            <p className="text-xs text-muted-foreground mt-1">Start your Minecraft server in 60 seconds</p>
          </div>

          <form onSubmit={handleSubmit} className="glass-surface rounded-sm p-6 space-y-4" style={{ border: "1px solid hsl(0 0% 16%)" }}>
            {[
              { label: "Full Name",  value: name,     set: setName,     type: "text",     placeholder: "Your name",          auto: "name" },
              { label: "Username",   value: username, set: setUsername, type: "text",     placeholder: "e.g. steve_mc",      auto: "username" },
              { label: "Email",      value: email,    set: setEmail,    type: "email",    placeholder: "you@example.com",    auto: "email" },
              { label: "Password",   value: password, set: setPassword, type: "password", placeholder: "Min. 8 chars, A-Z, 0-9", auto: "new-password" },
            ].map(f => (
              <div key={f.label}>
                <label className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider block mb-1.5">{f.label}</label>
                <input
                  type={f.type}
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  autoComplete={f.auto}
                  className="w-full rounded-sm px-3 py-2.5 text-sm text-foreground bg-transparent outline-none transition-all"
                  style={{ border: "1px solid hsl(0 0% 22%)" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "hsl(350 85% 45%)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "hsl(0 0% 22%)")}
                />
              </div>
            ))}

            <p className="text-[10px] text-muted-foreground/40">Username: 3–20 chars, letters/numbers/underscore only.</p>

            {error && <p className="text-xs" style={{ color: "hsl(350 85% 60%)" }}>{error}</p>}

            <button type="submit" disabled={loading} className="w-full h-10 rounded-sm text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-50" style={{ background: "hsl(350 85% 45%)", color: "white" }}>
              {loading ? <><Loader2 size={14} className="animate-spin" /> Creating account…</> : "Create Account"}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:brightness-125 transition-all">Sign in</Link>
            </p>

            {/* OAuth divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "hsl(0 0% 16%)" }} />
              <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">or sign up with</span>
              <div className="flex-1 h-px" style={{ background: "hsl(0 0% 16%)" }} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={`${import.meta.env.VITE_API_URL}/api/auth/google`}
                className="h-9 flex items-center justify-center gap-2 rounded-sm text-xs font-medium transition-all hover:brightness-110"
                style={{ background: "hsl(0 0% 10%)", border: "1px solid hsl(0 0% 20%)", color: "hsl(0 0% 75%)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
              </a>
              <a
                href={`${import.meta.env.VITE_API_URL}/api/auth/discord`}
                className="h-9 flex items-center justify-center gap-2 rounded-sm text-xs font-medium transition-all hover:brightness-110"
                style={{ background: "hsl(235 85% 20%)", border: "1px solid hsl(235 85% 35%)", color: "white" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                Discord
              </a>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;
