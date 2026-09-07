import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Loader2, AlertCircle, Check, ChevronDown,
  Settings2, AlertTriangle, X,
} from "lucide-react";
import ServerSidebar from "@/components/ServerSidebar";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

interface ServerData {
  id: string; name: string; status: string;
  plan: string; ram: string; cpu: string; ssd?: string;
  serverType?: string; mcVersion?: string;
}

const SERVER_TYPES = [
  { id: "paper",      label: "Paper",      description: "High-performance, plugin-ready (recommended)" },
  { id: "vanilla",    label: "Vanilla",    description: "Pure Minecraft — no plugins or mods" },
  { id: "forge",      label: "Forge",      description: "Full mod support via Minecraft Forge" },
  { id: "bungeecord", label: "BungeeCord", description: "Multi-server network proxy" },
  { id: "sponge",     label: "Sponge",     description: "Vanilla server with SpongeAPI mod support" },
];

const MC_VERSIONS = [
  { value: "26.2",    label: "26.2 (June 2026)",       java: "Java 25" },
  { value: "26.1",    label: "26.1 (May 2026)",        java: "Java 25" },
  { value: "1.21.11", label: "1.21.11 — Mounts of Mayhem", java: "Java 21" },
  { value: "1.21.10", label: "1.21.10 — The Copper Age",   java: "Java 21" },
  { value: "1.21.9",  label: "1.21.9  — The Copper Age",   java: "Java 21" },
  { value: "1.21.8",  label: "1.21.8  — Chase the Skies",  java: "Java 21" },
  { value: "1.21.7",  label: "1.21.7  — Chase the Skies",  java: "Java 21" },
  { value: "1.21.6",  label: "1.21.6  — Chase the Skies",  java: "Java 21" },
  { value: "1.21.5",  label: "1.21.5  — Spring to Life",   java: "Java 21" },
  { value: "1.21.4",  label: "1.21.4 (recommended)",        java: "Java 21" },
  { value: "1.21.3",  label: "1.21.3",                      java: "Java 21" },
  { value: "1.21.2",  label: "1.21.2",                      java: "Java 21" },
  { value: "1.21.1",  label: "1.21.1",                      java: "Java 21" },
  { value: "1.21",    label: "1.21",                        java: "Java 21" },
  { value: "1.20.6",  label: "1.20.6",                      java: "Java 21" },
  { value: "1.20.5",  label: "1.20.5",                      java: "Java 21" },
  { value: "1.20.4",  label: "1.20.4",                      java: "Java 17" },
  { value: "1.20.2",  label: "1.20.2",                      java: "Java 17" },
  { value: "1.20.1",  label: "1.20.1",                      java: "Java 17" },
  { value: "1.20",    label: "1.20",                        java: "Java 17" },
  { value: "1.19.4",  label: "1.19.4",                      java: "Java 17" },
  { value: "1.19.2",  label: "1.19.2",                      java: "Java 17" },
  { value: "1.19",    label: "1.19",                        java: "Java 17" },
  { value: "1.18.2",  label: "1.18.2",                      java: "Java 17" },
  { value: "1.18",    label: "1.18",                        java: "Java 17" },
  { value: "1.17.1",  label: "1.17.1",                      java: "Java 16" },
  { value: "1.17",    label: "1.17",                        java: "Java 16" },
  { value: "1.16.5",  label: "1.16.5",                      java: "Java 11" },
  { value: "1.16.1",  label: "1.16.1",                      java: "Java 11" },
  { value: "1.15.2",  label: "1.15.2",                      java: "Java 8"  },
  { value: "1.14.4",  label: "1.14.4",                      java: "Java 8"  },
  { value: "1.12.2",  label: "1.12.2",                      java: "Java 8"  },
  { value: "1.8.9",   label: "1.8.9",                       java: "Java 8"  },
];

