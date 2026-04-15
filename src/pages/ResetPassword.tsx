import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Lock } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

const ResetPassword = () => {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const token = params.get("token") || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirm) { setError("Please fill in both fields."); return; }
    if (password !== confirm)  { setError("Passwords do not match."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed.");
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "hsl(350 85% 10%)", border: "1px solid hsl(350 85% 30%)" }}>
            <Lock size={20} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Reset Password</h1>
          <p className="text-xs text-muted-foreground mt-1">Choose a new password for your account</p>
        </div>

        {done ? (
          <div className="glass-surface rounded-sm p-6 text-center" style={{ border: "1px solid hsl(142 60% 25%)" }}>
            <p className="text-sm text-foreground mb-1">Password reset successfully</p>
            <p className="text-xs text-muted-foreground">Redirecting to sign in…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-surface rounded-sm p-6 space-y-4" style={{ border: "1px solid hsl(0 0% 16%)" }}>
            {[
              { label: "New Password",     value: password, set: setPassword, placeholder: "Min. 8 chars, A-Z, 0-9" },
              { label: "Confirm Password", value: confirm,  set: setConfirm,  placeholder: "Repeat password" },
            ].map(f => (
              <div key={f.label}>
                <label className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider block mb-1.5">{f.label}</label>
                <input type="password" value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                  className="w-full rounded-sm px-3 py-2.5 text-sm text-foreground bg-transparent outline-none transition-all"
                  style={{ border: "1px solid hsl(0 0% 22%)" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "hsl(350 85% 45%)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "hsl(0 0% 22%)")} />
              </div>
            ))}
            {error && <p className="text-xs" style={{ color: "hsl(350 85% 60%)" }}>{error}</p>}
            <button type="submit" disabled={loading || !token} className="w-full h-10 rounded-sm text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-50" style={{ background: "hsl(350 85% 45%)", color: "white" }}>
              {loading ? <><Loader2 size={14} className="animate-spin" /> Resetting…</> : "Reset Password"}
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

export default ResetPassword;
