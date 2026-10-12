import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Loader2, CheckCircle, ArrowLeft } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

const ResendVerification = () => {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to resend. Please try again."); return; }
      setSent(true);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="w-full max-w-sm"
      >
        {sent ? (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h1 className="text-lg font-bold text-foreground mb-2">Email Sent</h1>
            <p className="text-sm text-muted-foreground mb-6">
              A new verification link has been sent to <strong className="text-foreground">{email}</strong>. Check your inbox and spam folder.
            </p>
            <Link to="/login" className="text-sm text-primary hover:brightness-125 transition-all">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "hsl(350 85% 10%)", border: "1px solid hsl(350 85% 30%)" }}>
                <Mail size={20} className="text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground mb-2">Resend Verification</h1>
              <p className="text-sm text-muted-foreground">
                Enter the email address you signed up with and we'll send a new verification link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(""); }}
                  placeholder="you@example.com"
                  autoFocus
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
                disabled={loading || !email.trim()}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-sm text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: "hsl(350 85% 45%)", color: "white" }}
              >
                {loading
                  ? <><Loader2 size={14} className="animate-spin" /> Sending…</>
                  : <><Mail size={14} /> Send Verification Email</>}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/login" className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft size={12} /> Back to Sign In
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ResendVerification;
