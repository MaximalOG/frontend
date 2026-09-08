import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings2, Check, ChevronDown, ChevronUp, AlertTriangle,
  Loader2, RefreshCw, X, AlertCircle,
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
  { id: "paper",      label: "Paper",       desc: "High-performance, plugin-ready (recommended)", color: "#4ade80" },
  { id: "vanilla",    label: "Vanilla",     desc: "Pure Minecraft — no plugins or mods",            color: "#60a5fa" },
  { id: "forge",      label: "Forge",       desc: "Full mod support via Minecraft Forge",            color: "#fb923c" },
  { id: "bungeecord", label: "BungeeCord",  desc: "Multi-server network proxy",                     color: "#a78bfa" },
  { id: "sponge",     label: "Sponge",      desc: "Vanilla server with SpongeAPI mod support",       color: "#fbbf24" },
];

const MC_VERSIONS: { value: string; label: string; java: string; tag?: string }[] = [
  { value: "26.2",    label: "26.2",    java: "Java 25", tag: "Latest" },
  { value: "26.1",    label: "26.1",    java: "Java 25" },
  { value: "1.21.11", label: "1.21.11", java: "Java 21" },
  { value: "1.21.10", label: "1.21.10", java: "Java 21" },
  { value: "1.21.9",  label: "1.21.9",  java: "Java 21" },
  { value: "1.21.8",  label: "1.21.8",  java: "Java 21" },
  { value: "1.21.7",  label: "1.21.7",  java: "Java 21" },
  { value: "1.21.6",  label: "1.21.6",  java: "Java 21" },
  { value: "1.21.5",  label: "1.21.5",  java: "Java 21" },
  { value: "1.21.4",  label: "1.21.4",  java: "Java 21", tag: "Recommended" },
  { value: "1.21.3",  label: "1.21.3",  java: "Java 21" },
  { value: "1.21.2",  label: "1.21.2",  java: "Java 21" },
  { value: "1.21.1",  label: "1.21.1",  java: "Java 21" },
  { value: "1.21",    label: "1.21",    java: "Java 21" },
  { value: "1.20.6",  label: "1.20.6",  java: "Java 21" },
  { value: "1.20.5",  label: "1.20.5",  java: "Java 21" },
  { value: "1.20.4",  label: "1.20.4",  java: "Java 17" },
  { value: "1.20.2",  label: "1.20.2",  java: "Java 17" },
  { value: "1.20.1",  label: "1.20.1",  java: "Java 17" },
  { value: "1.20",    label: "1.20",    java: "Java 17" },
  { value: "1.19.4",  label: "1.19.4",  java: "Java 17" },
  { value: "1.19.2",  label: "1.19.2",  java: "Java 17" },
  { value: "1.19",    label: "1.19",    java: "Java 17" },
  { value: "1.18.2",  label: "1.18.2",  java: "Java 17" },
  { value: "1.18",    label: "1.18",    java: "Java 17" },
  { value: "1.17.1",  label: "1.17.1",  java: "Java 16" },
  { value: "1.17",    label: "1.17",    java: "Java 16" },
  { value: "1.16.5",  label: "1.16.5",  java: "Java 11" },
  { value: "1.16.1",  label: "1.16.1",  java: "Java 11" },
  { value: "1.15.2",  label: "1.15.2",  java: "Java 8" },
  { value: "1.14.4",  label: "1.14.4",  java: "Java 8" },
  { value: "1.12.2",  label: "1.12.2",  java: "Java 8" },
  { value: "1.8.9",   label: "1.8.9",   java: "Java 8" },
];

// Version sections for the accordion
const VERSION_GROUPS = [
  { label: "2026 Snapshots", values: ["26.2","26.1"] },
  { label: "1.21.x",  values: ["1.21.11","1.21.10","1.21.9","1.21.8","1.21.7","1.21.6","1.21.5","1.21.4","1.21.3","1.21.2","1.21.1","1.21"] },
  { label: "1.20.x",  values: ["1.20.6","1.20.5","1.20.4","1.20.2","1.20.1","1.20"] },
  { label: "1.19.x",  values: ["1.19.4","1.19.2","1.19"] },
  { label: "1.18.x",  values: ["1.18.2","1.18"] },
  { label: "Legacy",  values: ["1.17.1","1.17","1.16.5","1.16.1","1.15.2","1.14.4","1.12.2","1.8.9"] },
];

