import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Server, ChevronRight, Check, Loader2, AlertCircle, Cpu, MemoryStick, HardDrive } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

const ease = [0.16, 1, 0.3, 1] as const;

interface ServerType {
  id: string;
  label: string;
  description: string;
}

interface ServerRecord {
  id: string;
  name: string;
  status: string;
  ram: string;
  cpu: string;
  ssd: string;
  plan: string;
  pendingSetup: boolean;
}

const MC_VERSIONS = [
  // ── 26.x — Java 25 (calendar versioning, 2026+) ─────────────────────────────
  { value: "26.2",    label: "26.2 (June 2026)",       java: "Java 25" },
  { value: "26.1",    label: "26.1 (May 2026)",        java: "Java 25" },
  // ── 1.21.x — Java 21 ────────────────────────────────────────────────────────
  { value: "1.21.11", label: "1.21.11 — Mounts of Mayhem",  java: "Java 21" },
  { value: "1.21.10", label: "1.21.10 — The Copper Age",    java: "Java 21" },
  { value: "1.21.9",  label: "1.21.9  — The Copper Age",   java: "Java 21" },
  { value: "1.21.8",  label: "1.21.8  — Chase the Skies",  java: "Java 21" },
  { value: "1.21.7",  label: "1.21.7  — Chase the Skies",  java: "Java 21" },
  { value: "1.21.6",  label: "1.21.6  — Chase the Skies",  java: "Java 21" },
  { value: "1.21.5",  label: "1.21.5  — Spring to Life",   java: "Java 21" },
  { value: "1.21.4",  label: "1.21.4  — The Garden Awakens", java: "Java 21" },
  { value: "1.21.3",  label: "1.21.3  — Bundles of Bravery", java: "Java 21" },
  { value: "1.21.2",  label: "1.21.2  — Bundles of Bravery", java: "Java 21" },
  { value: "1.21.1",  label: "1.21.1  — Tricky Trials",    java: "Java 21" },
  { value: "1.21",    label: "1.21    — Tricky Trials",     java: "Java 21" },
  // ── 1.20.x — Java 21 (1.20.5+) · Java 17 (1.20–1.20.4) ────────────────────
  { value: "1.20.6",  label: "1.20.6",                 java: "Java 21" },
  { value: "1.20.5",  label: "1.20.5",                 java: "Java 21" },
  { value: "1.20.4",  label: "1.20.4",                 java: "Java 17" },
  { value: "1.20.2",  label: "1.20.2",                 java: "Java 17" },
  { value: "1.20.1",  label: "1.20.1",                 java: "Java 17" },
  { value: "1.20",    label: "1.20",                   java: "Java 17" },
  // ── 1.19.x — Java 17 ────────────────────────────────────────────────────────
  { value: "1.19.4",  label: "1.19.4",                 java: "Java 17" },
  { value: "1.19.3",  label: "1.19.3",                 java: "Java 17" },
  { value: "1.19.2",  label: "1.19.2",                 java: "Java 17" },
  { value: "1.19.1",  label: "1.19.1",                 java: "Java 17" },
  { value: "1.19",    label: "1.19",                   java: "Java 17" },
  // ── 1.18.x — Java 17 ────────────────────────────────────────────────────────
  { value: "1.18.2",  label: "1.18.2",                 java: "Java 17" },
  { value: "1.18.1",  label: "1.18.1",                 java: "Java 17" },
  { value: "1.18",    label: "1.18",                   java: "Java 17" },
  // ── 1.17.x — Java 16 ────────────────────────────────────────────────────────
  { value: "1.17.1",  label: "1.17.1",                 java: "Java 16" },
  { value: "1.17",    label: "1.17",                   java: "Java 16" },
  // ── 1.16.x — Java 11 ────────────────────────────────────────────────────────
  { value: "1.16.5",  label: "1.16.5",                 java: "Java 11" },
  { value: "1.16.4",  label: "1.16.4",                 java: "Java 11" },
  { value: "1.16.3",  label: "1.16.3",                 java: "Java 11" },
  { value: "1.16.2",  label: "1.16.2",                 java: "Java 11" },
  { value: "1.16.1",  label: "1.16.1",                 java: "Java 11" },
  // ── 1.15.x — Java 8 ─────────────────────────────────────────────────────────
  { value: "1.15.2",  label: "1.15.2",                 java: "Java 8"  },
  { value: "1.15.1",  label: "1.15.1",                 java: "Java 8"  },
  { value: "1.15",    label: "1.15",                   java: "Java 8"  },
  // ── 1.14.x — Java 8 ─────────────────────────────────────────────────────────
  { value: "1.14.4",  label: "1.14.4",                 java: "Java 8"  },
  { value: "1.14.3",  label: "1.14.3",                 java: "Java 8"  },
  { value: "1.14.2",  label: "1.14.2",                 java: "Java 8"  },
  { value: "1.14.1",  label: "1.14.1",                 java: "Java 8"  },
  { value: "1.14",    label: "1.14",                   java: "Java 8"  },
  // ── 1.13.x — Java 8 ─────────────────────────────────────────────────────────
  { value: "1.13.2",  label: "1.13.2",                 java: "Java 8"  },
  { value: "1.13.1",  label: "1.13.1",                 java: "Java 8"  },
  { value: "1.13",    label: "1.13",                   java: "Java 8"  },
  // ── 1.12.x — Java 8 ─────────────────────────────────────────────────────────
  { value: "1.12.2",  label: "1.12.2",                 java: "Java 8"  },
  { value: "1.12.1",  label: "1.12.1",                 java: "Java 8"  },
  { value: "1.12",    label: "1.12",                   java: "Java 8"  },
  // ── 1.11.x — Java 8 ─────────────────────────────────────────────────────────
  { value: "1.11.2",  label: "1.11.2",                 java: "Java 8"  },
  { value: "1.11",    label: "1.11",                   java: "Java 8"  },
  // ── 1.10.x — Java 8 ─────────────────────────────────────────────────────────
  { value: "1.10.2",  label: "1.10.2",                 java: "Java 8"  },
  // ── 1.9.x — Java 8 ──────────────────────────────────────────────────────────
  { value: "1.9.4",   label: "1.9.4",                  java: "Java 8"  },
  { value: "1.9",     label: "1.9",                    java: "Java 8"  },
  // ── 1.8.x — Java 8 ──────────────────────────────────────────────────────────
  { value: "1.8.9",   label: "1.8.9",                  java: "Java 8"  },
  { value: "1.8.8",   label: "1.8.8",                  java: "Java 8"  },
  { value: "1.8",     label: "1.8",                    java: "Java 8"  },
];

