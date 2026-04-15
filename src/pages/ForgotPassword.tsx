import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Mail } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Please enter your email."); return; }
    setLoading(true); setError("");
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setDone(true);
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "hsl(350 85% 10%)", border: "1px solid hsl(350 85% 30%)" }}>
            <Mail size={20} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Forgot Password</h1>
          <p className="text-xs text-muted-foreground mt-1">Enter your email and we'll send a reset link</p>
        </div>

        {done ? (
          <div className="glass-surface rounded-sm p-6 text-center" style={{ border: "1px solid hsl(142 60% 25%)" }}>
            <p className="text-sm text-foreground mb-1">Check your inbox</p>
            <p className="text-xs text-muted-foreground mb-4">If an account exists for <strong>{email}</strong>, a reset link has been sent.</p>
            <Link to="/login" className="text-sm text-primary hover:brightness-125 transition-all">Back to Sign In</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-surface rounded-sm p-6 space-y-4" style={{ border: "1px solid hsl(0 0% 16%)" }}>
            <div>
              <label className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider block mb-1.5">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                className="w-full rounded-sm px-3 py-2.5 text-sm text-foreground bg-transparent outline-none transition-all"
                style={{ border: "1px solid hsl(0 0% 22%)" }}
                onFocus={e => (e.currentTarget.style.borderColor = "hsl(350 85% 45%)")}
                onBlur={e => (e.currentTarget.style.borderColor = "hsl(0 0% 22%)")} />
            </div>
            {error && <p className="text-xs" style={{ color: "hsl(350 85% 60%)" }}>{error}</p>}
            <button type="submit" disabled={loading} className="w-full h-10 rounded-sm text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-50" style={{ background: "hsl(350 85% 45%)", color: "white" }}>
              {loading ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : "Send Reset Link"}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              <Link to="/login" className="text-primary hover:brightness-125 transition-all">Back to Sign In</Link>
            </p>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
