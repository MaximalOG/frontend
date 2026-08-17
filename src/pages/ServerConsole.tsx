import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Terminal, Play, Square, RotateCcw, Zap, ArrowLeft,
  Loader2, AlertCircle, Wifi, WifiOff,
  MemoryStick, Cpu, HardDrive, Copy, Check, FolderOpen, Users, Trash2, Globe, Edit3, X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

const ease = [0.16, 1, 0.3, 1] as const;

interface ServerData {
  id: string; name: string; status: string;
  ram: string; cpu: string; ssd?: string;
  plan: string; host?: string;
  serverType?: string; mcVersion?: string;
  pendingSetup?: boolean;
  hostname?: string | null;
  hostnameStatus?: string | null;
  hostnameDeclined?: boolean;
  customAddress?: string | null;
}

interface LogLine {
  id: number; text: string;
  type: "info" | "warn" | "error" | "success" | "input" | "system";
}

const STATUS_COLOR: Record<string, string> = {
  running:    "hsl(142 70% 55%)",
  stopped:    "hsl(0 0% 45%)",
  starting:   "hsl(38 90% 60%)",
  stopping:   "hsl(38 90% 60%)",
  installing: "hsl(200 80% 55%)",
  suspended:  "hsl(350 85% 55%)",
  unknown:    "hsl(38 90% 40%)",
};

const STATUS_LABEL: Record<string, string> = {
  running: "Running", stopped: "Stopped", starting: "Starting",
  stopping: "Stopping", installing: "Installing",
  suspended: "Suspended", unknown: "Unknown",
};

let _lid = 0;
const mkLine = (text: string, type: LogLine["type"] = "info"): LogLine => ({ id: ++_lid, text, type });

// Strip all ANSI escape sequences (color codes, cursor movement, etc.)
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "")
            .replace(/\x1B\[[0-9;]*m/g, "")
            .replace(/\x1B\[[\d;]*[A-Za-z]/g, "")
            .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");
}

// Replace Pterodactyl branding with NetherNodes
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
  if (t.startsWith("[nethernodes]")) return "system";
  if (t.startsWith("server@nethernodes")) return "system";
  if (t.includes("error") || t.includes("exception") || t.includes("fatal") || t.includes("crash")) return "error";
  if (t.includes("warn")) return "warn";
  if (
    t.includes("done") || t.includes("started") || t.includes("ready") ||
    t.includes("running") || t.includes("loaded") || t.includes("finished") ||
    t.includes("connected to console")
  ) return "success";
  return "info";
}

