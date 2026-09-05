import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, MessageSquare, Check, X, Loader2,
  AlertCircle, Unlink, Link as LinkIcon, User,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

const ease = [0.16, 1, 0.3, 1] as const;

const AccountSettings = () => {
  const { user, loading: authLoading, token, logout } = useAuth();
  const navigate = useNavigate();

  const [discordId, setDiscordId]         = useState<string | null>(null);
  const [discordUsername, setDiscordUsername] = useState<string | null>(null);

  // Link form state
  const [code, setCode]             = useState("");
  const [linking, setLinking]       = useState(false);
  const [linkError, setLinkError]   = useState("");
  const [linkSuccess, setLinkSuccess] = useState(false);

  // Unlink state
  const [unlinking, setUnlinking]   = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { state: { from: "/settings" } });
  }, [authLoading, user, navigate]);

  // Load current discord link status from /api/auth/me
  useEffect(() => {
    if (!user) return;
    apiFetch("/api/auth/me", { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(data => {
        setDiscordId(data.discordId ?? null);
        setDiscordUsername(data.discordUsername ?? null);
      })
      .catch(() => {});
  }, [user, token, linkSuccess]);

  const handleLink = async () => {
    const clean = code.trim().toUpperCase();
    if (!clean) { setLinkError("Please enter your link code."); return; }
    if (!/^NN-[A-Z0-9]{6}$/.test(clean)) {
      setLinkError("Code format should be NN-XXXXXX. Check and try again.");
      return;
    }
    setLinking(true);
    setLinkError("");
    try {
      const res = await apiFetch("/api/account/link-discord", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ code: clean }),
      });
      const data = await res.json();
      if (!res.ok) { setLinkError(data.error || "Failed to link. Please try again."); return; }
      setLinkSuccess(true);
      setDiscordId(data.discordId);
      setDiscordUsername(data.discordUsername ?? null);
      setCode("");
    } catch { setLinkError("Network error. Please try again."); }
    finally { setLinking(false); }
  };

  const handleUnlink = async () => {
    if (!confirm("Unlink your Discord account?")) return;
    setUnlinking(true);
    try {
      await apiFetch("/api/account/link-discord", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      setDiscordId(null);
      setDiscordUsername(null);
      setLinkSuccess(false);
    } catch {}
    finally { setUnlinking(false); }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 max-w-2xl pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <Link to="/dashboard" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={13} /> Dashboard
            </Link>
            <span className="text-muted-foreground/30">/</span>
            <h1 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
              <User size={16} className="text-primary" /> Account Settings
            </h1>
          </div>

          {/* Account info card */}
          <div className="rounded-sm p-5 mb-5"
            style={{ background: "hsl(0 0% 6%)", border: "1px solid hsl(0 0% 14%)" }}>
            <p className="text-[9px] mono uppercase tracking-widest text-muted-foreground/40 mb-3">Your Account</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ background: "hsl(350 85% 25%)", color: "hsl(350 85% 70%)" }}>
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground/50 mono">@{user?.username} · {user?.email}</p>
              </div>
            </div>
          </div>

          {/* Discord linking card */}
          <div className="rounded-sm overflow-hidden"
            style={{ border: "1px solid hsl(0 0% 14%)" }}>
            <div className="px-5 py-4 flex items-center gap-3"
              style={{ background: "hsl(0 0% 7%)", borderBottom: "1px solid hsl(0 0% 12%)" }}>
              <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0"
                style={{ background: "hsl(235 85% 20%)", border: "1px solid hsl(235 85% 35%)" }}>
                <MessageSquare size={14} style={{ color: "hsl(235 85% 70%)" }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Discord Account</p>
                <p className="text-xs text-muted-foreground/50">Link your Discord to manage your servers from the bot.</p>
              </div>
              {discordId && (
                <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                  style={{ background: "hsl(142 60% 12%)", color: "hsl(142 65% 52%)", border: "1px solid hsl(142 60% 22%)" }}>
                  <Check size={9} /> Linked
                </div>
              )}
            </div>

            <div className="p-5" style={{ background: "hsl(0 0% 5%)" }}>
              {discordId ? (
                /* Already linked */
                <div>
                  <div className="flex items-center gap-3 p-3 rounded-sm mb-4"
                    style={{ background: "hsl(235 85% 8%)", border: "1px solid hsl(235 85% 22%)" }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "hsl(235 85% 25%)" }}>
                      <MessageSquare size={12} style={{ color: "hsl(235 85% 70%)" }} />
                    </div>
                    <div>
                      {discordUsername && (
                        <p className="text-sm font-semibold text-foreground">@{discordUsername}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/50 mono">Discord ID: {discordId}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground/50 mb-4">
                    Your Discord account is linked. You can now use <span className="text-foreground/70 mono">/mystatus</span>, <span className="text-foreground/70 mono">/restart</span>, and other bot commands.
                  </p>
                  <button onClick={handleUnlink} disabled={unlinking}
                    className="flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-medium transition-all hover:brightness-110 disabled:opacity-50"
                    style={{ background: "hsl(350 85% 10%)", color: "hsl(350 85% 55%)", border: "1px solid hsl(350 85% 22%)" }}>
                    {unlinking ? <Loader2 size={12} className="animate-spin" /> : <Unlink size={12} />}
                    Unlink Discord
                  </button>
                </div>
              ) : (
                /* Not linked */
                <div>
                  {linkSuccess ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-3 p-4 rounded-sm"
                      style={{ background: "hsl(142 60% 8%)", border: "1px solid hsl(142 60% 22%)" }}>
                      <Check size={18} className="text-green-400 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Discord linked!</p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">Check your Discord DMs for a confirmation message.</p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-sm p-4 text-xs text-muted-foreground/70 leading-relaxed"
                        style={{ background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 16%)" }}>
                        <p className="font-semibold text-foreground/80 mb-2">How to link:</p>
                        <ol className="space-y-1.5 list-decimal list-inside">
                          <li>Go to the <span className="text-foreground/70">NetherNodes Discord server</span></li>
                          <li>Run <span className="text-primary mono">/link</span> in any bot channel</li>
                          <li>Copy the 8-character code the bot gives you</li>
                          <li>Paste it below and click Link</li>
                        </ol>
                      </div>

                      <div>
                        <label className="text-[9px] mono uppercase tracking-wider text-muted-foreground/50 block mb-1.5">
                          Link Code from Discord
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={code}
                            onChange={e => { setCode(e.target.value.toUpperCase().slice(0, 9)); setLinkError(""); }}
                            onKeyDown={e => e.key === "Enter" && handleLink()}
                            placeholder="NN-XXXXXX"
                            maxLength={9}
                            className="flex-1 rounded-sm px-3 py-2.5 text-sm text-foreground bg-transparent outline-none mono tracking-widest"
                            style={{ border: "1px solid hsl(0 0% 22%)" }}
                            onFocus={e => (e.currentTarget.style.borderColor = "hsl(235 85% 50%)")}
                            onBlur={e => (e.currentTarget.style.borderColor = "hsl(0 0% 22%)")}
                          />
                          <button onClick={handleLink} disabled={linking || !code.trim()}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-sm text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-40"
                            style={{ background: "hsl(235 85% 45%)", color: "white" }}>
                            {linking
                              ? <><Loader2 size={13} className="animate-spin" /> Linking…</>
                              : <><LinkIcon size={13} /> Link</>
                            }
                          </button>
                        </div>
                        {linkError && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs"
                            style={{ color: "hsl(350 85% 60%)" }}>
                            <AlertCircle size={11} /> {linkError}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </motion.div>
      </div>
    </div>
  );
};

export default AccountSettings;