export default function ServerVersion() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, token, logout } = useAuth();

  const [server, setServer]           = useState<ServerData | null>(null);
  const [loadingServer, setLS]        = useState(true);
  const [serverType, setServerType]   = useState("paper");
  const [mcVersion, setMcVersion]     = useState("1.21.4");
  const [javaVersion, setJavaVersion] = useState("Java 21");
  const [expandedGroup, setExpandedGroup] = useState<string | null>("1.21.x");
  const [saving, setSaving]           = useState(false);
  const [saveMsg, setSaveMsg]         = useState("");
  const [saveError, setSaveError]     = useState("");
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
          const ver = srv.mcVersion ?? "1.21.4";
          setMcVersion(ver);
          const vObj = MC_VERSIONS.find(v => v.value === ver);
          setJavaVersion(vObj?.java ?? "Java 21");
          // Auto-expand the group containing current version
          const grp = VERSION_GROUPS.find(g => g.values.includes(ver));
          if (grp) setExpandedGroup(grp.label);
        }
      } catch {}
      finally { setLS(false); }
    })();
  }, [user, id, token, logout, navigate]);

  const isRunning = server?.status === "running";
  const hasChanges = serverType !== (server?.serverType ?? "paper") || mcVersion !== (server?.mcVersion ?? "1.21.4");

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
    } catch { setSaveError("Network error."); }
    finally { setSaving(false); }
  };

  const handleReinstall = async () => {
    setReinstalling(true); setReinstallError("");
    try {
      const res = await apiFetch(`/api/servers/${id}/reinstall`, {
        method: "POST", headers: { Authorization: `Bearer ${token()}` },
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

  const selectVersion = (v: string) => {
    if (isRunning) return;
    setMcVersion(v);
    const vObj = MC_VERSIONS.find(m => m.value === v);
    if (vObj) setJavaVersion(vObj.java);
  };

  if (authLoading || loadingServer) return (
    <div className="flex items-center justify-center h-screen" style={{ background: "#080810" }}>
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#a855f7" }} />
    </div>
  );

  return (
    <div className="flex overflow-hidden" style={{ height: "100vh", background: "#080810" }}>
      {/* Sidebar */}
      <div className="hidden md:flex flex-col h-full overflow-y-auto shrink-0 px-4 py-5"
        style={{ width: 236, background: "#0b0b14", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        {server && <ServerSidebar server={server} onPower={async () => {}} powerLoading={null} />}
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

          {/* ── Page header ── */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.25)" }}>
              <Settings2 size={16} style={{ color: "#60a5fa" }} />
            </div>
            <div>
              <h1 className="text-base font-bold" style={{ color: "#f1f5f9" }}>Version & Software</h1>
              <p className="text-[10px] mono mt-0.5" style={{ color: "#475569" }}>
                Change Minecraft version or server software — server must be stopped
              </p>
            </div>
          </div>

          {/* ── Running warning ── */}
          {isRunning && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-5 text-xs"
              style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24" }}>
              <AlertTriangle size={13} className="shrink-0" />
              Stop the server before making changes.
            </div>
          )}

          {/* ── Notifications ── */}
          <AnimatePresence>
            {(saveMsg || saveError) && (
              <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl mb-5 text-xs"
                style={{
                  background: saveError ? "rgba(239,68,68,0.08)" : "rgba(74,222,128,0.07)",
                  border: saveError ? "1px solid rgba(239,68,68,0.22)" : "1px solid rgba(74,222,128,0.2)",
                  color: saveError ? "#f87171" : "#4ade80",
                }}>
                {saveError ? <AlertCircle size={12} /> : <Check size={12} />}
                {saveError || saveMsg}
                <button onClick={() => { setSaveMsg(""); setSaveError(""); }} className="ml-auto"><X size={11} /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Current config chip row ── */}
          <div className="flex items-center gap-3 flex-wrap mb-6">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-[9px] mono uppercase tracking-widest" style={{ color: "#334155" }}>Current software</p>
              <p className="text-xs font-bold capitalize" style={{ color: "#e2e8f0" }}>{server?.serverType ?? "—"}</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-[9px] mono uppercase tracking-widest" style={{ color: "#334155" }}>Current version</p>
              <p className="text-xs font-bold mono" style={{ color: "#e2e8f0" }}>{server?.mcVersion ?? "—"}</p>
            </div>
            <div className="ml-auto px-3 py-1.5 rounded-xl text-[10px] font-semibold"
              style={{
                background: isRunning ? "rgba(239,68,68,0.1)" : "rgba(74,222,128,0.08)",
                color: isRunning ? "#f87171" : "#4ade80",
                border: `1px solid ${isRunning ? "rgba(239,68,68,0.2)" : "rgba(74,222,128,0.18)"}`,
              }}>
              {server?.status}
            </div>
          </div>

          {/* ══ TWO-COLUMN LAYOUT ══ */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* ── Left: Server Software (2/5) ── */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl overflow-hidden"
                style={{ background: "linear-gradient(135deg,#0d0d18,#0f0d1c)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-[9px] mono uppercase tracking-widest" style={{ color: "#475569" }}>Server Software</p>
                </div>
                <div>
                  {SERVER_TYPES.map((t, i) => {
                    const active = serverType === t.id;
                    return (
                      <button key={t.id} onClick={() => !isRunning && setServerType(t.id)}
                        disabled={isRunning}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all disabled:opacity-40"
                        style={{
                          background: active ? `${t.color}10` : "transparent",
                          borderBottom: i < SERVER_TYPES.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                          borderLeft: `2px solid ${active ? t.color : "transparent"}`,
                        }}
                        onMouseEnter={e => { if (!active && !isRunning) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
                        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = active ? `${t.color}10` : "transparent"; }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold" style={{ color: active ? t.color : "#94a3b8" }}>{t.label}</p>
                          <p className="text-[10px] mt-0.5 truncate" style={{ color: "#334155" }}>{t.desc}</p>
                        </div>
                        {active && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: `${t.color}22`, border: `1px solid ${t.color}44` }}>
                            <Check size={10} style={{ color: t.color }} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Right: Version picker (3/5) ── */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl overflow-hidden"
                style={{ background: "linear-gradient(135deg,#0d0d18,#0f0d1c)", border: "1px solid rgba(255,255,255,0.07)" }}>

                {/* Selected version chip */}
                <div className="px-4 py-3 flex items-center justify-between"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-[9px] mono uppercase tracking-widest" style={{ color: "#475569" }}>Minecraft Version</p>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold mono"
                      style={{ background: "rgba(139,92,246,0.12)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.22)" }}>
                      {mcVersion}
                    </span>
                    <span className="text-[10px]" style={{ color: "#475569" }}>{javaVersion}</span>
                  </div>
                </div>

                {/* Accordion groups */}
                <div>
                  {VERSION_GROUPS.map((group, gi) => {
                    const isOpen = expandedGroup === group.label;
                    const groupVersions = MC_VERSIONS.filter(v => group.values.includes(v.value));
                    const hasSelected = group.values.includes(mcVersion);
                    return (
                      <div key={group.label}
                        style={{ borderBottom: gi < VERSION_GROUPS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                        {/* Group header */}
                        <button
                          className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
                          onClick={() => setExpandedGroup(isOpen ? null : group.label)}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold" style={{ color: isOpen || hasSelected ? "#e2e8f0" : "#64748b" }}>
                              {group.label}
                            </span>
                            {hasSelected && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] mono font-bold"
                                style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>
                                selected
                              </span>
                            )}
                          </div>
                          {isOpen
                            ? <ChevronUp size={13} style={{ color: "#475569" }} />
                            : <ChevronDown size={13} style={{ color: "#475569" }} />}
                        </button>

                        {/* Version pills */}
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div key="vs" initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                              style={{ overflow: "hidden" }}>
                              <div className="px-4 pb-4 pt-1 flex flex-wrap gap-2"
                                style={{ background: "rgba(255,255,255,0.015)" }}>
                                {groupVersions.map(v => {
                                  const sel = v.value === mcVersion;
                                  return (
                                    <button key={v.value} onClick={() => selectVersion(v.value)}
                                      disabled={isRunning}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                                      style={{
                                        background: sel ? "rgba(139,92,246,0.18)" : "rgba(255,255,255,0.04)",
                                        color: sel ? "#c4b5fd" : "#64748b",
                                        border: `1px solid ${sel ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.07)"}`,
                                        boxShadow: sel ? "0 0 8px rgba(139,92,246,0.15)" : "none",
                                      }}>
                                      {v.label}
                                      {v.tag && (
                                        <span className="text-[8px] px-1 rounded font-bold"
                                          style={{ background: v.tag === "Recommended" ? "rgba(74,222,128,0.15)" : "rgba(251,191,36,0.15)",
                                                   color: v.tag === "Recommended" ? "#4ade80" : "#fbbf24" }}>
                                          {v.tag}
                                        </span>
                                      )}
                                      {sel && <Check size={10} />}
                                    </button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                {/* Java override */}
                <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] mono uppercase tracking-widest" style={{ color: "#475569" }}>Java Version</p>
                    <select value={javaVersion} disabled={isRunning}
                      onChange={e => setJavaVersion(e.target.value)}
                      className="bg-transparent text-xs outline-none disabled:opacity-40"
                      style={{ color: "#94a3b8" }}>
                      {["Java 25","Java 21","Java 17","Java 16","Java 11","Java 8"].map(j => (
                        <option key={j} value={j} style={{ background: "#1e1b2e" }}>{j}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[9px] mt-1" style={{ color: "#1e293b" }}>Auto-selected from version. Override only if needed.</p>
                </div>
              </div>

              {/* Apply button */}
              <button onClick={handleSave} disabled={saving || isRunning || !hasChanges}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-30 mt-4"
                style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "white" }}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Applying…</> : <><Check size={14} /> Apply Changes</>}
              </button>
            </div>
          </div>

          {/* ── Reinstall section ── */}
          <div className="rounded-2xl p-5 mt-6 flex items-start gap-4"
            style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: "#f87171" }} />
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1" style={{ color: "#f1f5f9" }}>Full Reinstall</p>
              <p className="text-xs leading-relaxed mb-3" style={{ color: "#64748b" }}>
                Wipes all server files and reinstalls from scratch with current settings.
                <span className="font-semibold" style={{ color: "#f87171" }}> This cannot be undone.</span>
              </p>
              <button onClick={() => setShowReinstall(true)} disabled={isRunning}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                <RefreshCw size={12} /> Reinstall Server
              </button>
            </div>
          </div>

          </motion.div>
        </div>
      </div>

      {/* ── Reinstall confirm modal ── */}
      <AnimatePresence>
        {showReinstall && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
            onClick={() => !reinstalling && setShowReinstall(false)}>
            <motion.div initial={{ scale:0.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
              exit={{ scale:0.95, opacity:0 }}
              className="rounded-2xl p-6 max-w-sm w-full"
              style={{ background: "linear-gradient(135deg,#0f0f1a,#110d1d)", border: "1px solid rgba(239,68,68,0.25)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <AlertTriangle size={18} style={{ color: "#f87171" }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#f1f5f9" }}>Reinstall Server?</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#475569" }}>All files will be permanently deleted.</p>
                </div>
              </div>
              <div className="rounded-xl px-3 py-2.5 mb-5 text-xs"
                style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#fca5a5" }}>
                ⚠ Plugins, mods, worlds, and configs will all be wiped. Back up first.
              </div>
              {reinstallError && <p className="text-xs mb-3" style={{ color: "#f87171" }}>{reinstallError}</p>}
              <div className="flex gap-2">
                <button onClick={() => setShowReinstall(false)} disabled={reinstalling}
                  className="flex-1 h-9 rounded-xl text-xs disabled:opacity-40"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>
                  Cancel
                </button>
                <button onClick={handleReinstall} disabled={reinstalling}
                  className="flex-1 h-9 flex items-center justify-center gap-2 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg,#991b1b,#dc2626)", color: "white" }}>
                  {reinstalling ? <><Loader2 size={12} className="animate-spin" /> Reinstalling…</> : <><RefreshCw size={12} /> Reinstall</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
