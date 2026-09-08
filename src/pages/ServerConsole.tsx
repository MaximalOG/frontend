import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import {
  Loader2, AlertCircle, Wifi, WifiOff, Check, Copy,
  Globe, Edit3, Trash2, Shield, Clock, Users as UsersIcon,
  HardDrive, Cpu, MemoryStick, Download, Search, X,
  ChevronDown, ChevronUp, Package, Calendar, List, Zap,
  Server, Activity, UploadCloud,
} from "lucide-react";
import ServerSidebar from "@/components/ServerSidebar";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

/* ───────────────────────────── Types ───────────────────────────────── */
interface ServerData {
  id: string; name: string; status: string;
  ram: string; cpu: string; ssd?: string;
  plan: string; host?: string;
  serverType?: string; mcVersion?: string;
  pendingSetup?: boolean;
  hostname?: string | null;
  hostnameStatus?: string | null;
  customAddress?: string | null;
  node?: string;
}

interface LogLine {
  id: number; text: string;
  type: "info" | "warn" | "error" | "success" | "input" | "system";
}

/* ───────────────────────────── Helpers ─────────────────────────────── */
let _lid = 0;
const mkLine = (text: string, type: LogLine["type"] = "info"): LogLine => ({ id: ++_lid, text, type });

function stripAnsi(s: string) {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "").replace(/\x1B\[[0-9;]*m/g, "").replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");
}
function rebrand(s: string) {
  return s.replace(/\[Pterodactyl Daemon\]/gi, "[NetherNodes]").replace(/Pterodactyl Daemon/gi, "NetherNodes")
    .replace(/container@pterodactyl~/gi, "server@nethernodes ~").replace(/Pterodactyl/gi, "NetherNodes");
}
function processLine(raw: string) { return rebrand(stripAnsi(raw)).trim(); }
function classifyLine(text: string): LogLine["type"] {
  const t = text.toLowerCase();
  if (t.startsWith(">")) return "input";
  if (t.startsWith("[nethernodes]") || t.startsWith("server@nethernodes")) return "system";
  if (t.includes("error") || t.includes("exception") || t.includes("fatal") || t.includes("crash")) return "error";
  if (t.includes("warn")) return "warn";
  if (t.includes("done") || t.includes("started") || t.includes("ready") || t.includes("running") ||
      t.includes("loaded") || t.includes("finished") || t.includes("connected to console")) return "success";
  return "info";
}
function nowStr() { return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
function fmtBytes(b: number) { return b >= 1073741824 ? `${(b / 1073741824).toFixed(2)} GB` : `${(b / 1048576).toFixed(0)} MB`; }
function fmtUptime(ms: number) {
  if (ms <= 0) return "Offline";
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m ${s % 60}s`;
}
function parseRamMB(ram?: string) {
  if (!ram) return 0;
  const n = parseFloat(ram);
  if (ram.toLowerCase().includes("gb")) return n * 1024;
  return n;
}

/* ─── Log line colors ───────────────────────────────────────────────── */
const LINE_STYLE: Record<LogLine["type"], { color: string; badge?: string; badgeBg?: string }> = {
  error:   { color: "#f87171", badge: "ERR",  badgeBg: "rgba(239,68,68,0.15)" },
  warn:    { color: "#fbbf24", badge: "WARN", badgeBg: "rgba(251,191,36,0.12)" },
  success: { color: "#4ade80", badge: "INFO", badgeBg: "rgba(74,222,128,0.1)" },
  info:    { color: "#94a3b8" },
  input:   { color: "#7dd3fc", badge: "CMD",  badgeBg: "rgba(125,211,252,0.1)" },
  system:  { color: "#c084fc", badge: "SYS",  badgeBg: "rgba(192,132,252,0.1)" },
};

/* ─── Status config ─────────────────────────────────────────────────── */
const STATUS_CFG: Record<string, { color: string; dot: string; label: string }> = {
  running:    { color: "#4ade80", dot: "#22c55e", label: "Online" },
  stopped:    { color: "#64748b", dot: "#475569", label: "Offline" },
  starting:   { color: "#fbbf24", dot: "#f59e0b", label: "Starting" },
  stopping:   { color: "#fbbf24", dot: "#f59e0b", label: "Stopping" },
  installing: { color: "#60a5fa", dot: "#3b82f6", label: "Installing" },
  suspended:  { color: "#f87171", dot: "#ef4444", label: "Suspended" },
};

/* ═══════════════════════════ COMPONENT ════════════════════════════════ */
export default function ServerConsole() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, token, logout } = useAuth();

  const [server, setServer]             = useState<ServerData | null>(null);
  const [loadingServer, setLoadingServer] = useState(true);
  const [serverError, setServerError]   = useState("");
  const [logs, setLogs]                 = useState<LogLine[]>([]);
  const [input, setInput]               = useState("");
  const [history, setHistory]           = useState<string[]>([]);
  const [histIdx, setHistIdx]           = useState(-1);
  const [wsStatus, setWsStatus]         = useState<"disconnected" | "connecting" | "connected" | "error">("disconnected");
  const [autoScroll, setAutoScroll]     = useState(true);
  const [searchOpen, setSearchOpen]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState("");
  const [blink, setBlink]               = useState(true);
  const [powerLoading, setPowerLoading] = useState<string | null>(null);
  const [copied, setCopied]             = useState(false);
  const [showDelete, setShowDelete]     = useState(false);
  const [deleteInput, setDeleteInput]   = useState("");
  const [deleting, setDeleting]         = useState(false);
  const [showHnForm, setShowHnForm]     = useState(false);

  /* upload world popup */
  const [showUploadWorld, setShowUploadWorld] = useState(false);
  const [worldFile, setWorldFile]             = useState<File | null>(null);
  const [worldDragOver, setWorldDragOver]     = useState(false);
  const [uploadingWorld, setUploadingWorld]   = useState(false);
  const [uploadWorldMsg, setUploadWorldMsg]   = useState("");
  const [uploadWorldErr, setUploadWorldErr]   = useState("");
  const worldInputRef                         = useRef<HTMLInputElement>(null);
  const [hnEdit, setHnEdit]             = useState("");
  const [hnChecking, setHnChecking]     = useState(false);
  const [hnAvail, setHnAvail]           = useState<boolean | null>(null);
  const [hnSubmitting, setHnSubmitting] = useState(false);
  const [hnError, setHnError]           = useState("");
  const [resources, setResources]       = useState<{
    available: boolean; cpu: number; memoryBytes: number;
    diskBytes: number; netRxBytes: number; netTxBytes: number; uptimeMs: number;
  } | null>(null);
  const [cpuHistory, setCpuHistory] = useState<{ t: number; v: number }[]>(
    Array.from({ length: 30 }, (_, i) => ({ t: i, v: 0 }))
  );

  const wsRef    = useRef<WebSocket | null>(null);
  const logsRef  = useRef<HTMLDivElement>(null);
  const logsEnd  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef("");
  const tickRef  = useRef(30);

  /* cursor blink */
  useEffect(() => { const t = setInterval(() => setBlink(b => !b), 500); return () => clearInterval(t); }, []);

  /* auth guard */
  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { state: { from: `/server/${id}/console` } });
  }, [authLoading, user, navigate, id]);

  /* load server */
  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      setLoadingServer(true);
      try {
        const res = await apiFetch("/api/servers", { headers: { Authorization: `Bearer ${token()}` } });
        if (res.status === 401) { logout(); navigate("/login"); return; }
        const all: ServerData[] = await res.json();
        const srv = all.find(s => s.id === id);
        if (!srv) { setServerError("Server not found."); return; }
        setServer(srv);
      } catch { setServerError("Could not load server info."); }
      finally { setLoadingServer(false); }
    })();
  }, [user, id, token, logout, navigate]);

  const addLog = useCallback((text: string, type: LogLine["type"] = "info") => {
    setLogs(prev => [...prev.slice(-1200), mkLine(text, type)]);
  }, []);

  useEffect(() => {
    if (autoScroll) logsEnd.current?.scrollIntoView({ behavior: "auto" });
  }, [logs, autoScroll]);

  const handleConsoleScroll = () => {
    const el = logsRef.current;
    if (!el) return;
    setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
  };

  /* WebSocket */
  const connect = useCallback(async () => {
    if (!id || wsRef.current?.readyState === WebSocket.OPEN) return;
    setWsStatus("connecting");
    addLog(`[${nowStr()}] Connecting…`, "system");
    try {
      const res = await apiFetch(`/api/servers/${id}/console-token`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) { addLog(`[${nowStr()}] Failed: ${(await res.json()).error}`, "error"); setWsStatus("error"); return; }
      const { token: wsTok, socket: wsUrl } = await res.json();
      if (!wsTok || !wsUrl) { addLog(`[${nowStr()}] Console unavailable.`, "error"); setWsStatus("error"); return; }
      tokenRef.current = wsTok;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => ws.send(JSON.stringify({ event: "auth", args: [wsTok] }));
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          switch (msg.event) {
            case "auth success": setWsStatus("connected"); addLog(`[${nowStr()}] ✓ Connected to console`, "success"); break;
            case "token expiring":
              (async () => {
                try {
                  const r = await apiFetch(`/api/servers/${id}/console-token`, { headers: { Authorization: `Bearer ${token()}` } });
                  if (r.ok) { const { token: t } = await r.json(); tokenRef.current = t; ws.send(JSON.stringify({ event: "auth", args: [t] })); }
                } catch {}
              })();
              break;
            case "token expired": addLog(`[${nowStr()}] Session expired.`, "warn"); ws.close(); setTimeout(connect, 1500); break;
            case "console output":
              if (Array.isArray(msg.args)) msg.args.forEach((raw: string) => { const l = processLine(raw); if (l) addLog(l, classifyLine(l)); });
              break;
            case "status": if (msg.args?.[0]) setServer(p => p ? { ...p, status: msg.args[0] } : p); break;
          }
        } catch {}
      };
      ws.onerror = () => { setWsStatus("error"); addLog(`[${nowStr()}] Connection error.`, "error"); };
      ws.onclose = (e) => { setWsStatus("disconnected"); if (e.code !== 1000) addLog(`[${nowStr()}] Disconnected (${e.code}).`, "warn"); };
    } catch (err: any) { addLog(`[${nowStr()}] Failed: ${err?.message}`, "error"); setWsStatus("error"); }
  }, [id, token, addLog]);

  useEffect(() => {
    if (server && !server.pendingSetup) connect();
    return () => { wsRef.current?.close(1000); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server?.id]);

  /* poll resources */
  useEffect(() => {
    if (!user || !id) return;
    const poll = async () => {
      try {
        const res = await apiFetch(`/api/servers/${id}/resources`, { headers: { Authorization: `Bearer ${token()}` } });
        if (res.ok) {
          const d = await res.json();
          setResources(d);
          if (d.available) {
            const tick = tickRef.current++;
            setCpuHistory(prev => [...prev.slice(1), { t: tick, v: d.cpu }]);
          }
        }
      } catch {}
    };
    poll();
    const iv = setInterval(poll, 3000);
    return () => clearInterval(iv);
  }, [user, id, token]);

  /* send command */
  const sendCommand = () => {
    const cmd = input.trim();
    if (!cmd || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ event: "send command", args: [cmd] }));
    addLog(`> ${cmd}`, "input");
    setHistory(h => [cmd, ...h.slice(0, 49)]);
    setHistIdx(-1); setInput(""); setAutoScroll(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { sendCommand(); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); const n = Math.min(histIdx + 1, history.length - 1); setHistIdx(n); setInput(history[n] ?? ""); }
    if (e.key === "ArrowDown") { e.preventDefault(); const n = Math.max(histIdx - 1, -1); setHistIdx(n); setInput(n === -1 ? "" : history[n] ?? ""); }
  };

  const sendPower = async (signal: "start" | "stop" | "restart" | "kill") => {
    setPowerLoading(signal);
    try {
      const res = await apiFetch(`/api/servers/${id}/power`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ signal }),
      });
      const data = await res.json();
      if (res.ok) addLog(`[${nowStr()}] Power signal "${signal}" sent.`, "success");
      else addLog(`[${nowStr()}] Power error: ${data.error}`, "error");
    } catch { addLog(`[${nowStr()}] Network error.`, "error"); }
    finally { setPowerLoading(null); }
  };

  const deleteServer = async () => {
    if (deleteInput !== server?.name) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/servers/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) { wsRef.current?.close(1000); navigate("/dashboard"); }
      else { const d = await res.json(); addLog(`Delete failed: ${d.error}`, "error"); setShowDelete(false); }
    } catch { addLog("Network error.", "error"); setShowDelete(false); }
    finally { setDeleting(false); }
  };

  const copyAddr = (addr: string) => {
    navigator.clipboard.writeText(addr).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const downloadLogs = () => {
    const blob = new Blob([logs.map(l => l.text).join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${server?.name ?? "server"}-console.log`; a.click(); URL.revokeObjectURL(url);
  };

  const uploadWorld = async () => {
    if (!worldFile) return;
    setUploadingWorld(true); setUploadWorldErr(""); setUploadWorldMsg("");
    try {
      // Determine target dir: .zip goes to root, folders go into worlds/
      const ext = worldFile.name.split(".").pop()?.toLowerCase();
      const targetPath = ext === "zip" ? `/${worldFile.name}` : `/worlds/${worldFile.name}`;
      const text = await worldFile.text().catch(() => null);
      if (text === null) {
        // Binary file (zip) — read as arraybuffer and base64-encode not supported via write API
        // Instead send as raw binary using the Pterodactyl upload endpoint
        setUploadWorldErr("Binary world uploads (ZIP) are not yet supported via this panel. Use the Files page.");
        setUploadingWorld(false);
        return;
      }
      const res = await apiFetch(
        `/api/servers/${id}/files/write?file=${encodeURIComponent(targetPath)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ content: text }),
        }
      );
      if (!res.ok) {
        const e = await res.json();
        setUploadWorldErr(e.error || "Upload failed.");
        return;
      }
      setUploadWorldMsg(`✓ ${worldFile.name} uploaded successfully.`);
      setWorldFile(null);
      setTimeout(() => { setShowUploadWorld(false); setUploadWorldMsg(""); }, 2500);
    } catch { setUploadWorldErr("Network error — please try again."); }
    finally { setUploadingWorld(false); }
  };

  const filteredLogs = searchQuery ? logs.filter(l => l.text.toLowerCase().includes(searchQuery.toLowerCase())) : logs;
  const cfg = STATUS_CFG[server?.status ?? ""] ?? STATUS_CFG.stopped;
  const isRunning = server?.status === "running";
  const displayAddr = server?.customAddress ?? server?.host ?? null;
  const ramLimitMB = parseRamMB(server?.ram);
  const ramUsedMB  = resources ? resources.memoryBytes / 1048576 : 0;
  const ramPct     = ramLimitMB > 0 ? Math.min((ramUsedMB / ramLimitMB) * 100, 100) : 0;
  const cpuPct     = resources?.cpu ?? 0;

  /* ── loading / error ── */
  if (authLoading || loadingServer) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#1a0d2e,#0d1a2e)", border: "1px solid rgba(139,92,246,0.3)" }}>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#a855f7" }} />
        </div>
        <p className="text-sm" style={{ color: "#64748b" }}>Connecting to console…</p>
      </div>
    </div>
  );

  if (serverError) return (
    <div className="h-screen bg-background flex items-center justify-center">
      <div className="text-center px-4">
        <AlertCircle className="w-10 h-10 text-primary mx-auto mb-4" />
        <p className="font-semibold mb-2">Console unavailable</p>
        <p className="text-sm mb-6" style={{ color: "#64748b" }}>{serverError}</p>
        <Link to="/dashboard" className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "#7c3aed", color: "white" }}>Back to Dashboard</Link>
      </div>
    </div>
  );

  /* ═════════════════════════════ RENDER ═════════════════════════════ */
  return (
    <div className="flex overflow-hidden" style={{ height: "100vh", background: "#080810" }}>

      {/* ══════ LEFT NAV SIDEBAR ══════ */}
      <div className="hidden md:flex flex-col h-full overflow-y-auto shrink-0 px-4 py-5"
        style={{ width: 236, background: "#0b0b14", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        {server && <ServerSidebar server={server} onPower={sendPower} powerLoading={powerLoading} />}
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => { setShowDelete(true); setDeleteInput(""); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all hover:opacity-80"
            style={{ color: "#f87171", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)" }}>
            <Trash2 size={12} /> Delete Server
          </button>
        </div>
      </div>

      {/* ══════ MAIN CONTENT ══════ */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── TOP HEADER BAR ── */}
        <div className="sticky top-0 z-20 px-6 py-3 flex items-center justify-between gap-4 flex-wrap"
          style={{
            background: "rgba(8,8,16,0.85)",
            backdropFilter: "blur(16px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>

          {/* Left: server identity */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Glowing server icon */}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(168,85,247,0.15))",
                border: "1px solid rgba(139,92,246,0.4)",
                boxShadow: "0 0 16px rgba(139,92,246,0.25)",
              }}>
              <Server size={16} style={{ color: "#c084fc" }} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm font-bold truncate" style={{ color: "#f1f5f9" }}>{server?.name}</h1>
                {/* Status pill */}
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                  <span className="relative flex h-1.5 w-1.5">
                    {isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: cfg.dot }} />}
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: cfg.dot }} />
                  </span>
                  {cfg.label}
                </span>
                {/* Plan badge */}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold mono uppercase"
                  style={{ background: "rgba(139,92,246,0.12)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}>
                  {server?.plan}
                </span>
                {/* Version */}
                {server?.mcVersion && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] mono"
                    style={{ background: "rgba(96,165,250,0.1)", color: "#93c5fd", border: "1px solid rgba(96,165,250,0.18)" }}>
                    {server.serverType && `${server.serverType} `}{server.mcVersion}
                  </span>
                )}
              </div>
              {displayAddr && (
                <p className="text-[10px] mono mt-0.5" style={{ color: "#475569" }}>{displayAddr}</p>
              )}
            </div>
          </div>

          {/* Right: meta chips */}
          <div className="flex items-center gap-2 shrink-0">
            {server?.node && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px]"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>
                <Globe size={10} /> {server.node}
              </span>
            )}
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px]"
              style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)", color: "#60a5fa" }}>
              <Shield size={10} /> DDoS Protected
            </span>
            {resources?.uptimeMs != null && resources.uptimeMs > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px]"
                style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)", color: "#4ade80" }}>
                <Clock size={10} /> {fmtUptime(resources.uptimeMs)}
              </span>
            )}
          </div>
        </div>

        {/* ── METRICS ROW ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>

          {/* CPU */}
          <div className="p-5 relative overflow-hidden"
            style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="absolute inset-0 opacity-30" style={{
              background: "radial-gradient(ellipse at 100% 0%, rgba(251,191,36,0.08) 0%, transparent 60%)"
            }} />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
                    <Cpu size={13} style={{ color: "#fbbf24" }} />
                  </div>
                  <span className="text-[10px] mono uppercase tracking-wider" style={{ color: "#475569" }}>CPU Usage</span>
                </div>
                <span className="text-[10px] mono" style={{ color: cpuPct > 80 ? "#f87171" : cpuPct > 50 ? "#fbbf24" : "#4ade80" }}>
                  {resources?.available ? `${cpuPct.toFixed(1)}%` : "—"}
                </span>
              </div>
              {/* Recharts sparkline */}
              <div style={{ height: 36, marginBottom: 8 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cpuHistory} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={cpuPct > 80 ? "#f87171" : cpuPct > 50 ? "#fbbf24" : "#4ade80"} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={cpuPct > 80 ? "#f87171" : cpuPct > 50 ? "#fbbf24" : "#4ade80"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke={cpuPct > 80 ? "#f87171" : cpuPct > 50 ? "#fbbf24" : "#4ade80"}
                      strokeWidth={1.5} fill="url(#cpuGrad)" dot={false} isAnimationActive={false} />
                    <Tooltip content={() => null} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {/* Progress track */}
              <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(cpuPct, 100)}%`, background: cpuPct > 80 ? "#ef4444" : cpuPct > 50 ? "#f59e0b" : "#22c55e" }} />
              </div>
            </div>
          </div>

          {/* RAM */}
          <div className="p-5 relative overflow-hidden"
            style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="absolute inset-0 opacity-30" style={{
              background: "radial-gradient(ellipse at 100% 0%, rgba(139,92,246,0.08) 0%, transparent 60%)"
            }} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <MemoryStick size={13} style={{ color: "#a78bfa" }} />
                </div>
                <span className="text-[10px] mono uppercase tracking-wider" style={{ color: "#475569" }}>RAM Usage</span>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-xl font-bold" style={{ color: "#f1f5f9" }}>
                  {resources?.available ? ramUsedMB.toFixed(0) : "—"}
                </span>
                <span className="text-xs" style={{ color: "#475569" }}>/ {server?.ram ?? "?"}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden mt-2" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${ramPct}%`, background: "linear-gradient(90deg, #7c3aed, #a855f7)" }} />
              </div>
              <p className="text-[10px] mono mt-1.5" style={{ color: "#475569" }}>{ramPct.toFixed(0)}% used</p>
            </div>
          </div>

          {/* Disk */}
          <div className="p-5 relative overflow-hidden"
            style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="absolute inset-0 opacity-30" style={{
              background: "radial-gradient(ellipse at 100% 0%, rgba(96,165,250,0.06) 0%, transparent 60%)"
            }} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)" }}>
                  <HardDrive size={13} style={{ color: "#60a5fa" }} />
                </div>
                <span className="text-[10px] mono uppercase tracking-wider" style={{ color: "#475569" }}>Disk Usage</span>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-xl font-bold" style={{ color: "#f1f5f9" }}>
                  {resources?.available ? fmtBytes(resources.diskBytes) : "—"}
                </span>
                {server?.ssd && <span className="text-xs" style={{ color: "#475569" }}>/ {server.ssd}</span>}
              </div>
              <div className="h-2 rounded-full overflow-hidden mt-2" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: "42%", background: "linear-gradient(90deg, #1d4ed8, #3b82f6)" }} />
              </div>
              {resources?.available && (
                <div className="flex gap-3 mt-1.5">
                  <span className="text-[9px] mono" style={{ color: "#334155" }}>↓ {(resources.netRxBytes / 1048576).toFixed(1)} MB</span>
                  <span className="text-[9px] mono" style={{ color: "#334155" }}>↑ {(resources.netTxBytes / 1048576).toFixed(1)} MB</span>
                </div>
              )}
            </div>
          </div>

          {/* Server Health / TPS */}
          <div className="p-5 relative overflow-hidden">
            <div className="absolute inset-0 opacity-30" style={{
              background: "radial-gradient(ellipse at 100% 0%, rgba(74,222,128,0.06) 0%, transparent 60%)"
            }} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.18)" }}>
                  <Activity size={13} style={{ color: "#4ade80" }} />
                </div>
                <span className="text-[10px] mono uppercase tracking-wider" style={{ color: "#475569" }}>Server Health</span>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-xl font-bold" style={{ color: isRunning ? "#4ade80" : "#475569" }}>
                  {isRunning ? "20" : "—"}
                </span>
                {isRunning && <span className="text-xs" style={{ color: "#475569" }}>TPS</span>}
              </div>
              <div className="h-2 rounded-full overflow-hidden mt-2" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: isRunning ? "100%" : "0%", background: "linear-gradient(90deg, #15803d, #22c55e)" }} />
              </div>
              <p className="text-[10px] mono mt-1.5" style={{ color: isRunning ? "#4ade80" : "#475569" }}>
                {isRunning ? "Healthy" : "Server offline"}
              </p>
            </div>
          </div>
        </div>

        {/* ── CONSOLE + SIDEBAR ROW — fills all remaining height, no page scroll ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ─── CONSOLE PANEL ─── */}
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden" style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>

            {/* Console toolbar */}
            <div className="flex items-center justify-between px-4 py-2 gap-2 flex-wrap"
              style={{ background: "#0b0b14", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>

              <div className="flex items-center gap-2">
                {/* macOS dots */}
                <div className="flex gap-1.5 mr-1">
                  <div className="w-3 h-3 rounded-full" style={{ background: "#ef4444" }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: "#f59e0b" }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: "#22c55e" }} />
                </div>
                <span className="text-[10px] mono" style={{ color: "#334155" }}>{server?.name} — console</span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Search */}
                <AnimatePresence>
                  {searchOpen && (
                    <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 152, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }} className="overflow-hidden flex items-center rounded-lg"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <Search size={10} className="ml-2 shrink-0" style={{ color: "#475569" }} />
                      <input autoFocus type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search…"
                        className="flex-1 bg-transparent outline-none px-2 py-1 mono text-[11px]"
                        style={{ color: "#e2e8f0" }} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {[
                  { icon: Search, title: "Search", active: searchOpen, onClick: () => { setSearchOpen(o => !o); if (searchOpen) setSearchQuery(""); } },
                  { icon: X, title: "Clear console", active: false, onClick: () => setLogs([]) },
                  { icon: Download, title: "Download log", active: false, onClick: downloadLogs },
                  { icon: autoScroll ? ChevronDown : ChevronUp, title: "Auto-scroll", active: autoScroll, onClick: () => setAutoScroll(a => !a) },
                ].map(({ icon: Icon, title, active, onClick }) => (
                  <button key={title} title={title} onClick={onClick}
                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:opacity-80"
                    style={{
                      background: active ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.04)",
                      color: active ? "#a78bfa" : "#475569",
                      border: active ? "1px solid rgba(139,92,246,0.25)" : "1px solid rgba(255,255,255,0.06)",
                    }}>
                    <Icon size={12} />
                  </button>
                ))}

                {/* WS status */}
                {wsStatus === "connected" ? (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] mono"
                    style={{ background: "rgba(74,222,128,0.08)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.18)" }}>
                    <Wifi size={9} /> Live
                  </span>
                ) : wsStatus === "connecting" ? (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] mono"
                    style={{ background: "rgba(251,191,36,0.08)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.18)" }}>
                    <Loader2 size={9} className="animate-spin" /> Connecting
                  </span>
                ) : (
                  <button onClick={connect}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] mono transition-all hover:opacity-80"
                    style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.18)" }}>
                    <WifiOff size={9} /> Reconnect
                  </button>
                )}
              </div>
            </div>

            {/* Log output — fills remaining height, only this scrolls */}
            <div ref={logsRef} onScroll={handleConsoleScroll} onClick={() => inputRef.current?.focus()}
              className="flex-1 overflow-y-auto cursor-text mono text-[12px] leading-[1.7]"
              style={{ background: "#060608", padding: "16px 20px" }}>

              {/* Header line */}
              <div className="mb-4 pb-3 select-none" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span className="font-bold" style={{ color: "#a855f7" }}>NetherNodes</span>
                <span style={{ color: "#1e293b" }}> — Minecraft Server Console</span>
                <br />
                <span style={{ color: "#1e293b", fontSize: 10 }}>{server?.plan} plan · {server?.ram} RAM</span>
              </div>

              {filteredLogs.length === 0 ? (
                <span className="select-none" style={{ color: "#1e293b" }}>
                  {searchQuery ? "No matching lines." : "Waiting for output…"}
                </span>
              ) : (
                filteredLogs.map(line => {
                  const s = LINE_STYLE[line.type];
                  return (
                    <div key={line.id} className="flex items-start gap-2 mb-0.5 group">
                      {s.badge && (
                        <span className="shrink-0 text-[9px] mono font-bold px-1.5 py-0.5 rounded mt-0.5"
                          style={{ color: s.color, background: s.badgeBg, minWidth: 34, textAlign: "center", lineHeight: 1.4 }}>
                          {s.badge}
                        </span>
                      )}
                      <span className="whitespace-pre-wrap break-all" style={{ color: s.color }}>{line.text}</span>
                    </div>
                  );
                })
              )}
              <div ref={logsEnd} />
            </div>

            {/* Command input */}
            <div className="flex items-center shrink-0"
              style={{ background: "#0d0d18", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {/* Prompt */}
              <div className="flex items-center px-4 select-none shrink-0">
                <span className="text-sm font-bold mono" style={{ color: "#7c3aed" }}>›</span>
                {input === "" && (
                  <span className="inline-block w-1.5 h-[13px] ml-1 rounded-sm transition-opacity"
                    style={{ background: "#7c3aed", opacity: blink ? 0.7 : 0 }} />
                )}
              </div>
              <input ref={inputRef} type="text" value={input}
                onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={wsStatus === "connected" ? "Enter command…" : "Not connected"}
                disabled={wsStatus !== "connected"}
                className="flex-1 bg-transparent outline-none py-3 mono text-[12px]"
                style={{ color: "#e2e8f0", caretColor: "transparent" }}
              />
              {history.length > 0 && (
                <span className="hidden sm:block text-[9px] mono px-3 select-none" style={{ color: "#1e293b" }}>↑↓</span>
              )}
              <button onClick={sendCommand} disabled={!input.trim() || wsStatus !== "connected"}
                className="px-5 py-3 text-xs font-bold transition-all hover:opacity-90 disabled:opacity-30 shrink-0"
                style={{
                  background: "linear-gradient(135deg, #6d28d9, #7c3aed)",
                  color: "white",
                  borderLeft: "1px solid rgba(139,92,246,0.3)",
                }}>
                RUN
              </button>
            </div>
          </div>

          {/* ─── RIGHT SIDEBAR PANEL ─── */}
          <div className="hidden lg:flex flex-col shrink-0 overflow-y-auto" style={{ width: 260, background: "#09090f" }}>

            {/* Server Address */}
            <div className="p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[9px] mono uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: "#334155" }}>
                <Globe size={9} /> Server Address
              </p>
              {displayAddr ? (
                <button onClick={() => copyAddr(displayAddr)}
                  className="w-full group flex items-center justify-between gap-2 p-2.5 rounded-xl transition-all"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span className="text-[11px] mono truncate" style={{ color: "#4ade80" }}>{displayAddr}</span>
                  {copied ? <Check size={12} style={{ color: "#4ade80" }} /> : <Copy size={12} style={{ color: "#334155" }} />}
                </button>
              ) : (
                <p className="text-[10px] mono" style={{ color: "#334155" }}>Not assigned yet</p>
              )}
            </div>

            {/* Players Online */}
            <div className="p-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)" }}>
                <UsersIcon size={16} style={{ color: "#4ade80" }} />
              </div>
              <div>
                <p className="text-[9px] mono uppercase tracking-widest" style={{ color: "#334155" }}>Players Online</p>
                <p className="text-lg font-bold mt-0.5" style={{ color: "#f1f5f9" }}>{isRunning ? "0" : "—"}</p>
              </div>
            </div>

            {/* Uptime */}
            <div className="p-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.14)" }}>
                <Clock size={16} style={{ color: "#fbbf24" }} />
              </div>
              <div>
                <p className="text-[9px] mono uppercase tracking-widest" style={{ color: "#334155" }}>Uptime</p>
                <p className="text-sm font-bold mt-0.5" style={{ color: "#f1f5f9" }}>
                  {resources?.uptimeMs && resources.uptimeMs > 0 ? fmtUptime(resources.uptimeMs) : "—"}
                </p>
              </div>
            </div>

            {/* DDoS Protection */}
            <div className="p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="rounded-xl p-3 flex items-center gap-3"
                style={{ background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.12)" }}>
                <Shield size={18} style={{ color: "#60a5fa" }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: "#93c5fd" }}>DDoS Protection</p>
                  <p className="text-[10px] mono mt-0.5" style={{ color: "#334155" }}>Cloudflare · Active</p>
                </div>
                <div className="ml-auto w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: "0 0 6px #4ade80" }} />
              </div>
            </div>

            {/* Custom Domain */}
            <div className="p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] mono uppercase tracking-widest flex items-center gap-1.5" style={{ color: "#334155" }}>
                  <Globe size={9} /> Custom Domain
                </p>
                {server?.hostname && !showHnForm && (
                  <button onClick={() => { setShowHnForm(true); setHnEdit(server.hostname ?? ""); setHnAvail(null); setHnError(""); }}
                    className="transition-colors hover:text-purple-400" style={{ color: "#334155" }}>
                    <Edit3 size={11} />
                  </button>
                )}
              </div>

              {server?.hostname && !showHnForm ? (
                <div className="rounded-xl p-2.5" style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.15)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${server.hostnameStatus === "active" ? "bg-green-400" : "bg-yellow-400"}`} />
                    <span className="text-[9px] mono" style={{ color: "#475569" }}>
                      {server.hostnameStatus === "active" ? "Active" : "Activating…"}
                    </span>
                  </div>
                  <p className="text-[11px] mono break-all" style={{ color: "#c4b5fd" }}>{server.customAddress}</p>
                </div>
              ) : showHnForm ? (
                <div className="space-y-2">
                  <div className="flex items-center rounded-xl overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <input type="text" value={hnEdit}
                      onChange={e => {
                        const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 32);
                        setHnEdit(v); setHnAvail(null);
                        if (v.length >= 3) {
                          clearTimeout((window as any)._hn2);
                          (window as any)._hn2 = setTimeout(async () => {
                            setHnChecking(true);
                            try {
                              const r = await apiFetch(`/api/hostnames/check?name=${encodeURIComponent(v)}`);
                              const d = await r.json();
                              setHnAvail(d.available);
                              setHnError(d.available ? "" : (d.reason || "Not available"));
                            } catch { setHnAvail(null); }
                            finally { setHnChecking(false); }
                          }, 500);
                        }
                      }}
                      placeholder="yourname"
                      className="flex-1 bg-transparent outline-none px-2.5 py-1.5 mono text-[11px] min-w-0"
                      style={{ color: "#e2e8f0" }}
                    />
                    {hnChecking && <Loader2 size={10} className="animate-spin mr-2" style={{ color: "#475569" }} />}
                    {!hnChecking && hnAvail === true && <Check size={10} className="mr-2" style={{ color: "#4ade80" }} />}
                  </div>
                  {hnError && <p className="text-[9px] mono" style={{ color: "#f87171" }}>{hnError}</p>}
                  <div className="flex gap-1.5">
                    <button onClick={() => { setShowHnForm(false); setHnError(""); }}
                      className="flex-1 h-7 rounded-lg text-[10px] transition-colors"
                      style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#475569" }}>Cancel</button>
                    <button disabled={hnSubmitting || !hnAvail || hnEdit.length < 3}
                      onClick={async () => {
                        setHnSubmitting(true); setHnError("");
                        try {
                          const method = server?.hostname ? "PUT" : "POST";
                          const r = await apiFetch(`/api/servers/${id}/hostname`, {
                            method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
                            body: JSON.stringify({ name: hnEdit }),
                          });
                          const d = await r.json();
                          if (!r.ok) { setHnError(d.error || "Failed."); return; }
                          setServer(p => p ? { ...p, hostname: d.hostname, hostnameStatus: d.hostnameStatus, customAddress: d.customAddress } : p);
                          setShowHnForm(false);
                        } catch { setHnError("Network error."); }
                        finally { setHnSubmitting(false); }
                      }}
                      className="flex-1 h-7 rounded-lg text-[10px] font-semibold disabled:opacity-30 transition-all hover:opacity-90"
                      style={{ background: "#7c3aed", color: "white" }}>
                      {hnSubmitting ? <Loader2 size={10} className="animate-spin mx-auto" /> : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setShowHnForm(true); setHnEdit(""); setHnAvail(null); setHnError(""); }}
                  className="w-full h-9 flex items-center justify-center gap-2 rounded-xl text-[11px] font-medium transition-all hover:opacity-80"
                  style={{ background: "rgba(124,58,237,0.1)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}>
                  <Globe size={12} /> Set Custom Address
                </button>
              )}

              {server?.customAddress && (
                <div className="mt-2 p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-[9px] mono" style={{ color: "#334155" }}>Your domain</p>
                  <p className="text-[11px] mono mt-0.5 break-all" style={{ color: "#7dd3fc" }}>{server.customAddress}</p>
                </div>
              )}
            </div>

            {/* Quick Actions header */}
            <div className="px-4 pt-4 pb-2">
              <p className="text-[9px] mono uppercase tracking-widest" style={{ color: "#334155" }}>Quick Actions</p>
            </div>

            {/* Action list */}
            {([
              { icon: Package, label: "Install Plugin", sub: "Browse Modrinth", color: "#a78bfa", to: `/server/${id}/installer` },
              { icon: UploadCloud, label: "Upload World", sub: "Drop world files", color: "#60a5fa", action: () => { setShowUploadWorld(true); setWorldFile(null); setUploadWorldErr(""); setUploadWorldMsg(""); } },
              { icon: HardDrive, label: "Create Backup", sub: "Snapshot now", color: "#fbbf24", to: `/server/${id}/files` },
              { icon: Calendar, label: "Schedule Restart", sub: "Auto-restart", color: "#4ade80", action: () => confirm("Send restart signal?") && sendPower("restart") },
              { icon: List, label: "Whitelist Manager", sub: "Manage players", color: "#f87171", to: `/server/${id}/users` },
              { icon: Zap, label: "Custom Address", sub: "Manage domain", color: "#c084fc", action: () => { setShowHnForm(true); setHnEdit(server?.hostname ?? ""); setHnAvail(null); setHnError(""); } },
            ] as const).map(item => {
              const Comp: any = (item as any).to ? Link : "button";
              const extra = (item as any).to ? { to: (item as any).to } : { onClick: (item as any).action };
              return (
                <Comp key={item.label} {...extra}
                  className="flex items-center gap-3 px-4 py-2.5 w-full text-left transition-all group"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                  onMouseEnter={(e: any) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                  onMouseLeave={(e: any) => e.currentTarget.style.background = "transparent"}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${item.color}12`, border: `1px solid ${item.color}22` }}>
                    <item.icon size={14} style={{ color: item.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: "#cbd5e1" }}>{item.label}</p>
                    <p className="text-[10px] mono" style={{ color: "#334155" }}>{item.sub}</p>
                  </div>
                </Comp>
              );
            })}
          </div>
          {/* end right sidebar */}
        </div>
        {/* end console + sidebar row */}
      </div>
      {/* end main content */}

      {/* ══════ UPLOAD WORLD MODAL ══════ */}
      <AnimatePresence>
        {showUploadWorld && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
            onClick={() => !uploadingWorld && setShowUploadWorld(false)}>
            <motion.div initial={{ scale: 0.94, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0 }} transition={{ duration: 0.18 }}
              className="rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}
              style={{
                background: "linear-gradient(135deg, #0f0f1a, #0d0d18)",
                border: "1px solid rgba(96,165,250,0.25)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
              }}>

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.25)" }}>
                    <UploadCloud size={16} style={{ color: "#60a5fa" }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "#f1f5f9" }}>Upload World</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "#475569" }}>Upload a world folder or zip to your server</p>
                  </div>
                </div>
                <button onClick={() => setShowUploadWorld(false)} style={{ color: "#475569" }}>
                  <X size={15} />
                </button>
              </div>

              {/* Hidden file input */}
              <input
                ref={worldInputRef}
                type="file"
                className="hidden"
                accept=".zip,.tar,.gz,.rar,.7z,.json,.dat,.mca,.mcworld"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { setWorldFile(f); setUploadWorldErr(""); setUploadWorldMsg(""); }
                  e.target.value = "";
                }}
              />

              {/* Drop zone */}
              <div
                onClick={() => worldInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setWorldDragOver(true); }}
                onDragLeave={() => setWorldDragOver(false)}
                onDrop={e => {
                  e.preventDefault(); setWorldDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) { setWorldFile(f); setUploadWorldErr(""); setUploadWorldMsg(""); }
                }}
                className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-8 cursor-pointer transition-all mb-4"
                style={{
                  borderColor: worldDragOver ? "#60a5fa" : worldFile ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.1)",
                  background: worldDragOver ? "rgba(96,165,250,0.06)" : worldFile ? "rgba(74,222,128,0.04)" : "rgba(255,255,255,0.02)",
                }}>
                {worldFile ? (
                  <>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)" }}>
                      <Check size={18} style={{ color: "#4ade80" }} />
                    </div>
                    <p className="text-sm font-semibold" style={{ color: "#4ade80" }}>{worldFile.name}</p>
                    <p className="text-[10px] mt-1" style={{ color: "#475569" }}>
                      {(worldFile.size / 1048576).toFixed(2)} MB — click to change
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.18)" }}>
                      <UploadCloud size={18} style={{ color: worldDragOver ? "#60a5fa" : "#475569" }} />
                    </div>
                    <p className="text-sm font-semibold" style={{ color: "#94a3b8" }}>
                      {worldDragOver ? "Drop it!" : "Click or drag & drop"}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: "#334155" }}>
                      Supports .zip, .dat, .mca, .mcworld files
                    </p>
                  </>
                )}
              </div>

              {/* Status messages */}
              {uploadWorldErr && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-4 text-xs"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                  <AlertCircle size={12} className="shrink-0" /> {uploadWorldErr}
                </div>
              )}
              {uploadWorldMsg && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-4 text-xs"
                  style={{ background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80" }}>
                  <Check size={12} className="shrink-0" /> {uploadWorldMsg}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={() => setShowUploadWorld(false)} disabled={uploadingWorld}
                  className="flex-1 h-10 rounded-xl text-xs disabled:opacity-40 transition-colors"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>
                  Cancel
                </button>
                <button onClick={uploadWorld} disabled={!worldFile || uploadingWorld}
                  className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", color: "white" }}>
                  {uploadingWorld
                    ? <><Loader2 size={13} className="animate-spin" /> Uploading…</>
                    : <><UploadCloud size={13} /> Upload World</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════ DELETE MODAL ══════ */}
      <AnimatePresence>
        {showDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)" }}
            onClick={() => !deleting && setShowDelete(false)}>
            <motion.div initial={{ scale: 0.94, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0 }} transition={{ duration: 0.18 }}
              className="rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}
              style={{
                background: "linear-gradient(135deg, #0f0f1a, #110d1d)",
                border: "1px solid rgba(239,68,68,0.25)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(239,68,68,0.08)",
              }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <Trash2 size={18} style={{ color: "#f87171" }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#f1f5f9" }}>Delete server?</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#475569" }}>
                    Destroys <span style={{ color: "#f1f5f9" }}>{server?.name}</span> permanently
                  </p>
                </div>
              </div>
              <div className="rounded-xl px-3 py-2 mb-4 text-xs"
                style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#fca5a5" }}>
                ⚠ Cannot be undone. All files and data will be deleted.
              </div>
              <label className="text-[9px] mono uppercase tracking-wider block mb-1.5" style={{ color: "#475569" }}>
                Type <span style={{ color: "#f1f5f9", fontWeight: 700 }}>{server?.name}</span> to confirm
              </label>
              <input type="text" value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && deleteInput === server?.name && deleteServer()}
                autoFocus placeholder={server?.name}
                className="w-full rounded-xl px-3 py-2 text-sm bg-transparent outline-none mb-4 mono"
                style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#f1f5f9" }} />
              <div className="flex gap-2">
                <button onClick={() => setShowDelete(false)} disabled={deleting}
                  className="flex-1 h-9 rounded-xl text-xs transition-colors disabled:opacity-40"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>Cancel</button>
                <button onClick={deleteServer} disabled={deleting || deleteInput !== server?.name}
                  className="flex-1 h-9 flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all hover:opacity-90 disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg, #991b1b, #dc2626)", color: "white" }}>
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  {deleting ? "Deleting…" : "Delete Forever"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