const JAVA_VERSIONS = [
  { value: "Java 25", label: "Java 25 (26.1+)" },
  { value: "Java 21", label: "Java 21 (1.20.5 – 1.21.x)" },
  { value: "Java 17", label: "Java 17 (1.18 – 1.20.4)" },
  { value: "Java 16", label: "Java 16 (1.17.x)" },
  { value: "Java 11", label: "Java 11 (1.16.x)" },
  { value: "Java 8",  label: "Java 8  (1.8 – 1.15)" },
];

const SetupServer = () => {
  const { user, loading: authLoading, token } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const serverId = params.get("server");
  const orderId  = params.get("order");   // invoice order ID from payment redirect
  const planParam = params.get("plan");

  const [serverTypes,    setServerTypes]    = useState<ServerType[]>([]);
  const [pendingServer,  setPendingServer]  = useState<ServerRecord | null>(null);
  const [loadingInit,    setLoadingInit]    = useState(true);
  const [initError,      setInitError]      = useState("");

  // Form state
  const [serverName,  setServerName]  = useState("");
  const [serverType,  setServerType]  = useState("");
  const [mcVersion,   setMcVersion]   = useState("1.21.4");
  const [javaVersion, setJavaVersion] = useState("Java 21");

  const [step,        setStep]        = useState<1 | 2 | 3>(1);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done,        setDone]        = useState(false);

  // Redirect to login if not authenticated, preserving the full URL
  useEffect(() => {
    if (!authLoading && !user) {
      const returnTo = `/setup-server?order=${orderId || ""}&plan=${planParam || ""}&server=${serverId || ""}`;
      navigate("/login", { state: { from: returnTo } });
    }
  }, [authLoading, user, navigate, orderId, planParam, serverId]);

  // Load server types + find the pending server using orderId or serverId
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingInit(true);
      setInitError("");
      try {
        // Fetch server types
        const typesRes = await apiFetch("/api/server-types");
        if (typesRes.ok) setServerTypes(await typesRes.json());

        // Look up pending server — prefer orderId lookup (works even if userId wasn't set at payment time)
        let foundServer: ServerRecord | null = null;

        if (orderId) {
          // Use the dedicated pending endpoint that matches by invoiceOrderId and claims the server
          const pendingRes = await apiFetch(
            `/api/servers/pending?orderId=${encodeURIComponent(orderId)}`,
            { headers: { Authorization: `Bearer ${token()}` } }
          );
          if (pendingRes.ok) {
            const list: ServerRecord[] = await pendingRes.json();
            foundServer = list[0] ?? null;
          }
        }

        // Fall back: look through all servers by serverId or find first pending
        if (!foundServer) {
          const serversRes = await apiFetch("/api/servers", {
            headers: { Authorization: `Bearer ${token()}` },
          });
          if (serversRes.ok) {
            const all: ServerRecord[] = await serversRes.json();
            foundServer = serverId
              ? (all.find(s => s.id === serverId && s.pendingSetup) ?? null)
              : (all.find(s => s.pendingSetup) ?? null);
          }
        }

        if (foundServer) {
          setPendingServer(foundServer);
          setServerName(foundServer.name || `${foundServer.plan || planParam || ""} Server`);
        } else {
          setInitError("No server pending setup found. You may have already completed setup, or the payment is still processing — check your dashboard in a moment.");
        }
      } catch {
        setInitError("Failed to load server info. Please try again.");
      } finally {
        setLoadingInit(false);
      }
    })();
  }, [user, orderId, serverId, planParam]);

  const handleSubmit = async () => {
    if (!pendingServer) return;
    if (!serverType) { setSubmitError("Please select a server type."); return; }

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await apiFetch(`/api/servers/${pendingServer.id}/setup`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          Authorization:   `Bearer ${token()}`,
        },
        body: JSON.stringify({ serverName, serverType, mcVersion, javaVersion }),
      });

      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error || "Setup failed. Please try again."); setSubmitting(false); return; }

      setDone(true);
      setTimeout(() => navigate("/dashboard"), 3500);
    } catch {
      setSubmitError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  if (authLoading || loadingInit) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 max-w-lg pt-32 text-center">
          <AlertCircle className="w-10 h-10 text-primary mx-auto mb-4" />
          <p className="text-foreground font-semibold mb-2">Setup unavailable</p>
          <p className="text-sm text-muted-foreground mb-6">{initError}</p>
          <a href="/dashboard" className="inline-flex items-center gap-2 px-5 py-2 rounded-sm text-sm font-semibold transition-all hover:brightness-110"
            style={{ background: "hsl(350 85% 45%)", color: "white" }}>
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="text-center px-4">
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 220, delay: 0.1 }}
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: "hsl(142 60% 10%)", border: "2px solid hsl(142 60% 30%)" }}
          >
            <Check size={30} className="text-green-400" />
          </motion.div>
          <h2 className="text-xl font-bold text-foreground mb-2">Server is being created!</h2>
          <p className="text-sm text-muted-foreground mb-1">Pterodactyl is installing your server now.</p>
          <p className="text-xs text-muted-foreground/50">Redirecting to your dashboard…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />

      {/* Ambient glow */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(350 85% 40% / 0.08) 0%, transparent 70%)" }} />

      <div className="container mx-auto px-4 max-w-2xl pt-28">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <Server className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-bold text-foreground tracking-tight">Set Up Your Server</h1>
            </div>
            <p className="text-sm text-muted-foreground">Configure your <span className="text-foreground">{pendingServer?.plan}</span> server — takes about 60 seconds once submitted.</p>
          </div>

          {/* Plan specs bar */}
          {pendingServer && (
            <div className="rounded-sm px-4 py-3 mb-6 flex flex-wrap gap-4"
              style={{ background: "hsl(0 0% 7%)", border: "1px solid hsl(0 0% 14%)" }}>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MemoryStick size={12} className="text-primary" /> {pendingServer.ram}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Cpu size={12} className="text-primary" /> {pendingServer.cpu}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <HardDrive size={12} className="text-primary" /> {pendingServer.ssd}
              </span>
              <span className="ml-auto text-[10px] mono text-muted-foreground/40 uppercase tracking-wider">{pendingServer.plan} plan</span>
            </div>
          )}

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-8">
            {([1, 2, 3] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300"
                  style={{
                    background:   step > s ? "hsl(142 60% 15%)" : step === s ? "hsl(350 85% 45%)" : "hsl(0 0% 10%)",
                    border:       step > s ? "1px solid hsl(142 60% 35%)" : step === s ? "none" : "1px solid hsl(0 0% 20%)",
                    color:        step > s ? "hsl(142 70% 55%)" : "white",
                  }}
                >
                  {step > s ? <Check size={10} /> : s}
                </div>
                {i < 2 && <div className="flex-1 h-px w-8" style={{ background: step > s ? "hsl(142 60% 30%)" : "hsl(0 0% 16%)" }} />}
              </div>
            ))}
            <span className="ml-3 text-xs text-muted-foreground">
              {step === 1 ? "Server type" : step === 2 ? "Version & name" : "Review"}
            </span>
          </div>

          {/* Step content */}
          <AnimatePresence mode="wait">

            {/* ── Step 1: Server Type ── */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22, ease }}>
                <p className="text-sm font-semibold text-foreground mb-4">What kind of server do you want?</p>
                <div className="space-y-2">
                  {serverTypes.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setServerType(t.id)}
                      className="w-full text-left rounded-sm px-4 py-3.5 transition-all duration-200"
                      style={{
                        background:  serverType === t.id ? "hsl(350 85% 10%)" : "hsl(0 0% 7%)",
                        border:      serverType === t.id ? "1px solid hsl(350 85% 45%)" : "1px solid hsl(0 0% 14%)",
                        boxShadow:   serverType === t.id ? "0 0 16px hsl(350 85% 35% / 0.3)" : "none",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{t.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                        </div>
                        {serverType === t.id && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: "hsl(350 85% 45%)" }}>
                            <Check size={11} className="text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => serverType && setStep(2)}
                  disabled={!serverType}
                  className="mt-6 w-full h-11 flex items-center justify-center gap-2 rounded-sm text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-40"
                  style={{ background: "hsl(350 85% 45%)", color: "white" }}
                >
                  Continue <ChevronRight size={14} />
                </button>
              </motion.div>
            )}

            {/* ── Step 2: Version + Name ── */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22, ease }}>
                <div className="space-y-5">
                  {/* Server name */}
                  <div>
                    <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider block mb-2">Server Name</label>
                    <input
                      type="text"
                      value={serverName}
                      onChange={e => setServerName(e.target.value.slice(0, 48))}
                      placeholder="My Awesome Server"
                      maxLength={48}
                      className="w-full rounded-sm px-4 py-3 text-sm text-white bg-transparent outline-none"
                      style={{ border: "1px solid hsl(0 0% 20%)" }}
                      onFocus={e => (e.currentTarget.style.borderColor = "hsl(350 85% 45%)")}
                      onBlur={e  => (e.currentTarget.style.borderColor = "hsl(0 0% 20%)")}
                    />
                  </div>

                  {/* MC Version */}
                  <div>
                    <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider block mb-2">Minecraft Version</label>
                    <select
                      value={mcVersion}
                      onChange={e => {
                        const v = e.target.value;
                        setMcVersion(v);
                        // Auto-select the correct Java version for this MC version
                        const match = MC_VERSIONS.find(m => m.value === v);
                        if (match) setJavaVersion(match.java);
                      }}
                      className="w-full rounded-sm px-4 py-3 text-sm text-white outline-none appearance-none"
                      style={{ background: "hsl(0 0% 7%)", border: "1px solid hsl(0 0% 20%)" }}
                    >
                      {MC_VERSIONS.map(v => (
                        <option key={v.value} value={v.value}>{v.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Java Version */}
                  <div>
                    <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider block mb-2">Java Version</label>
                    <select
                      value={javaVersion}
                      onChange={e => setJavaVersion(e.target.value)}
                      className="w-full rounded-sm px-4 py-3 text-sm text-white outline-none appearance-none"
                      style={{ background: "hsl(0 0% 7%)", border: "1px solid hsl(0 0% 20%)" }}
                    >
                      {JAVA_VERSIONS.map(v => (
                        <option key={v.value} value={v.value}>{v.label}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground/40 mt-1.5">Auto-selected based on your Minecraft version. Change only if needed.</p>                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(1)}
                    className="h-11 px-5 rounded-sm text-sm text-muted-foreground hover:text-foreground transition-colors"
                    style={{ border: "1px solid hsl(0 0% 20%)" }}>
                    Back
                  </button>
                  <button
                    onClick={() => serverName.trim() && setStep(3)}
                    disabled={!serverName.trim()}
                    className="flex-1 h-11 flex items-center justify-center gap-2 rounded-sm text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-40"
                    style={{ background: "hsl(350 85% 45%)", color: "white" }}>
                    Review <ChevronRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Review & confirm ── */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22, ease }}>
                <p className="text-sm font-semibold text-foreground mb-4">Review your configuration</p>

                <div className="rounded-sm overflow-hidden mb-6" style={{ border: "1px solid hsl(0 0% 16%)" }}>
                  {[
                    { label: "Server Name",    value: serverName },
                    { label: "Type",           value: serverTypes.find(t => t.id === serverType)?.label ?? serverType },
                    { label: "Minecraft",      value: mcVersion },
                    { label: "Java",           value: javaVersion },
                    { label: "Plan",           value: pendingServer?.plan },
                    { label: "RAM",            value: pendingServer?.ram },
                    { label: "Disk",           value: pendingServer?.ssd },
                  ].map(({ label, value }, i) => (
                    <div key={label} className="flex items-center justify-between px-4 py-3 text-sm"
                      style={{ background: i % 2 === 0 ? "hsl(0 0% 6%)" : "hsl(0 0% 8%)", borderBottom: i < 6 ? "1px solid hsl(0 0% 12%)" : "none" }}>
                      <span className="text-muted-foreground">{label}</span>
                      <span className="text-foreground font-medium">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-sm px-4 py-3 mb-5 text-xs text-muted-foreground"
                  style={{ background: "hsl(350 85% 6%)", border: "1px solid hsl(350 85% 20%)" }}>
                  Your server will be automatically created and installed. This usually takes 30–60 seconds.
                  You'll be able to start it from your dashboard.
                </div>

                {submitError && (
                  <div className="rounded-sm px-4 py-3 mb-4 text-xs flex items-center gap-2"
                    style={{ background: "hsl(350 85% 8%)", border: "1px solid hsl(350 85% 25%)", color: "hsl(350 85% 65%)" }}>
                    <AlertCircle size={13} /> {submitError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} disabled={submitting}
                    className="h-11 px-5 rounded-sm text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                    style={{ border: "1px solid hsl(0 0% 20%)" }}>
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 h-11 flex items-center justify-center gap-2 rounded-sm text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-60"
                    style={{ background: "hsl(350 85% 45%)", color: "white" }}
                  >
                    {submitting
                      ? <><Loader2 size={14} className="animate-spin" /> Creating server…</>
                      : <><Server size={14} /> Create My Server</>
                    }
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default SetupServer;
