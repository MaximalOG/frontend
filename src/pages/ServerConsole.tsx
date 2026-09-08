import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, AlertCircle, Wifi, WifiOff, Check, Copy,
  Globe, Edit3, Trash2, Shield, Clock, Users as UsersIcon,
  HardDrive, Cpu, MemoryStick, Terminal, Download,
  Search, X, ChevronUp, ChevronDown, Play, Square, RotateCcw,
  UploadCloud, Package, Calendar, List, Zap, Server,
  Activity, ArrowLeft,
} from "lucide-react";
import ServerSidebar from "@/components/ServerSidebar";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

/* ─────────────────────────────── Types ─────────────────────────────── */
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

/* ─────────────────────────────── Helpers ────────────────────────────── */
let _lid = 0;
const mkLine = (text: string, type: LogLine["type"] = "info"): LogLine => ({ id: ++_lid, text, type });

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "")
            .replace(/\x1B\[[0-9;]*m/g, "")
            .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");
}

function rebrand(str: string): string {
  return str
    .replace(/\[Pterodactyl Daemon\]/gi, "[NetherNodes]")
    .replace(/Pterodactyl Daemon/gi, "NetherNodes")
    .replace(/container@pterodactyl~/gi, "server@nethernodes ~")
    .replace(/Pterodactyl/gi, "NetherNodes");
}

function processLine(raw: string): string {
  return rebrand(stripAnsi(raw)).trim();
}

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

function now(): string {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function fmtBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GiB`;
  return `${(bytes / 1024 / 1024).toFixed(0)} MiB`;
}

function fmtUptime(ms: number): string {
  if (ms <= 0) return "—";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m ${s % 60}s`;
}

/* ──────────────────────── Log-level badge ───────────────────────────── */
const LOG_BADGE: Record<LogLine["type"], { label: string; color: string; bg: string }> = {
  error:   { label: "ERROR",   color: "hsl(350 85% 65%)",  bg: "hsl(350 85% 10%)" },
  warn:    { label: "WARN",    color: "hsl(38 90% 60%)",   bg: "hsl(38 90% 10%)" },
  success: { label: "INFO",    color: "hsl(142 65% 50%)",  bg: "hsl(142 65% 8%)" },
  info:    { label: "INFO",    color: "hsl(0 0% 60%)",     bg: "transparent" },
  input:   { label: "CMD",     color: "hsl(210 80% 65%)",  bg: "hsl(210 80% 8%)" },
  system:  { label: "SYS",     color: "hsl(270 70% 70%)",  bg: "hsl(270 70% 8%)" },
};

