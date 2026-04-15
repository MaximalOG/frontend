import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

const VerifyEmail = () => {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setStatus("error"); setMessage("Invalid verification link."); return; }

    fetch(`${import.meta.env.VITE_API_URL}/api/auth/verify-email?token=${token}`)
      .then(async r => {
        const data = await r.json();
        if (r.ok) { setStatus("success"); setMessage("Your email has been verified. You can now sign in."); }
        else { setStatus("error"); setMessage(data.error || "Verification failed."); }
      })
      .catch(() => { setStatus("error"); setMessage("Something went wrong. Please try again."); });
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }} className="text-center max-w-sm">
        {status === "loading" && <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />}
        {status === "success" && <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />}
        {status === "error"   && <XCircle className="w-12 h-12 text-primary mx-auto mb-4" />}

        <h1 className="text-lg font-bold text-foreground mb-2">
          {status === "loading" ? "Verifying…" : status === "success" ? "Email Verified" : "Verification Failed"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>

        {status === "success" && (
          <Link to="/login" className="px-5 py-2 rounded-sm text-sm font-semibold transition-all hover:brightness-110" style={{ background: "hsl(350 85% 45%)", color: "white" }}>
            Sign In
          </Link>
        )}
        {status === "error" && (
          <Link to="/resend-verification" className="text-sm text-primary hover:brightness-125 transition-all">
            Resend verification email
          </Link>
        )}
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