// Timestamp prefix for system messages
function now(): string {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const ServerConsole = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, token, logout } = useAuth();

  const [server, setServer]               = useState<ServerData | null>(null);
  const [loadingServer, setLoadingServer] = useState(true);
  const [serverError, setServerError]     = useState("");
  const [logs, setLogs]                   = useState<LogLine[]>([]);
  const [input, setInput]                 = useState("");
  const [history, setHistory]             = useState<string[]>([]);
  const [histIdx, setHistIdx]             = useState(-1);
  const [wsStatus, setWsStatus]           = useState<"disconnected" | "connecting" | "connected" | "error">("disconnected");
  const [powerLoading, setPowerLoading]   = useState<string | null>(null);
  const [copied, setCopied]               = useState(false);
  const [autoScroll, setAutoScroll]       = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput]     = useState("");
  const [deleting, setDeleting]           = useState(false);

  // Hostname state
  const [hostnameEdit, setHostnameEdit]     = useState("");
  const [hostnameChecking, setHostnameChecking] = useState(false);
  const [hostnameAvail, setHostnameAvail]   = useState<null|boolean>(null);
  const [hostnameSubmitting, setHostnameSubmitting] = useState(false);
  const [hostnameError, setHostnameError]   = useState("");
  const [showHostnameForm, setShowHostnameForm] = useState(false);

  const wsRef    = useRef<WebSocket | null>(null);
  const logsRef  = useRef<HTMLDivElement>(null);
  const logsEnd  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<string>("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { state: { from: `/server/${id}/console` } });
  }, [authLoading, user, navigate, id]);

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

  // Auto-scroll
  useEffect(() => {
    if (autoScroll) logsEnd.current?.scrollIntoView({ behavior: "auto" });
  }, [logs, autoScroll]);

  // Detect manual scroll up to pause auto-scroll
  const handleScroll = () => {
    const el = logsRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
  };

  const connect = useCallback(async () => {
    if (!id || wsRef.current?.readyState === WebSocket.OPEN) return;
    setWsStatus("connecting");
    addLog(`[${now()}] Connecting to NetherNodes console…`, "system");

    try {
      const res = await apiFetch(`/api/servers/${id}/console-token`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) {
        const err = await res.json();
        addLog(`[${now()}] Failed to connect: ${err.error}`, "error");
        setWsStatus("error"); return;
      }
      const { token: wsToken, socket: wsUrl } = await res.json();
      if (!wsToken || !wsUrl) {
        addLog(`[${now()}] Console unavailable — contact support.`, "error");
        setWsStatus("error"); return;
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
              addLog(`[${now()}] ✓ Connected to NetherNodes console`, "success");
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
                } catch { /* non-fatal */ }
              })();
              break;
            case "token expired":
              addLog(`[${now()}] Session expired — reconnecting…`, "warn");
              ws.close();
              setTimeout(connect, 1500);
              break;
            case "console output":
              if (Array.isArray(msg.args)) {
                msg.args.forEach((raw: string) => {
                  const line = processLine(raw);
                  if (line) addLog(line, classifyLine(line));
                });
              }
              break;
            case "status":
              if (msg.args?.[0]) setServer(p => p ? { ...p, status: msg.args[0] } : p);
              break;
          }
        } catch { /* parse error */ }
      };

      ws.onerror = () => {
        setWsStatus("error");
        addLog(`[${now()}] Connection error. Click Reconnect.`, "error");
      };

      ws.onclose = (evt) => {
        setWsStatus("disconnected");
        if (evt.code !== 1000)
          addLog(`[${now()}] Disconnected (${evt.code}). Click Reconnect.`, "warn");
      };
    } catch (err: any) {
      addLog(`[${now()}] Connection failed: ${err?.message}`, "error");
      setWsStatus("error");
    }
  }, [id, token, addLog]);

  useEffect(() => {
    if (server && !server.pendingSetup && server.status !== "pending_setup") connect();
    return () => { wsRef.current?.close(1000); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server?.id]);

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
      const next = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(next);
      setInput(history[next] ?? "");
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.max(histIdx - 1, -1);
      setHistIdx(next);
      setInput(next === -1 ? "" : history[next] ?? "");
    }
  };

  const deleteServer = async () => {
    if (deleteInput !== server?.name) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/servers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        wsRef.current?.close(1000);
        navigate("/dashboard");
      } else {
        const d = await res.json();
        addLog(`[${now()}] Delete failed: ${d.error}`, "error");
        setShowDeleteConfirm(false);
      }
    } catch {
      addLog(`[${now()}] Network error during delete.`, "error");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const sendPower = async (signal: "start" | "stop" | "restart" | "kill") => {    setPowerLoading(signal);
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

  const copyAddress = () => {
    if (!server?.host) return;
    navigator.clipboard.writeText(server.host).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  if (authLoading || loadingServer) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  if (serverError) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 max-w-lg pt-32 text-center">
        <AlertCircle className="w-10 h-10 text-primary mx-auto mb-4" />
        <p className="text-foreground font-semibold mb-2">Console unavailable</p>
        <p className="text-sm text-muted-foreground mb-6">{serverError}</p>
        <Link to="/dashboard" className="inline-flex items-center gap-2 px-5 py-2 rounded-sm text-sm font-semibold"
          style={{ background: "hsl(350 85% 45%)", color: "white" }}>Back to Dashboard</Link>
      </div>
    </div>
  );

  const statusColor = STATUS_COLOR[server?.status ?? "unknown"] ?? STATUS_COLOR.unknown;
  const isRunning   = server?.status === "running";
  const isStopped   = server?.status === "stopped";
  const isBusy      = server?.status === "starting" || server?.status === "stopping";

  return (
    <div className="min-h-screen bg-background pb-8">
      <Navbar />

      {/* Subtle glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(350 85% 30% / 0.06) 0%, transparent 70%)" }} />

      <div className="container mx-auto px-4 max-w-6xl pt-20">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }}>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <Link to="/dashboard" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={12} /> Dashboard
            </Link>
            <span className="text-muted-foreground/20">/</span>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                  style={{ background: statusColor }} />}
                <span className="relative inline-flex rounded-full h-2 w-2"
                  style={{ background: statusColor, boxShadow: isRunning ? `0 0 8px ${statusColor}` : undefined }} />
              </span>
              <h1 className="text-sm font-bold text-foreground">{server?.name}</h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] mono uppercase font-semibold tracking-wide"
                style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}40` }}>
                {STATUS_LABEL[server?.status ?? "unknown"] ?? server?.status}
              </span>
            </div>

            {/* Tabs */}
            <div className="ml-auto flex items-center gap-1 rounded-sm p-0.5"
              style={{ background: "hsl(0 0% 7%)", border: "1px solid hsl(0 0% 15%)" }}>
              {[
                { to: `/server/${id}/console`, icon: Terminal, label: "Console", active: true },
                { to: `/server/${id}/files`,   icon: FolderOpen, label: "Files",   active: false },
                { to: `/server/${id}/users`,   icon: Users,      label: "Users",   active: false },
              ].map(tab => (
                tab.active
                  ? <span key={tab.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold"
                      style={{ background: "hsl(350 85% 45%)", color: "white" }}>
                      <tab.icon size={11} /> {tab.label}
                    </span>
                  : <Link key={tab.label} to={tab.to}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                      <tab.icon size={11} /> {tab.label}
                    </Link>
              ))}
            </div>
          </div>

          {/* Stats bar */}
          <div className="rounded-sm px-5 py-3 mb-4 flex flex-wrap gap-x-8 gap-y-2 items-center"
            style={{ background: "hsl(0 0% 5%)", border: "1px solid hsl(0 0% 12%)" }}>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <MemoryStick size={12} className="text-primary" />
              <span className="text-muted-foreground/50 text-[10px] uppercase tracking-wider">RAM</span>
              <span className="font-semibold text-foreground">{server?.ram}</span>
            </span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Cpu size={12} className="text-primary" />
              <span className="text-muted-foreground/50 text-[10px] uppercase tracking-wider">CPU</span>
              <span className="font-semibold text-foreground">{server?.cpu}</span>
            </span>
            {server?.ssd && (
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <HardDrive size={12} className="text-primary" />
                <span className="text-muted-foreground/50 text-[10px] uppercase tracking-wider">Disk</span>
                <span className="font-semibold text-foreground">{server.ssd}</span>
              </span>
            )}
            {server?.serverType && (
              <span className="text-[10px] text-muted-foreground/40 mono px-2 py-0.5 rounded"
                style={{ background: "hsl(0 0% 9%)" }}>
                {server.serverType}{server.mcVersion ? ` ${server.mcVersion}` : ""}
              </span>
            )}
            {/* Only show raw host if no custom address is active */}
            {server?.host && !server?.customAddress && (
              <button onClick={copyAddress}
                className="ml-auto flex items-center gap-2 text-xs mono transition-colors group"
                style={{ color: "hsl(0 0% 50%)" }}>
                <span className="group-hover:text-foreground transition-colors">{server.host}</span>
                {copied
                  ? <Check size={11} className="text-green-400" />
                  : <Copy size={11} className="opacity-40 group-hover:opacity-100 transition-opacity" />}
              </button>
            )}
            {/* Show custom address in stats bar if available */}
            {server?.customAddress && (
              <button onClick={() => navigator.clipboard.writeText(server.customAddress!)}
                className="ml-auto flex items-center gap-2 text-xs mono transition-colors group">
                <span className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: server.hostnameStatus === "active" ? "hsl(142 70% 55%)" : "hsl(38 90% 60%)" }} />
                <span className="text-green-300/80 group-hover:text-green-300 transition-colors">{server.customAddress}</span>
                {copied
                  ? <Check size={11} className="text-green-400" />
                  : <Copy size={11} className="opacity-40 group-hover:opacity-100 transition-opacity" />}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

            {/* ── Console panel ── */}
            <div className="lg:col-span-3 flex flex-col gap-0 rounded-sm overflow-hidden"
              style={{ border: "1px solid hsl(0 0% 14%)" }}>

              {/* Console top bar */}
              <div className="flex items-center justify-between px-4 py-2.5"
                style={{ background: "hsl(0 0% 7%)", borderBottom: "1px solid hsl(0 0% 12%)" }}>
                <div className="flex items-center gap-3">
                  {/* Traffic light dots */}
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(0 70% 50%)" }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(38 90% 55%)" }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(142 60% 45%)" }} />
                  </div>
                  <span className="text-[11px] text-muted-foreground/40 mono">{server?.name} — console</span>
                </div>
                <div className="flex items-center gap-2">
                  {wsStatus === "connected"
                    ? <span className="flex items-center gap-1.5 text-[10px] text-green-400">
                        <Wifi size={10} /> Live
                      </span>
                    : wsStatus === "connecting"
                    ? <span className="flex items-center gap-1.5 text-[10px] text-yellow-400">
                        <Loader2 size={10} className="animate-spin" /> Connecting…
                      </span>
                    : <button onClick={connect}
                        className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 hover:text-primary transition-colors">
                        <WifiOff size={10} /> Reconnect
                      </button>
                  }
                  {!autoScroll && (
                    <button onClick={() => { setAutoScroll(true); logsEnd.current?.scrollIntoView({ behavior: "smooth" }); }}
                      className="text-[10px] text-primary/60 hover:text-primary transition-colors mono">
                      ↓ scroll to bottom
                    </button>
                  )}
                </div>
              </div>

              {/* Log output */}
              <div
                ref={logsRef}
                onScroll={handleScroll}
                onClick={() => inputRef.current?.focus()}
                className="font-mono text-[11.5px] leading-[1.7] overflow-y-auto cursor-text"
                style={{
                  background: "hsl(0 0% 3.5%)",
                  height: "460px",
                  padding: "14px 16px",
                }}
              >
                {/* Boot banner */}
                <div className="mb-3 pb-3 select-none" style={{ borderBottom: "1px solid hsl(0 0% 10%)" }}>
                  <span style={{ color: "hsl(350 85% 50%)" }} className="font-bold">NetherNodes</span>
                  <span className="text-muted-foreground/30"> — Minecraft Server Console</span>
                  <br />
                  <span className="text-muted-foreground/20 text-[10px]">nethernodes.online · {server?.plan} plan · {server?.ram}</span>
                </div>

                {logs.length === 0
                  ? <span className="text-muted-foreground/20 select-none">Waiting for output…</span>
                  : logs.map(line => {
                      const color =
                        line.type === "error"   ? "hsl(350 85% 60%)" :
                        line.type === "warn"    ? "hsl(38 90% 58%)" :
                        line.type === "success" ? "hsl(142 65% 50%)" :
                        line.type === "input"   ? "hsl(210 80% 65%)" :
                        line.type === "system"  ? "hsl(270 60% 65%)" :
                        "hsl(0 0% 75%)";
                      return (
                        <div key={line.id} className="whitespace-pre-wrap break-all leading-relaxed" style={{ color }}>
                          {line.text}
                        </div>
                      );
                    })
                }
                <div ref={logsEnd} />
              </div>

              {/* Command input */}
              <div className="flex items-center gap-0"
                style={{ borderTop: "1px solid hsl(0 0% 12%)", background: "hsl(0 0% 5%)" }}>
                <span className="px-4 text-primary font-bold text-sm mono select-none">›</span>
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
                <button
                  onClick={sendCommand}
                  disabled={!input.trim() || wsStatus !== "connected"}
                  className="px-5 py-3 text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-30"
                  style={{ background: "hsl(350 85% 42%)", color: "white", borderLeft: "1px solid hsl(350 85% 30%)" }}
                >
                  Send
                </button>
              </div>
            </div>

            {/* ── Side panel ── */}
            <div className="flex flex-col gap-3">

              {/* Power */}
              <div className="rounded-sm overflow-hidden" style={{ border: "1px solid hsl(0 0% 14%)" }}>
                <div className="px-4 py-2.5 text-[9px] mono uppercase tracking-widest text-muted-foreground/40 font-semibold"
                  style={{ background: "hsl(0 0% 7%)", borderBottom: "1px solid hsl(0 0% 12%)" }}>
                  Power
                </div>
                <div className="p-3 space-y-2" style={{ background: "hsl(0 0% 5%)" }}>
                  {[
                    { signal: "start",   label: "Start",   icon: Play,      bg: "hsl(142 60% 14%)", color: "hsl(142 65% 52%)", border: "hsl(142 60% 22%)", disabled: isRunning || isBusy },
                    { signal: "restart", label: "Restart", icon: RotateCcw, bg: "hsl(38 90% 9%)",   color: "hsl(38 90% 58%)",  border: "hsl(38 90% 22%)",  disabled: !isRunning },
                    { signal: "stop",    label: "Stop",    icon: Square,    bg: "hsl(350 85% 9%)",  color: "hsl(350 85% 58%)", border: "hsl(350 85% 22%)", disabled: isStopped || isBusy },
                    { signal: "kill",    label: "Kill",    icon: Zap,       bg: "hsl(0 0% 8%)",     color: "hsl(0 0% 48%)",    border: "hsl(0 0% 18%)",    disabled: isStopped },
                  ].map(({ signal, label, icon: Icon, bg, color, border, disabled }) => (
                    <button key={signal}
                      onClick={() => sendPower(signal as any)}
                      disabled={!!powerLoading || disabled}
                      className="w-full h-9 flex items-center justify-center gap-2 rounded-sm text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-30"
                      style={{ background: bg, color, border: `1px solid ${border}` }}>
                      {powerLoading === signal
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Icon size={12} />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Server info */}
              <div className="rounded-sm overflow-hidden" style={{ border: "1px solid hsl(0 0% 14%)" }}>
                <div className="px-4 py-2.5 text-[9px] mono uppercase tracking-widest text-muted-foreground/40 font-semibold"
                  style={{ background: "hsl(0 0% 7%)", borderBottom: "1px solid hsl(0 0% 12%)" }}>
                  Server Info
                </div>
                <div className="p-3 space-y-2.5" style={{ background: "hsl(0 0% 5%)" }}>
                  {[
                    { label: "Plan",    value: server?.plan },
                    { label: "Type",    value: server?.serverType },
                    { label: "Version", value: server?.mcVersion },
                  ].filter(r => r.value).map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground/40">{label}</span>
                      <span className="text-foreground/80 mono">{value}</span>
                    </div>
                  ))}
                  {server?.host && !server?.customAddress && (
                    <div>
                      <p className="text-[9px] text-muted-foreground/40 uppercase tracking-wider mb-1">Connect</p>
                      <button onClick={copyAddress}
                        className="w-full text-left flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-sm text-[10px] mono transition-all hover:brightness-110"
                        style={{ background: "hsl(0 0% 9%)", color: "hsl(0 0% 60%)", border: "1px solid hsl(0 0% 15%)" }}>
                        <span className="truncate">{server.host}</span>
                        {copied ? <Check size={10} className="text-green-400 shrink-0" /> : <Copy size={10} className="shrink-0 opacity-50" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Hint */}
              <p className="text-[9px] text-muted-foreground/25 text-center leading-relaxed px-1">
                ↑↓ arrow keys for command history
              </p>

              {/* Custom address */}
              <div className="rounded-sm overflow-hidden" style={{ border: "1px solid hsl(0 0% 14%)" }}>
                <div className="px-4 py-2.5 flex items-center justify-between"
                  style={{ background: "hsl(0 0% 7%)", borderBottom: "1px solid hsl(0 0% 12%)" }}>
                  <span className="text-[9px] mono uppercase tracking-widest text-muted-foreground/40 font-semibold flex items-center gap-1.5">
                    <Globe size={9} /> Custom Address
                  </span>
                  {server?.hostname && !showHostnameForm && (
                    <button onClick={() => { setShowHostnameForm(true); setHostnameEdit(server.hostname ?? ""); setHostnameAvail(null); setHostnameError(""); }}
                      className="text-[9px] text-muted-foreground/40 hover:text-primary transition-colors">
                      <Edit3 size={11} />
                    </button>
                  )}
                </div>
                <div className="p-3" style={{ background: "hsl(0 0% 5%)" }}>
                  {server?.hostname && !showHostnameForm ? (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${server.hostnameStatus === "active" ? "bg-green-400" : "bg-yellow-400"}`} />
                        <span className="text-[9px] text-muted-foreground/40 uppercase tracking-wide">
                          {server.hostnameStatus === "active" ? "Active" : "Activating…"}
                        </span>
                      </div>
                      <p className="text-[11px] mono text-foreground/80 break-all">{server.customAddress}</p>
                      <p className="text-[9px] text-muted-foreground/30 mt-1">Players connect with just this address — no port needed.</p>
                    </div>
                  ) : showHostnameForm ? (
                    <div className="space-y-2">
                      <div className="flex rounded-sm overflow-hidden" style={{ border: "1px solid hsl(0 0% 20%)" }}>
                        <input
                          type="text"
                          value={hostnameEdit}
                          onChange={e => {
                            const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 32);
                            setHostnameEdit(v);
                            setHostnameAvail(null);
                            if (v.length >= 3) {
                              clearTimeout((window as any)._hn2);
                              (window as any)._hn2 = setTimeout(async () => {
                                setHostnameChecking(true);
                                try {
                                  const r = await apiFetch(`/api/hostnames/check?name=${encodeURIComponent(v)}`);
                                  const d = await r.json();
                                  setHostnameAvail(d.available);
                                  setHostnameError(d.available ? "" : (d.reason || "Not available"));
                                } catch { setHostnameAvail(null); }
                                finally { setHostnameChecking(false); }
                              }, 500);
                            }
                          }}
                          placeholder="yourname"
                          className="flex-1 bg-transparent text-[11px] text-foreground outline-none px-2 py-1.5 mono min-w-0"
                        />
                        <span className="text-[9px] text-muted-foreground/30 px-1.5 self-center shrink-0">.nn</span>
                      </div>
                      {hostnameError && <p className="text-[9px]" style={{ color: "hsl(350 85% 60%)" }}>{hostnameError}</p>}
                      {hostnameAvail && !hostnameError && <p className="text-[9px] text-green-400">✓ Available</p>}
                      <div className="flex gap-2">
                        <button onClick={() => { setShowHostnameForm(false); setHostnameError(""); }}
                          className="flex-1 h-7 rounded-sm text-[10px] text-muted-foreground transition-colors"
                          style={{ border: "1px solid hsl(0 0% 18%)" }}>
                          Cancel
                        </button>
                        <button
                          disabled={hostnameSubmitting || !hostnameAvail || hostnameEdit.length < 3}
                          onClick={async () => {
                            setHostnameSubmitting(true);
                            setHostnameError("");
                            try {
                              const method = server?.hostname ? "PUT" : "POST";
                              const r = await apiFetch(`/api/servers/${id}/hostname`, {
                                method,
                                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
                                body: JSON.stringify({ name: hostnameEdit }),
                              });
                              const d = await r.json();
                              if (!r.ok) { setHostnameError(d.error || "Failed."); return; }
                              setServer(p => p ? { ...p, hostname: d.hostname, hostnameStatus: d.hostnameStatus, customAddress: d.customAddress } : p);
                              setShowHostnameForm(false);
                            } catch { setHostnameError("Network error."); }
                            finally { setHostnameSubmitting(false); }
                          }}
                          className="flex-1 h-7 rounded-sm text-[10px] font-semibold transition-all hover:brightness-110 disabled:opacity-30"
                          style={{ background: "hsl(350 85% 45%)", color: "white" }}>
                          {hostnameSubmitting ? <Loader2 size={10} className="animate-spin mx-auto" /> : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[10px] text-muted-foreground/40 mb-2">Set a custom address so players can connect without a port number.</p>
                      <button onClick={() => { setShowHostnameForm(true); setHostnameEdit(""); setHostnameAvail(null); setHostnameError(""); }}
                        className="w-full h-7 flex items-center justify-center gap-1.5 rounded-sm text-[11px] font-medium transition-all hover:brightness-110"
                        style={{ background: "hsl(350 85% 12%)", color: "hsl(350 85% 60%)", border: "1px solid hsl(350 85% 25%)" }}>
                        <Globe size={10} /> Set Custom Address
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Delete server */}
              <button
                onClick={() => { setShowDeleteConfirm(true); setDeleteInput(""); }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-sm text-xs font-medium transition-all hover:brightness-110 mt-1"
                style={{ background: "hsl(350 85% 8%)", color: "hsl(350 85% 50%)", border: "1px solid hsl(350 85% 20%)" }}
              >
                <Trash2 size={11} /> Delete Server
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-sm p-6 max-w-sm w-full"
            style={{ background: "hsl(0 0% 8%)", border: "1px solid hsl(350 85% 35%)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-sm flex items-center justify-center shrink-0"
                style={{ background: "hsl(350 85% 12%)", border: "1px solid hsl(350 85% 30%)" }}>
                <Trash2 size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Delete server?</p>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">This will permanently destroy <span className="text-foreground font-medium">{server?.name}</span> and all its data.</p>
              </div>
            </div>

            <div className="rounded-sm px-3 py-2.5 mb-4 text-xs"
              style={{ background: "hsl(350 85% 6%)", border: "1px solid hsl(350 85% 18%)", color: "hsl(350 85% 60%)" }}>
              ⚠ This cannot be undone. All files, databases, and backups will be lost.
            </div>

            <label className="text-[9px] mono uppercase tracking-wider text-muted-foreground/50 block mb-1.5">
              Type <span className="text-foreground font-bold">{server?.name}</span> to confirm
            </label>
            <input
              type="text"
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && deleteInput === server?.name && deleteServer()}
              placeholder={server?.name}
              autoFocus
              className="w-full rounded-sm px-3 py-2 text-sm text-foreground bg-transparent outline-none mb-4 mono"
              style={{ border: "1px solid hsl(0 0% 22%)" }}
              onFocus={e => (e.currentTarget.style.borderColor = "hsl(350 85% 45%)")}
              onBlur={e => (e.currentTarget.style.borderColor = "hsl(0 0% 22%)")}
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 h-9 rounded-sm text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                style={{ border: "1px solid hsl(0 0% 20%)" }}
              >
                Cancel
              </button>
              <button
                onClick={deleteServer}
                disabled={deleting || deleteInput !== server?.name}
                className="flex-1 h-9 flex items-center justify-center gap-2 rounded-sm text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-30"
                style={{ background: "hsl(350 85% 40%)", color: "white" }}
              >
                {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                {deleting ? "Deleting…" : "Delete Forever"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ServerConsole;