const ServerVersion = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, token, logout } = useAuth();

  const [server, setServer]         = useState<ServerData | null>(null);
  const [loadingServer, setLS]      = useState(true);

  const [serverType, setServerType] = useState("");
  const [mcVersion, setMcVersion]   = useState("");
  const [javaVersion, setJavaVersion] = useState("");

  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState("");
  const [saveError, setSaveError]   = useState("");

  const [showReinstall, setShowReinstall] = useState(false);
  const [reinstalling, setReinstalling]   = useState(false);
  const [reinstallError, setReinstallError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { state: { from: `/server/${id}/version` } });
  }, [authLoading, user, navigate, id]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      try {
        const res = await apiFetch("/api/servers", { headers: { Authorization: `Bearer ${token()}` } });
        if (res.status === 401) { logout(); navigate("/login"); return; }
        const all = await res.json();
        const srv = all.find((s: any) => s.id === id);
        if (srv) {
          setServer(srv);
          setServerType(srv.serverType ?? "paper");
          setMcVersion(srv.mcVersion ?? "1.21.4");
          const ver = MC_VERSIONS.find(v => v.value === (srv.mcVersion ?? "1.21.4"));
          setJavaVersion(ver?.java ?? "Java 21");
        }
      } catch {}
      finally { setLS(false); }
    })();
  }, [user, id, token, logout, navigate]);

  const isStopped = server?.status === "stopped" || server?.status === "unknown";
  const isRunning = server?.status === "running";

  const handleSave = async () => {
    setSaving(true); setSaveMsg(""); setSaveError("");
    try {
      const res = await apiFetch(`/api/servers/${id}/version`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ serverType, mcVersion, javaVersion }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error || "Failed to update."); return; }
      setSaveMsg(data.message || "Version updated successfully.");
      setServer(p => p ? { ...p, serverType: data.serverType, mcVersion: data.mcVersion } : p);
      setTimeout(() => setSaveMsg(""), 5000);
    } catch { setSaveError("Network error. Please try again."); }
    finally { setSaving(false); }
  };

  const handleReinstall = async () => {
    setReinstalling(true); setReinstallError("");
    try {
      const res = await apiFetch(`/api/servers/${id}/reinstall`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (!res.ok) { setReinstallError(data.error || "Reinstall failed."); return; }
      setShowReinstall(false);
      setSaveMsg(data.message || "Reinstall started.");
      setServer(p => p ? { ...p, status: "installing" } : p);
      setTimeout(() => setSaveMsg(""), 8000);
    } catch { setReinstallError("Network error."); }
    finally { setReinstalling(false); }
  };

  if (authLoading || loadingServer) return (
    <div className="h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  const hasChanges = serverType !== (server?.serverType ?? "paper") || mcVersion !== (server?.mcVersion ?? "1.21.4");

  return (
    <div className="h-screen bg-background flex overflow-hidden">

      {/* Sidebar */}
      <div className="hidden md:flex flex-col h-screen px-4 py-5 overflow-y-auto shrink-0"
        style={{ width: 236, borderRight: "1px solid hsl(0 0% 12%)", background: "hsl(0 0% 4.5%)" }}>
        {server && <ServerSidebar server={server} onPower={async () => {}} powerLoading={null} />}
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto p-6">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }} className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "hsl(350 85% 12%)", border: "1px solid hsl(350 85% 25%)" }}>
              <Settings2 size={17} className="text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">Version & Software</h1>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                Change Minecraft version or server software. Server must be stopped.
              </p>
            </div>
          </div>

          {/* Running warning */}
          {isRunning && (
            <div className="rounded-sm px-4 py-3 mb-5 flex items-center gap-2 text-xs"
              style={{ background: "hsl(38 90% 8%)", border: "1px solid hsl(38 90% 25%)", color: "hsl(38 90% 60%)" }}>
              <AlertTriangle size={13} className="shrink-0" />
              Stop the server before making any changes.
            </div>
          )}

          {/* Notifications */}
          <AnimatePresence>
            {(saveMsg || saveError) && (
              <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
                className="rounded-sm px-4 py-3 mb-5 flex items-center gap-2 text-xs"
                style={{
                  background: saveError ? "hsl(350 85% 8%)" : "hsl(142 60% 8%)",
                  border:     saveError ? "1px solid hsl(350 85% 25%)" : "1px solid hsl(142 60% 22%)",
                  color:      saveError ? "hsl(350 85% 65%)" : "hsl(142 65% 52%)",
                }}>
                {saveError ? <AlertCircle size={12} /> : <Check size={12} />}
                {saveError || saveMsg}
                <button onClick={() => { setSaveMsg(""); setSaveError(""); }} className="ml-auto"><X size={11} /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Current config */}
          <div className="rounded-sm px-4 py-3 mb-5 flex items-center gap-6"
            style={{ background: "hsl(0 0% 7%)", border: "1px solid hsl(0 0% 14%)" }}>
            <div>
              <p className="text-[9px] mono uppercase tracking-wider text-muted-foreground/40 mb-0.5">Current Software</p>
              <p className="text-sm font-bold text-foreground capitalize">{server?.serverType ?? "—"}</p>
            </div>
            <div>
              <p className="text-[9px] mono uppercase tracking-wider text-muted-foreground/40 mb-0.5">Current Version</p>
              <p className="text-sm font-bold text-foreground">{server?.mcVersion ?? "—"}</p>
            </div>
            <div className="ml-auto">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
                style={{
                  background: isRunning ? "hsl(350 85% 12%)" : "hsl(142 60% 10%)",
                  color:      isRunning ? "hsl(350 85% 60%)" : "hsl(142 65% 52%)",
                  border:     isRunning ? "1px solid hsl(350 85% 25%)" : "1px solid hsl(142 60% 22%)",
                }}>
                {server?.status ?? "unknown"}
              </span>
            </div>
          </div>

          {/* Server software selector */}
          <div className="rounded-sm p-5 mb-4"
            style={{ background: "hsl(0 0% 6%)", border: "1px solid hsl(0 0% 14%)" }}>
            <p className="text-xs font-semibold text-foreground mb-3">Server Software</p>
            <div className="space-y-2">
              {SERVER_TYPES.map(t => (
                <button key={t.id} onClick={() => !isRunning && setServerType(t.id)}
                  disabled={isRunning}
                  className="w-full text-left rounded-sm px-4 py-3 transition-all disabled:opacity-40"
                  style={{
                    background: serverType === t.id ? "hsl(350 85% 10%)" : "hsl(0 0% 8%)",
                    border:     serverType === t.id ? "1px solid hsl(350 85% 40%)" : "1px solid hsl(0 0% 16%)",
                    boxShadow:  serverType === t.id ? "0 0 12px hsl(350 85% 30% / 0.25)" : "none",
                  }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.label}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5">{t.description}</p>
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
          </div>

          {/* Version selectors */}
          <div className="rounded-sm p-5 mb-5"
            style={{ background: "hsl(0 0% 6%)", border: "1px solid hsl(0 0% 14%)" }}>
            <p className="text-xs font-semibold text-foreground mb-4">Minecraft Version</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] mono uppercase tracking-wider text-muted-foreground/40 block mb-1.5">MC Version</label>
                <select value={mcVersion} disabled={isRunning}
                  onChange={e => {
                    const v = e.target.value;
                    setMcVersion(v);
                    const ver = MC_VERSIONS.find(m => m.value === v);
                    if (ver) setJavaVersion(ver.java);
                  }}
                  className="w-full rounded-sm px-3 py-2.5 text-sm text-foreground outline-none appearance-none disabled:opacity-40"
                  style={{ background: "hsl(0 0% 9%)", border: "1px solid hsl(0 0% 20%)" }}>
                  {MC_VERSIONS.map(v => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] mono uppercase tracking-wider text-muted-foreground/40 block mb-1.5">Java Version</label>
                <select value={javaVersion} disabled={isRunning}
                  onChange={e => setJavaVersion(e.target.value)}
                  className="w-full rounded-sm px-3 py-2.5 text-sm text-foreground outline-none appearance-none disabled:opacity-40"
                  style={{ background: "hsl(0 0% 9%)", border: "1px solid hsl(0 0% 20%)" }}>
                  {["Java 25","Java 21","Java 17","Java 16","Java 11","Java 8"].map(j => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/30 mt-2">Java is auto-selected based on MC version. Change only if needed.</p>
          </div>

          {/* Save button */}
          <button onClick={handleSave} disabled={saving || isRunning || !hasChanges}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-sm text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-40 mb-6"
            style={{ background: "hsl(350 85% 45%)", color: "white" }}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Applying…</> : <><Check size={14} /> Apply Changes</>}
          </button>

          {/* Reinstall section */}
          <div className="rounded-sm p-5"
            style={{ background: "hsl(350 85% 5%)", border: "1px solid hsl(350 85% 18%)" }}>
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className="text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground mb-1">Full Reinstall</p>
                <p className="text-xs text-muted-foreground/60 leading-relaxed mb-3">
                  Wipes all server files and reinstalls from scratch using the current software and version settings.
                  <span className="text-primary font-semibold"> This cannot be undone.</span> Back up your files first.
                </p>
                <button onClick={() => setShowReinstall(true)} disabled={isRunning}
                  className="flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-40"
                  style={{ background: "hsl(350 85% 20%)", color: "hsl(350 85% 70%)", border: "1px solid hsl(350 85% 32%)" }}>
                  <RefreshCw size={12} /> Reinstall Server
                </button>
              </div>
            </div>
          </div>

        </motion.div>
      </div>

      {/* Reinstall confirm modal */}
      <AnimatePresence>
        {showReinstall && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
            onClick={() => !reinstalling && setShowReinstall(false)}>
            <motion.div initial={{ scale:0.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
              exit={{ scale:0.95, opacity:0 }}
              className="rounded-sm p-6 max-w-sm w-full"
              style={{ background: "hsl(0 0% 8%)", border: "1px solid hsl(350 85% 35%)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-sm flex items-center justify-center shrink-0"
                  style={{ background: "hsl(350 85% 12%)", border: "1px solid hsl(350 85% 30%)" }}>
                  <AlertTriangle size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Reinstall Server?</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">All files will be permanently deleted.</p>
                </div>
              </div>
              <div className="rounded-sm px-3 py-2.5 mb-5 text-xs"
                style={{ background: "hsl(350 85% 6%)", border: "1px solid hsl(350 85% 18%)", color: "hsl(350 85% 60%)" }}>
                ⚠ This will wipe your plugins, mods, worlds, and configs. Make sure you have backups.
              </div>
              {reinstallError && (
                <p className="text-xs mb-3" style={{ color: "hsl(350 85% 65%)" }}>{reinstallError}</p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowReinstall(false)} disabled={reinstalling}
                  className="flex-1 h-9 rounded-sm text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                  style={{ border: "1px solid hsl(0 0% 20%)" }}>
                  Cancel
                </button>
                <button onClick={handleReinstall} disabled={reinstalling}
                  className="flex-1 h-9 flex items-center justify-center gap-2 rounded-sm text-xs font-semibold hover:brightness-110 disabled:opacity-50 transition-all"
                  style={{ background: "hsl(350 85% 40%)", color: "white" }}>
                  {reinstalling ? <><Loader2 size={12} className="animate-spin" /> Reinstalling…</> : <><RefreshCw size={12} /> Reinstall</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ServerVersion;