/* ─── Sparkline (mini CPU chart) ─────────────────────────────────────── */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const w = 56, h = 24;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Mini progress bar ──────────────────────────────────────────────── */
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(0 0% 12%)" }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/* ═══════════════════════════════ COMPONENT ════════════════════════════ */
const ServerConsole = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, token, logout } = useAuth();

  /* server state */
  const [server, setServer]               = useState<ServerData | null>(null);
  const [loadingServer, setLoadingServer] = useState(true);
  const [serverError, setServerError]     = useState("");

  /* console state */
  const [logs, setLogs]       = useState<LogLine[]>([]);
  const [input, setInput]     = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [wsStatus, setWsStatus] = useState<"disconnected" | "connecting" | "connected" | "error">("disconnected");
  const [autoScroll, setAutoScroll] = useState(true);

  /* console toolbar state */
  const [searchOpen, setSearchOpen]   = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [blinkCursor, setBlinkCursor] = useState(true);

  /* power */
  const [powerLoading, setPowerLoading] = useState<string | null>(null);

  /* copy address */
  const [copiedAddr, setCopiedAddr] = useState(false);

  /* delete */
  const [showDelete, setShowDelete]   = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting]       = useState(false);

  /* hostname */
  const [showHnForm, setShowHnForm]     = useState(false);
  const [hnEdit, setHnEdit]             = useState("");
  const [hnChecking, setHnChecking]     = useState(false);
  const [hnAvail, setHnAvail]           = useState<null | boolean>(null);
  const [hnSubmitting, setHnSubmitting] = useState(false);
  const [hnError, setHnError]           = useState("");

  /* live resources */
  const [resources, setResources] = useState<{
    available: boolean; cpu: number; memoryBytes: number;
    diskBytes: number; netRxBytes: number; netTxBytes: number; uptimeMs: number;
  } | null>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(20).fill(0));

  /* refs */
  const wsRef    = useRef<WebSocket | null>(null);
  const logsRef  = useRef<HTMLDivElement>(null);
  const logsEnd  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<string>("");

  /* cursor blink */
  useEffect(() => {
    const t = setInterval(() => setBlinkCursor(b => !b), 530);
    return () => clearInterval(t);
  }, []);

  /* auth guard */
  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { state: { from: `/server/${id}/console` } });
  }, [authLoading, user, navigate, id]);

  /* fetch server info */
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

  /* addLog */
  const addLog = useCallback((text: string, type: LogLine["type"] = "info") => {
    setLogs(prev => [...prev.slice(-1200), mkLine(text, type)]);
  }, []);

  /* auto-scroll */
  useEffect(() => {
    if (autoScroll) logsEnd.current?.scrollIntoView({ behavior: "auto" });
  }, [logs, autoScroll]);

  const handleConsoleScroll = () => {
    const el = logsRef.current;
    if (!el) return;
    setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
  };

  /* WebSocket connect */
  const connect = useCallback(async () => {
    if (!id || wsRef.current?.readyState === WebSocket.OPEN) return;
    setWsStatus("connecting");
    addLog(`[${now()}] Connecting to NetherNodes console…`, "system");
    try {
      const res = await apiFetch(`/api/servers/${id}/console-token`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) {
        const e = await res.json();
        addLog(`[${now()}] Failed: ${e.error}`, "error");
        setWsStatus("error");
        return;
      }
      const { token: wsToken, socket: wsUrl } = await res.json();
      if (!wsToken || !wsUrl) {
        addLog(`[${now()}] Console unavailable.`, "error");
        setWsStatus("error");
        return;
      }
      tokenRef.current = wsToken;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => ws.send(JSON.stringify({ event: "auth", args: [wsToken] }));
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          switch (msg.event) {
            case "auth success":
              setWsStatus("connected");
              addLog(`[${now()}] ✓ Connected`, "success");
              break;
            case "token expiring":
              (async () => {
                try {
                  const r = await apiFetch(`/api/servers/${id}/console-token`, {
                    headers: { Authorization: `Bearer ${token()}` },
                  });
                  if (r.ok) {
                    const { token: t } = await r.json();
                    tokenRef.current = t;
                    ws.send(JSON.stringify({ event: "auth", args: [t] }));
                  }
                } catch {}
              })();
              break;
            case "token expired":
              addLog(`[${now()}] Session expired — reconnecting.`, "warn");
              ws.close();
              setTimeout(connect, 1500);
              break;
            case "console output":
              if (Array.isArray(msg.args)) {
                msg.args.forEach((raw: string) => {
                  const l = processLine(raw);
                  if (l) addLog(l, classifyLine(l));
                });
              }
              break;
            case "status":
              if (msg.args?.[0]) setServer(p => p ? { ...p, status: msg.args[0] } : p);
              break;
          }
        } catch {}
      };
      ws.onerror = () => { setWsStatus("error"); addLog(`[${now()}] Connection error.`, "error"); };
      ws.onclose = (e) => {
        setWsStatus("disconnected");
        if (e.code !== 1000) addLog(`[${now()}] Disconnected (${e.code}).`, "warn");
      };
    } catch (err: any) {
      addLog(`[${now()}] Failed: ${err?.message}`, "error");
      setWsStatus("error");
    }
  }, [id, token, addLog]);

  useEffect(() => {
    if (server && !server.pendingSetup) connect();
    return () => { wsRef.current?.close(1000); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server?.id]);

  /* poll resources */
  useEffect(() => {
    if (!user || !id) return;
    const fetchResources = async () => {
      try {
        const res = await apiFetch(`/api/servers/${id}/resources`, {
          headers: { Authorization: `Bearer ${token()}` },
        });
        if (res.ok) {
          const data = await res.json();
          setResources(data);
          if (data.available) {
            setCpuHistory(prev => [...prev.slice(1), data.cpu]);
          }
        }
      } catch {}
    };
    fetchResources();
    const interval = setInterval(fetchResources, 3000);
    return () => clearInterval(interval);
  }, [user, id, token]);

  /* send command */
  const sendCommand = () => {
    const cmd = input.trim();
    if (!cmd || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ event: "send command", args: [cmd] }));
    addLog(`> ${cmd}`, "input");
    setHistory(h => [cmd, ...h.slice(0, 49)]);
    setHistIdx(-1);
    setInput("");
    setAutoScroll(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { sendCommand(); return; }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const n = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(n); setInput(history[n] ?? "");
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const n = Math.max(histIdx - 1, -1);
      setHistIdx(n); setInput(n === -1 ? "" : history[n] ?? "");
    }
  };

  /* power */
  const sendPower = async (signal: "start" | "stop" | "restart" | "kill") => {
    setPowerLoading(signal);
    try {
      const res = await apiFetch(`/api/servers/${id}/power`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ signal }),
      });
      const data = await res.json();
      if (res.ok) addLog(`[${now()}] Power signal "${signal}" sent.`, "success");
      else addLog(`[${now()}] Power error: ${data.error}`, "error");
    } catch { addLog(`[${now()}] Network error.`, "error"); }
    finally { setPowerLoading(null); }
  };

  /* delete */
  const deleteServer = async () => {
    if (deleteInput !== server?.name) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/servers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) { wsRef.current?.close(1000); navigate("/dashboard"); }
      else { const d = await res.json(); addLog(`Delete failed: ${d.error}`, "error"); setShowDelete(false); }
    } catch { addLog("Network error.", "error"); setShowDelete(false); }
    finally { setDeleting(false); }
  };

  /* copy address */
  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr).then(() => {
      setCopiedAddr(true);
      setTimeout(() => setCopiedAddr(false), 2000);
    });
  };

  /* download logs */
  const downloadLogs = () => {
    const blob = new Blob([logs.map(l => l.text).join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${server?.name ?? "server"}-console.log`;
    a.click(); URL.revokeObjectURL(url);
  };

  /* filtered logs */
  const filteredLogs = searchQuery
    ? logs.filter(l => l.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : logs;

  /* status helpers */
  const STATUS_COLOR: Record<string, string> = {
    running: "hsl(142 70% 55%)", stopped: "hsl(0 0% 45%)",
    starting: "hsl(38 90% 60%)", stopping: "hsl(38 90% 60%)",
    installing: "hsl(200 80% 55%)", suspended: "hsl(350 85% 55%)",
  };
  const statusColor = STATUS_COLOR[server?.status ?? ""] ?? "hsl(38 90% 40%)";
  const isRunning = server?.status === "running";

  /* display address */
  const displayAddr = server?.customAddress ?? server?.host ?? null;

  /* ── parse RAM limit for progress bar ── */
  const parseRamMB = (ram?: string): number => {
    if (!ram) return 0;
    const n = parseFloat(ram);
    if (ram.toLowerCase().includes("gb")) return n * 1024;
    if (ram.toLowerCase().includes("mb")) return n;
    return n;
  };
  const ramLimitMB = parseRamMB(server?.ram);
  const ramUsedMB  = resources ? resources.memoryBytes / 1024 / 1024 : 0;

  /* ─────────── Loading / Error states ─────────── */
  if (authLoading || loadingServer) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "hsl(270 70% 15%)", border: "1px solid hsl(270 70% 30%)" }}>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(270 70% 60%)" }} />
        </div>
        <p className="text-sm text-muted-foreground">Loading console…</p>
      </div>
    </div>
  );

  if (serverError) return (
    <div className="h-screen bg-background flex items-center justify-center">
      <div className="text-center px-4">
        <AlertCircle className="w-10 h-10 text-primary mx-auto mb-4" />
        <p className="text-foreground font-semibold mb-2">Console unavailable</p>
        <p className="text-sm text-muted-foreground mb-6">{serverError}</p>
        <Link to="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "hsl(350 85% 45%)", color: "white" }}>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );

  /* ═════════════════════════════ RENDER ═════════════════════════════ */
  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">

      {/* ── Left Sidebar ── */}
      <div className="hidden md:flex flex-col sticky top-0 h-screen px-4 py-5 overflow-y-auto shrink-0"
        style={{ width: 236, borderRight: "1px solid hsl(0 0% 12%)", background: "hsl(0 0% 4.5%)" }}>
        {server && (
          <ServerSidebar server={server} onPower={sendPower} powerLoading={powerLoading} />
        )}
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid hsl(0 0% 12%)" }}>
          <button onClick={() => { setShowDelete(true); setDeleteInput(""); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all hover:brightness-110"
            style={{ color: "hsl(350 85% 45%)", background: "hsl(350 85% 5%)", border: "1px solid hsl(350 85% 16%)" }}>
            <Trash2 size={12} /> Delete Server
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex flex-1 flex-col overflow-x-hidden min-w-0 p-5 gap-5">

        {/* ══════════════ TOP HEADER ══════════════ */}
        <div className="rounded-2xl p-4 flex flex-wrap items-center gap-4"
          style={{
            background: "linear-gradient(135deg, hsl(260 20% 7%) 0%, hsl(270 20% 9%) 100%)",
            border: "1px solid hsl(270 20% 16%)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}>

          {/* Server icon + identity */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, hsl(270 70% 20%), hsl(350 85% 20%))",
                border: "1px solid hsl(270 50% 30%)",
                boxShadow: "0 0 14px rgba(130,80,200,0.25)",
              }}>
              <Server size={18} style={{ color: "hsl(270 70% 75%)" }} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-foreground truncate">{server?.name}</h1>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                {/* Plan badge */}
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold mono uppercase tracking-wider"
                  style={{ background: "hsl(270 70% 14%)", color: "hsl(270 70% 70%)", border: "1px solid hsl(270 70% 22%)" }}>
                  {server?.plan}
                </span>
                {/* Version badge */}
                {server?.mcVersion && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium mono"
                    style={{ background: "hsl(200 70% 10%)", color: "hsl(200 70% 60%)", border: "1px solid hsl(200 70% 18%)" }}>
                    {server.serverType && `${server.serverType} `}{server.mcVersion}
                  </span>
                )}
                {/* Status badge */}
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                  style={{
                    background: `${statusColor}18`,
                    color: statusColor,
                    border: `1px solid ${statusColor}35`,
                  }}>
                  <span className="relative flex h-1.5 w-1.5">
                    {isRunning && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                        style={{ background: statusColor }} />
                    )}
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5"
                      style={{ background: statusColor }} />
                  </span>
                  {server?.status.charAt(0).toUpperCase()}{server?.status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Right meta badges */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {server?.node && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                style={{ background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 15%)", color: "hsl(0 0% 55%)" }}>
                <Globe size={11} />
                <span className="mono">{server.node}</span>
              </div>
            )}
            {resources?.uptimeMs && resources.uptimeMs > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                style={{ background: "hsl(142 60% 6%)", border: "1px solid hsl(142 60% 14%)", color: "hsl(142 65% 50%)" }}>
                <Clock size={11} />
                <span className="mono">Up {fmtUptime(resources.uptimeMs)}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
              style={{ background: "hsl(200 70% 6%)", border: "1px solid hsl(200 70% 14%)", color: "hsl(200 70% 55%)" }}>
              <Shield size={11} />
              <span>DDoS Protected</span>
            </div>
          </div>
        </div>

        {/* ══════════════ LIVE METRICS ROW ══════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          {/* CPU */}
          <div className="rounded-2xl p-4 transition-all duration-200 hover:translate-y-[-1px]"
            style={{
              background: "linear-gradient(135deg, hsl(260 15% 7%) 0%, hsl(260 12% 9%) 100%)",
              border: "1px solid hsl(260 10% 14%)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
            }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "hsl(38 90% 9%)", border: "1px solid hsl(38 90% 18%)" }}>
                  <Cpu size={13} style={{ color: "hsl(38 90% 60%)" }} />
                </div>
                <span className="text-[10px] mono uppercase tracking-wider text-muted-foreground/50">CPU</span>
              </div>
              {resources?.available && (
                <Sparkline data={cpuHistory} color={
                  (resources?.cpu ?? 0) > 80 ? "hsl(350 85% 55%)" :
                  (resources?.cpu ?? 0) > 50 ? "hsl(38 90% 55%)" : "hsl(142 65% 50%)"
                } />
              )}
            </div>
            <p className="text-2xl font-bold text-foreground">
              {resources?.available ? `${resources.cpu.toFixed(1)}` : "—"}
              <span className="text-sm text-muted-foreground/50 font-normal ml-1">%</span>
            </p>
            <div className="mt-2">
              <ProgressBar
                value={resources?.cpu ?? 0}
                max={100}
                color={(resources?.cpu ?? 0) > 80 ? "hsl(350 85% 50%)" : (resources?.cpu ?? 0) > 50 ? "hsl(38 90% 55%)" : "hsl(142 65% 50%)"}
              />
            </div>
          </div>

          {/* RAM */}
          <div className="rounded-2xl p-4 transition-all duration-200 hover:translate-y-[-1px]"
            style={{
              background: "linear-gradient(135deg, hsl(260 15% 7%) 0%, hsl(260 12% 9%) 100%)",
              border: "1px solid hsl(260 10% 14%)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
            }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "hsl(270 70% 9%)", border: "1px solid hsl(270 70% 18%)" }}>
                <MemoryStick size={13} style={{ color: "hsl(270 70% 65%)" }} />
              </div>
              <span className="text-[10px] mono uppercase tracking-wider text-muted-foreground/50">RAM</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {resources?.available ? `${ramUsedMB.toFixed(0)}` : "—"}
              <span className="text-sm text-muted-foreground/50 font-normal ml-1">MiB</span>
            </p>
            {server?.ram && (
              <p className="text-[10px] text-muted-foreground/30 mono mt-0.5">/ {server.ram}</p>
            )}
            <div className="mt-2">
              <ProgressBar value={ramUsedMB} max={ramLimitMB} color="hsl(270 70% 60%)" />
            </div>
          </div>

          {/* Disk */}
          <div className="rounded-2xl p-4 transition-all duration-200 hover:translate-y-[-1px]"
            style={{
              background: "linear-gradient(135deg, hsl(260 15% 7%) 0%, hsl(260 12% 9%) 100%)",
              border: "1px solid hsl(260 10% 14%)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
            }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "hsl(200 70% 8%)", border: "1px solid hsl(200 70% 16%)" }}>
                <HardDrive size={13} style={{ color: "hsl(200 70% 60%)" }} />
              </div>
              <span className="text-[10px] mono uppercase tracking-wider text-muted-foreground/50">Disk</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {resources?.available ? fmtBytes(resources.diskBytes) : "—"}
            </p>
            {server?.ssd && (
              <p className="text-[10px] text-muted-foreground/30 mono mt-0.5">/ {server.ssd}</p>
            )}
            <div className="mt-2">
              <ProgressBar
                value={resources?.diskBytes ?? 0}
                max={(resources?.diskBytes ?? 0) > 0 && server?.ssd
                  ? parseFloat(server.ssd) * (server.ssd.toLowerCase().includes("gb") ? 1024 * 1024 * 1024 : 1024 * 1024)
                  : 1}
                color="hsl(200 70% 55%)"
              />
            </div>
          </div>

          {/* TPS / Health */}
          <div className="rounded-2xl p-4 transition-all duration-200 hover:translate-y-[-1px]"
            style={{
              background: "linear-gradient(135deg, hsl(260 15% 7%) 0%, hsl(260 12% 9%) 100%)",
              border: "1px solid hsl(260 10% 14%)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
            }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "hsl(142 60% 7%)", border: "1px solid hsl(142 60% 15%)" }}>
                <Activity size={13} style={{ color: "hsl(142 65% 55%)" }} />
              </div>
              <span className="text-[10px] mono uppercase tracking-wider text-muted-foreground/50">
                {isRunning ? "Status" : "Health"}
              </span>
            </div>
            <p className="text-2xl font-bold" style={{ color: isRunning ? "hsl(142 65% 55%)" : "hsl(0 0% 45%)" }}>
              {isRunning ? "20 TPS" : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground/30 mono mt-0.5">
              {isRunning ? "Server healthy" : "Server offline"}
            </p>
            <div className="mt-2">
              <ProgressBar value={isRunning ? 20 : 0} max={20} color="hsl(142 65% 50%)" />
            </div>
          </div>
        </div>

        {/* ══════════════ CONSOLE + RIGHT SIDEBAR ══════════════ */}
        <div className="flex gap-4 items-start">

          {/* ── Console Panel ── */}
          <div className="flex flex-col flex-1 min-w-0 rounded-2xl overflow-hidden"
            style={{
              border: "1px solid hsl(260 15% 14%)",
              background: "hsl(0 0% 4%)",
              boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
            }}>

            {/* Console top bar */}
            <div className="flex items-center justify-between px-4 py-3 gap-3 flex-wrap"
              style={{
                borderBottom: "1px solid hsl(0 0% 10%)",
                background: "linear-gradient(90deg, hsl(260 15% 6%) 0%, hsl(260 12% 7%) 100%)",
              }}>
              {/* Left: traffic lights + title */}
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: "hsl(0 70% 50%)" }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: "hsl(38 90% 55%)" }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: "hsl(142 60% 45%)" }} />
                </div>
                <span className="text-xs text-muted-foreground/50 mono">
                  {server?.name} — console
                </span>
              </div>

              {/* Right: toolbar buttons */}
              <div className="flex items-center gap-2">
                {/* Search */}
                <AnimatePresence>
                  {searchOpen && (
                    <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 160, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                      className="overflow-hidden flex items-center rounded-lg"
                      style={{ background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 18%)" }}>
                      <Search size={10} className="ml-2 shrink-0 text-muted-foreground/40" />
                      <input autoFocus type="text" value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search logs…"
                        className="flex-1 bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/30 outline-none px-2 py-1 mono"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <button onClick={() => { setSearchOpen(o => !o); if (searchOpen) setSearchQuery(""); }}
                  title="Search logs"
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:brightness-150"
                  style={{ background: searchOpen ? "hsl(270 70% 14%)" : "hsl(0 0% 10%)", color: searchOpen ? "hsl(270 70% 65%)" : "hsl(0 0% 45%)" }}>
                  <Search size={12} />
                </button>

                <button onClick={() => { setLogs([]); }} title="Clear console"
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:brightness-150"
                  style={{ background: "hsl(0 0% 10%)", color: "hsl(0 0% 45%)" }}>
                  <X size={12} />
                </button>

                <button onClick={downloadLogs} title="Download latest.log"
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:brightness-150"
                  style={{ background: "hsl(0 0% 10%)", color: "hsl(0 0% 45%)" }}>
                  <Download size={12} />
                </button>

                {/* Autoscroll toggle */}
                <button onClick={() => setAutoScroll(a => !a)} title="Toggle auto-scroll"
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                  style={{
                    background: autoScroll ? "hsl(142 60% 10%)" : "hsl(0 0% 10%)",
                    color: autoScroll ? "hsl(142 65% 55%)" : "hsl(0 0% 45%)",
                    border: autoScroll ? "1px solid hsl(142 60% 20%)" : "1px solid transparent",
                  }}>
                  {autoScroll ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                </button>

                {/* WS status */}
                {wsStatus === "connected" ? (
                  <span className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg"
                    style={{ background: "hsl(142 60% 8%)", color: "hsl(142 65% 55%)", border: "1px solid hsl(142 60% 16%)" }}>
                    <Wifi size={10} /> Live
                  </span>
                ) : wsStatus === "connecting" ? (
                  <span className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg"
                    style={{ background: "hsl(38 90% 8%)", color: "hsl(38 90% 60%)", border: "1px solid hsl(38 90% 16%)" }}>
                    <Loader2 size={10} className="animate-spin" /> Connecting
                  </span>
                ) : (
                  <button onClick={connect}
                    className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg transition-all hover:brightness-125"
                    style={{ background: "hsl(350 85% 8%)", color: "hsl(350 85% 55%)", border: "1px solid hsl(350 85% 16%)" }}>
                    <WifiOff size={10} /> Reconnect
                  </button>
                )}
              </div>
            </div>

            {/* Log output */}
            <div ref={logsRef} onScroll={handleConsoleScroll}
              onClick={() => inputRef.current?.focus()}
              className="overflow-y-auto font-mono text-[11.5px] leading-[1.75] cursor-text"
              style={{ height: 420, background: "hsl(0 0% 3%)", padding: "14px 16px" }}>

              {/* Banner */}
              <div className="mb-3 pb-3 select-none" style={{ borderBottom: "1px solid hsl(0 0% 8%)" }}>
                <span style={{ color: "hsl(270 70% 65%)" }} className="font-bold">NetherNodes</span>
                <span className="text-muted-foreground/25"> — Minecraft Server Console</span>
                <br />
                <span className="text-muted-foreground/20 text-[10px]">{server?.plan} plan · {server?.ram}</span>
              </div>

              {filteredLogs.length === 0 ? (
                <span className="text-muted-foreground/20 select-none">
                  {searchQuery ? "No matching log lines." : "Waiting for output…"}
                </span>
              ) : (
                filteredLogs.map(line => {
                  const b = LOG_BADGE[line.type];
                  return (
                    <div key={line.id} className="flex items-start gap-2 whitespace-pre-wrap break-all group">
                      {/* Level badge — only for non-info */}
                      {line.type !== "info" && (
                        <span className="shrink-0 text-[8px] mono font-bold px-1 py-0.5 rounded mt-0.5"
                          style={{ color: b.color, background: b.bg, minWidth: 32, textAlign: "center" }}>
                          {b.label}
                        </span>
                      )}
                      <span style={{ color: b.color }}>{line.text}</span>
                    </div>
                  );
                })
              )}
              <div ref={logsEnd} />
            </div>

            {/* Command input */}
            <div className="flex items-center gap-0"
              style={{
                borderTop: "1px solid hsl(0 0% 10%)",
                background: "linear-gradient(90deg, hsl(260 15% 5.5%) 0%, hsl(260 12% 6%) 100%)",
              }}>
              {/* prompt */}
              <span className="px-4 mono select-none text-sm font-bold"
                style={{ color: "hsl(270 70% 65%)" }}>
                ›
                {/* animated cursor when empty */}
                {input === "" && (
                  <span className="inline-block w-1.5 h-3.5 ml-1 rounded-sm align-middle transition-opacity"
                    style={{
                      background: "hsl(270 70% 65%)",
                      opacity: blinkCursor ? 0.8 : 0,
                    }} />
                )}
              </span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={wsStatus === "connected" ? "Type a command and press Enter…" : "Not connected"}
                disabled={wsStatus !== "connected"}
                className="flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground/20 outline-none py-3 mono"
              />
              {/* history hint */}
              {history.length > 0 && (
                <span className="text-[9px] text-muted-foreground/20 mono px-2 select-none hidden sm:block">
                  ↑↓ history
                </span>
              )}
              <button onClick={sendCommand} disabled={!input.trim() || wsStatus !== "connected"}
                className="px-5 py-3 text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-30"
                style={{
                  background: "linear-gradient(135deg, hsl(270 70% 35%), hsl(350 85% 38%))",
                  color: "white",
                  borderLeft: "1px solid hsl(270 50% 25%)",
                  borderRadius: "0 0 0 0",
                }}>
                Send
              </button>
            </div>
          </div>

          {/* ── Right Sidebar Widgets ── */}
          <div className="hidden lg:flex flex-col gap-3 shrink-0" style={{ width: 220 }}>

            {/* Server Address */}
            <div className="rounded-2xl p-4"
              style={{
                background: "linear-gradient(135deg, hsl(260 15% 7%), hsl(260 12% 9%))",
                border: "1px solid hsl(260 10% 14%)",
              }}>
              <p className="text-[9px] mono uppercase tracking-wider text-muted-foreground/40 mb-2 flex items-center gap-1.5">
                <Globe size={9} /> Server Address
              </p>
              {displayAddr ? (
                <button onClick={() => copyAddress(displayAddr)}
                  className="w-full text-left flex items-center justify-between gap-2 group">
                  <span className="text-[11px] mono text-green-300/80 group-hover:text-green-300 truncate transition-colors">
                    {displayAddr}
                  </span>
                  {copiedAddr
                    ? <Check size={11} className="text-green-400 shrink-0" />
                    : <Copy size={11} className="text-muted-foreground/30 group-hover:text-muted-foreground/70 shrink-0 transition-colors" />
                  }
                </button>
              ) : (
                <span className="text-[10px] text-muted-foreground/30">Not assigned yet</span>
              )}
            </div>

            {/* Players Online */}
            <div className="rounded-2xl p-4"
              style={{
                background: "linear-gradient(135deg, hsl(260 15% 7%), hsl(260 12% 9%))",
                border: "1px solid hsl(260 10% 14%)",
              }}>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: "hsl(142 60% 8%)", border: "1px solid hsl(142 60% 16%)" }}>
                  <UsersIcon size={11} style={{ color: "hsl(142 65% 55%)" }} />
                </div>
                <p className="text-[9px] mono uppercase tracking-wider text-muted-foreground/40">Players Online</p>
              </div>
              <p className="text-xl font-bold text-foreground">
                {isRunning ? "0" : "—"}
              </p>
              <p className="text-[9px] text-muted-foreground/30 mono mt-0.5">
                {isRunning ? `/ ${server?.plan?.includes("10") ? "10" : "20"} slots` : "Server offline"}
              </p>
            </div>

            {/* Uptime */}
            <div className="rounded-2xl p-4"
              style={{
                background: "linear-gradient(135deg, hsl(260 15% 7%), hsl(260 12% 9%))",
                border: "1px solid hsl(260 10% 14%)",
              }}>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: "hsl(38 90% 7%)", border: "1px solid hsl(38 90% 15%)" }}>
                  <Clock size={11} style={{ color: "hsl(38 90% 60%)" }} />
                </div>
                <p className="text-[9px] mono uppercase tracking-wider text-muted-foreground/40">Uptime</p>
              </div>
              <p className="text-xl font-bold text-foreground">
                {resources?.uptimeMs && resources.uptimeMs > 0 ? fmtUptime(resources.uptimeMs) : "—"}
              </p>
              {resources?.available && (
                <div className="flex gap-3 mt-1.5">
                  <span className="text-[9px] text-muted-foreground/30 mono">
                    ↓ {(resources.netRxBytes / 1024 / 1024).toFixed(1)} MiB
                  </span>
                  <span className="text-[9px] text-muted-foreground/30 mono">
                    ↑ {(resources.netTxBytes / 1024 / 1024).toFixed(1)} MiB
                  </span>
                </div>
              )}
            </div>

            {/* DDoS Protection */}
            <div className="rounded-2xl p-4"
              style={{
                background: "linear-gradient(135deg, hsl(200 60% 6%), hsl(200 50% 8%))",
                border: "1px solid hsl(200 60% 14%)",
              }}>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: "hsl(200 70% 8%)", border: "1px solid hsl(200 70% 16%)" }}>
                  <Shield size={11} style={{ color: "hsl(200 70% 60%)" }} />
                </div>
                <p className="text-[9px] mono uppercase tracking-wider text-muted-foreground/40">DDoS Protection</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" style={{ boxShadow: "0 0 6px hsl(142 65% 50%)" }} />
                <span className="text-xs font-semibold" style={{ color: "hsl(142 65% 55%)" }}>Active</span>
              </div>
              <p className="text-[9px] text-muted-foreground/30 mt-1">Cloudflare protected</p>
            </div>

            {/* Custom Domain */}
            <div className="rounded-2xl p-4"
              style={{
                background: "linear-gradient(135deg, hsl(270 20% 7%), hsl(270 15% 9%))",
                border: "1px solid hsl(270 20% 14%)",
              }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: "hsl(270 70% 9%)", border: "1px solid hsl(270 70% 18%)" }}>
                    <Globe size={11} style={{ color: "hsl(270 70% 65%)" }} />
                  </div>
                  <p className="text-[9px] mono uppercase tracking-wider text-muted-foreground/40">Custom Domain</p>
                </div>
                {server?.hostname && !showHnForm && (
                  <button onClick={() => { setShowHnForm(true); setHnEdit(server.hostname ?? ""); setHnAvail(null); setHnError(""); }}
                    className="text-muted-foreground/30 hover:text-primary transition-colors">
                    <Edit3 size={10} />
                  </button>
                )}
              </div>

              {server?.hostname && !showHnForm ? (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${server.hostnameStatus === "active" ? "bg-green-400" : "bg-yellow-400"}`} />
                    <span className="text-[9px] text-muted-foreground/40">
                      {server.hostnameStatus === "active" ? "Active" : "Activating…"}
                    </span>
                  </div>
                  <p className="text-[11px] mono text-foreground/80 break-all">{server.customAddress}</p>
                </div>
              ) : showHnForm ? (
                <div className="space-y-2">
                  <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid hsl(0 0% 20%)" }}>
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
                      className="flex-1 bg-transparent text-[11px] text-foreground outline-none px-2 py-1.5 mono min-w-0"
                    />
                    {hnChecking && <Loader2 size={10} className="animate-spin self-center mr-2 text-muted-foreground/40" />}
                    {!hnChecking && hnAvail === true && <Check size={10} className="self-center mr-2 text-green-400" />}
                  </div>
                  {hnError && <p className="text-[9px]" style={{ color: "hsl(350 85% 60%)" }}>{hnError}</p>}
                  <div className="flex gap-1.5">
                    <button onClick={() => { setShowHnForm(false); setHnError(""); }}
                      className="flex-1 h-7 rounded-xl text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      style={{ border: "1px solid hsl(0 0% 18%)" }}>
                      Cancel
                    </button>
                    <button
                      disabled={hnSubmitting || !hnAvail || hnEdit.length < 3}
                      onClick={async () => {
                        setHnSubmitting(true); setHnError("");
                        try {
                          const method = server?.hostname ? "PUT" : "POST";
                          const r = await apiFetch(`/api/servers/${id}/hostname`, {
                            method,
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
                            body: JSON.stringify({ name: hnEdit }),
                          });
                          const d = await r.json();
                          if (!r.ok) { setHnError(d.error || "Failed."); return; }
                          setServer(p => p ? { ...p, hostname: d.hostname, hostnameStatus: d.hostnameStatus, customAddress: d.customAddress } : p);
                          setShowHnForm(false);
                        } catch { setHnError("Network error."); }
                        finally { setHnSubmitting(false); }
                      }}
                      className="flex-1 h-7 rounded-xl text-[10px] font-semibold disabled:opacity-30 hover:brightness-110 transition-all"
                      style={{ background: "hsl(270 70% 40%)", color: "white" }}>
                      {hnSubmitting ? <Loader2 size={10} className="animate-spin mx-auto" /> : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setShowHnForm(true); setHnEdit(""); setHnAvail(null); setHnError(""); }}
                  className="w-full h-8 flex items-center justify-center gap-1.5 rounded-xl text-[10px] font-medium hover:brightness-110 transition-all"
                  style={{ background: "hsl(270 70% 10%)", color: "hsl(270 70% 60%)", border: "1px solid hsl(270 70% 18%)" }}>
                  <Globe size={10} /> Set Custom Address
                </button>
              )}
            </div>

          </div>
          {/* end right sidebar */}
        </div>
        {/* end console + right sidebar row */}

        {/* ══════════════ QUICK ACTIONS ══════════════ */}
        <div>
          <p className="text-[10px] mono uppercase tracking-widest text-muted-foreground/30 font-semibold mb-3">
            Quick Actions
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              {
                icon: Package, label: "Install Plugin", sub: "Browse Modrinth",
                color: "hsl(270 70% 60%)", bg: "hsl(270 70% 8%)", border: "hsl(270 70% 16%)",
                to: `/server/${id}/installer`,
              },
              {
                icon: UploadCloud, label: "Upload World", sub: "Drag & drop files",
                color: "hsl(200 70% 60%)", bg: "hsl(200 70% 7%)", border: "hsl(200 70% 14%)",
                to: `/server/${id}/files`,
              },
              {
                icon: HardDrive, label: "Create Backup", sub: "Snapshot server",
                color: "hsl(38 90% 60%)", bg: "hsl(38 90% 7%)", border: "hsl(38 90% 14%)",
                to: `/server/${id}/files`,
              },
              {
                icon: Calendar, label: "Schedule Restart", sub: "Set auto-restart",
                color: "hsl(142 65% 55%)", bg: "hsl(142 65% 7%)", border: "hsl(142 65% 14%)",
                action: () => {
                  if (confirm("Send restart signal now?")) sendPower("restart");
                },
              },
              {
                icon: List, label: "Whitelist Manager", sub: "Manage access",
                color: "hsl(350 85% 60%)", bg: "hsl(350 85% 7%)", border: "hsl(350 85% 14%)",
                to: `/server/${id}/users`,
              },
            ].map(item => {
              const Comp = item.to ? Link : "button";
              const props = item.to ? { to: item.to } : { onClick: (item as any).action };
              return (
                <Comp key={item.label} {...(props as any)}
                  className="flex flex-col gap-2 p-4 rounded-2xl text-left w-full transition-all duration-200 hover:translate-y-[-2px] hover:shadow-lg group"
                  style={{
                    background: `linear-gradient(135deg, ${item.bg}, ${item.bg}88)`,
                    border: `1px solid ${item.border}`,
                  }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: `${item.color}20`, border: `1px solid ${item.color}30` }}>
                    <item.icon size={15} style={{ color: item.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground group-hover:text-white transition-colors">
                      {item.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">{item.sub}</p>
                  </div>
                </Comp>
              );
            })}
          </div>
        </div>

        {/* Custom Address Manager quick card */}
        <div className="rounded-2xl p-4 flex items-center justify-between gap-4"
          style={{
            background: "linear-gradient(135deg, hsl(270 20% 7%), hsl(270 15% 9%))",
            border: "1px solid hsl(270 20% 14%)",
          }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "hsl(270 70% 10%)", border: "1px solid hsl(270 70% 20%)" }}>
              <Zap size={16} style={{ color: "hsl(270 70% 65%)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Custom Address Manager</p>
              <p className="text-[11px] text-muted-foreground/50 mono mt-0.5">
                {server?.customAddress ?? `${server?.name?.toLowerCase().replace(/\s/g,"-") ?? "yourserver"}.nethernodes.online`}
              </p>
            </div>
          </div>
          <button
            onClick={() => { setShowHnForm(true); setHnEdit(server?.hostname ?? ""); setHnAvail(null); setHnError(""); }}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:brightness-110 shrink-0"
            style={{ background: "hsl(270 70% 30%)", color: "hsl(270 70% 85%)", border: "1px solid hsl(270 70% 40%)" }}>
            Manage
          </button>
        </div>

      </div>
      {/* end main content */}

      {/* ══════════ DELETE MODAL ══════════ */}
      <AnimatePresence>
        {showDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
            onClick={() => !deleting && setShowDelete(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl p-6 max-w-sm w-full"
              style={{ background: "hsl(0 0% 8%)", border: "1px solid hsl(350 85% 30%)", boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "hsl(350 85% 12%)", border: "1px solid hsl(350 85% 28%)" }}>
                  <Trash2 size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Delete server?</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                    Permanently destroys <span className="text-foreground font-medium">{server?.name}</span>
                  </p>
                </div>
              </div>
              <div className="rounded-xl px-3 py-2 mb-4 text-xs"
                style={{ background: "hsl(350 85% 6%)", border: "1px solid hsl(350 85% 18%)", color: "hsl(350 85% 60%)" }}>
                ⚠ This cannot be undone. All files and data will be lost.
              </div>
              <label className="text-[9px] mono uppercase tracking-wider text-muted-foreground/50 block mb-1.5">
                Type <span className="text-foreground font-bold">{server?.name}</span> to confirm
              </label>
              <input type="text" value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && deleteInput === server?.name && deleteServer()}
                autoFocus placeholder={server?.name}
                className="w-full rounded-xl px-3 py-2 text-sm text-foreground bg-transparent outline-none mb-4 mono"
                style={{ border: "1px solid hsl(0 0% 22%)" }} />
              <div className="flex gap-3">
                <button onClick={() => setShowDelete(false)} disabled={deleting}
                  className="flex-1 h-9 rounded-xl text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                  style={{ border: "1px solid hsl(0 0% 20%)" }}>
                  Cancel
                </button>
                <button onClick={deleteServer} disabled={deleting || deleteInput !== server?.name}
                  className="flex-1 h-9 flex items-center justify-center gap-2 rounded-xl text-xs font-semibold hover:brightness-110 disabled:opacity-30 transition-all"
                  style={{ background: "hsl(350 85% 40%)", color: "white" }}>
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
};

export default ServerConsole;
