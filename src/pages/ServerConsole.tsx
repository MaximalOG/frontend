import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal, Play, Square, RotateCcw, Zap, ArrowLeft,
  Loader2, AlertCircle, Wifi, WifiOff, Server,
  MemoryStick, Cpu, HardDrive, Copy, Check,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

const ease = [0.16, 1, 0.3, 1] as const;

interface ServerData {
  id: string;
  name: string;
  status: string;
  ram: string;
  cpu: string;
  ssd?: string;
  plan: string;
  host?: string;
  serverType?: string;
  mcVersion?: string;
  pendingSetup?: boolean;
}

interface LogLine {
  id: number;
  text: string;
  type: "info" | "warn" | "error" | "success" | "input";
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
  running:    "Running",
  stopped:    "Stopped",
  starting:   "Starting",
  stopping:   "Stopping",
  installing: "Installing",
  suspended:  "Suspended",
  unknown:    "Unknown",
};

let _lineId = 0;
function mkLine(text: string, type: LogLine["type"] = "info"): LogLine {
  return { id: ++_lineId, text, type };
}

function classifyLine(text: string): LogLine["type"] {
  const t = text.toLowerCase();
  if (t.includes("error") || t.includes("exception") || t.includes("fatal")) return "error";
  if (t.includes("warn")) return "warn";
  if (t.includes("done") || t.includes("started") || t.includes("ready") || t.includes("success")) return "success";
  return "info";
}

const ServerConsole = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, token, logout } = useAuth();

  const [server, setServer]         = useState<ServerData | null>(null);
  const [loadingServer, setLoadingServer] = useState(true);
  const [serverError, setServerError]   = useState("");

  const [logs, setLogs]             = useState<LogLine[]>([]);
  const [input, setInput]           = useState("");
  const [wsStatus, setWsStatus]     = useState<"disconnected" | "connecting" | "connected" | "error">("disconnected");
  const [powerLoading, setPowerLoading] = useState<string | null>(null);
  const [copied, setCopied]         = useState(false);

  const wsRef    = useRef<WebSocket | null>(null);
  const logsEnd  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<string>("");   // stores current ws jwt for re-auth

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { state: { from: `/server/${id}/console` } });
  }, [authLoading, user, navigate, id]);

  // Load server info
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
      } catch {
        setServerError("Could not load server info.");
      } finally {
        setLoadingServer(false);
      }
    })();
  }, [user, id, token, logout, navigate]);

  const addLog = useCallback((text: string, type: LogLine["type"] = "info") => {
    setLogs(prev => [...prev.slice(-800), mkLine(text, type)]);
  }, []);

  // Scroll to bottom when logs update
  useEffect(() => {
    logsEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Connect WebSocket
  const connect = useCallback(async () => {
    if (!id || wsRef.current?.readyState === WebSocket.OPEN) return;
    setWsStatus("connecting");
    addLog("Connecting to console…", "info");

    try {
      const res = await apiFetch(`/api/servers/${id}/console-token`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) {
        const err = await res.json();
        addLog(`Failed to get console token: ${err.error}`, "error");
        setWsStatus("error");
        return;
      }
      const { token: wsToken, socket: wsUrl } = await res.json();
      if (!wsToken || !wsUrl) {
        addLog("Console not available — make sure PTERODACTYL_CLIENT_KEY is set.", "error");
        setWsStatus("error");
        return;
      }

      tokenRef.current = wsToken;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Pterodactyl requires auth immediately on connect
        ws.send(JSON.stringify({ event: "auth", args: [wsToken] }));
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          switch (msg.event) {
            case "auth success":
              setWsStatus("connected");
              addLog("Connected to console.", "success");
              break;
            case "token expiring":
              // Refresh token before it expires
              (async () => {
                try {
                  const r = await apiFetch(`/api/servers/${id}/console-token`, {
                    headers: { Authorization: `Bearer ${token()}` },
                  });
                  if (r.ok) {
                    const { token: newToken } = await r.json();
                    tokenRef.current = newToken;
                    ws.send(JSON.stringify({ event: "auth", args: [newToken] }));
                  }
                } catch { /* non-fatal */ }
              })();
              break;
            case "token expired":
              addLog("Console session expired. Reconnecting…", "warn");
              ws.close();
              setTimeout(connect, 1500);
              break;
            case "console output":
              if (Array.isArray(msg.args)) {
                msg.args.forEach((line: string) => {
                  if (line?.trim()) addLog(line.trim(), classifyLine(line));
                });
              }
              break;
            case "status":
              if (msg.args?.[0]) {
                setServer(prev => prev ? { ...prev, status: msg.args[0] } : prev);
              }
              break;
            default:
              break;
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onerror = () => {
        setWsStatus("error");
        addLog("WebSocket error. Check panel connectivity.", "error");
      };

      ws.onclose = (evt) => {
        setWsStatus("disconnected");
        if (evt.code !== 1000) {
          addLog(`Disconnected (code ${evt.code}). Click Reconnect to try again.`, "warn");
        }
      };

    } catch (err: any) {
      addLog(`Connection failed: ${err?.message}`, "error");
      setWsStatus("error");
    }
  }, [id, token, addLog]);

  // Auto-connect once server is loaded and provisioned
  useEffect(() => {
    if (server && !server.pendingSetup && server.status !== "pending_setup") {
      connect();
    }
    return () => {
      wsRef.current?.close(1000);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server?.id]);

  const sendCommand = () => {
    const cmd = input.trim();
    if (!cmd || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ event: "send command", args: [cmd] }));
    addLog(`> ${cmd}`, "input");
    setInput("");
  };

  const sendPower = async (signal: "start" | "stop" | "restart" | "kill") => {
    setPowerLoading(signal);
    try {
      const res = await apiFetch(`/api/servers/${id}/power`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ signal }),
      });
      const data = await res.json();
      if (res.ok) {
        addLog(`Power signal "${signal}" sent.`, "success");
      } else {
        addLog(`Power error: ${data.error}`, "error");
      }
    } catch {
      addLog("Network error sending power signal.", "error");
    } finally {
      setPowerLoading(null);
    }
  };

  const copyAddress = () => {
    if (!server?.host) return;
    navigator.clipboard.writeText(server.host).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (authLoading || loadingServer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (serverError) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 max-w-lg pt-32 text-center">
          <AlertCircle className="w-10 h-10 text-primary mx-auto mb-4" />
          <p className="text-foreground font-semibold mb-2">Console unavailable</p>
          <p className="text-sm text-muted-foreground mb-6">{serverError}</p>
          <Link to="/dashboard" className="inline-flex items-center gap-2 px-5 py-2 rounded-sm text-sm font-semibold"
            style={{ background: "hsl(350 85% 45%)", color: "white" }}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const statusColor = STATUS_COLOR[server?.status ?? "unknown"] ?? STATUS_COLOR.unknown;
  const isRunning   = server?.status === "running";
  const isStopped   = server?.status === "stopped";
  const isBusy      = server?.status === "starting" || server?.status === "stopping";

  return (
    <div className="min-h-screen bg-background pb-8">
      <Navbar />

      <div className="container mx-auto px-4 max-w-5xl pt-20">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }}>

          {/* Back + header */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <Link to="/dashboard" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={13} /> Dashboard
            </Link>
            <span className="text-muted-foreground/30">/</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0 transition-colors duration-500"
                style={{ background: statusColor, boxShadow: isRunning ? `0 0 6px ${statusColor}` : undefined }} />
              <h1 className="text-sm font-bold text-foreground">{server?.name}</h1>
              <span className="px-1.5 py-0.5 rounded-sm text-[9px] mono uppercase font-semibold"
                style={{ background: "hsl(0 0% 10%)", color: statusColor, border: `1px solid ${statusColor}40` }}>
                {STATUS_LABEL[server?.status ?? "unknown"] ?? server?.status}
              </span>
            </div>
          </div>

          {/* Info bar */}
          <div className="rounded-sm px-4 py-3 mb-4 flex flex-wrap gap-x-6 gap-y-2 items-center"
            style={{ background: "hsl(0 0% 6%)", border: "1px solid hsl(0 0% 14%)" }}>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MemoryStick size={11} className="text-primary" /> {server?.ram}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Cpu size={11} className="text-primary" /> {server?.cpu}
            </span>
            {server?.ssd && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <HardDrive size={11} className="text-primary" /> {server.ssd}
              </span>
            )}
            {server?.serverType && (
              <span className="text-xs text-muted-foreground/50 mono">
                {server.serverType}{server.mcVersion ? ` · ${server.mcVersion}` : ""}
              </span>
            )}
            {server?.host && (
              <button onClick={copyAddress}
                className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground transition-colors mono">
                {server.host}
                {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

            {/* ── Console ── */}
            <div className="lg:col-span-3 flex flex-col gap-2">
              {/* Connection status bar */}
              <div className="flex items-center justify-between px-3 py-1.5 rounded-sm"
                style={{ background: "hsl(0 0% 5%)", border: "1px solid hsl(0 0% 12%)" }}>
                <div className="flex items-center gap-2">
                  {wsStatus === "connected"
                    ? <Wifi size={11} className="text-green-400" />
                    : wsStatus === "connecting"
                    ? <Loader2 size={11} className="animate-spin text-yellow-400" />
                    : <WifiOff size={11} className="text-muted-foreground/40" />
                  }
                  <span className="text-[10px] mono text-muted-foreground/50">
                    {wsStatus === "connected" ? "Live console" : wsStatus === "connecting" ? "Connecting…" : "Disconnected"}
                  </span>
                </div>
                {wsStatus !== "connected" && wsStatus !== "connecting" && (
                  <button onClick={connect}
                    className="text-[10px] text-primary hover:brightness-110 transition-all">
                    Reconnect
                  </button>
                )}
              </div>

              {/* Log output */}
              <div
                className="rounded-sm font-mono text-[11px] leading-relaxed overflow-y-auto"
                style={{
                  background: "hsl(0 0% 4%)",
                  border: "1px solid hsl(0 0% 12%)",
                  height: "420px",
                  padding: "12px 14px",
                }}
                onClick={() => inputRef.current?.focus()}
              >
                {logs.length === 0 ? (
                  <span className="text-muted-foreground/30">Console output will appear here…</span>
                ) : (
                  logs.map(line => (
                    <div key={line.id} className="whitespace-pre-wrap break-all" style={{
                      color: line.type === "error"   ? "hsl(350 85% 65%)"
                           : line.type === "warn"    ? "hsl(38 90% 60%)"
                           : line.type === "success" ? "hsl(142 70% 55%)"
                           : line.type === "input"   ? "hsl(200 80% 65%)"
                           : "hsl(0 0% 72%)",
                    }}>
                      {line.text}
                    </div>
                  ))
                )}
                <div ref={logsEnd} />
              </div>

              {/* Command input */}
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 rounded-sm px-3"
                  style={{ background: "hsl(0 0% 6%)", border: "1px solid hsl(0 0% 18%)" }}>
                  <span className="text-primary text-sm font-bold shrink-0">&gt;</span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendCommand()}
                    placeholder={wsStatus === "connected" ? "Type a command…" : "Connect to send commands"}
                    disabled={wsStatus !== "connected"}
                    className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/30 outline-none py-2.5 mono"
                  />
                </div>
                <button
                  onClick={sendCommand}
                  disabled={!input.trim() || wsStatus !== "connected"}
                  className="px-4 rounded-sm text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-40"
                  style={{ background: "hsl(350 85% 45%)", color: "white" }}
                >
                  Send
                </button>
              </div>
            </div>

            {/* ── Power controls ── */}
            <div className="flex flex-col gap-3">
              <p className="text-[9px] text-muted-foreground/40 mono uppercase tracking-wider">Power Controls</p>

              {/* Start */}
              <button
                onClick={() => sendPower("start")}
                disabled={!!powerLoading || isRunning || isBusy}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-sm text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-40"
                style={{ background: "hsl(142 60% 15%)", color: "hsl(142 70% 55%)", border: "1px solid hsl(142 60% 25%)" }}
              >
                {powerLoading === "start"
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Play size={12} />
                }
                Start
              </button>

              {/* Restart */}
              <button
                onClick={() => sendPower("restart")}
                disabled={!!powerLoading || !isRunning}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-sm text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-40"
                style={{ background: "hsl(38 90% 10%)", color: "hsl(38 90% 60%)", border: "1px solid hsl(38 90% 25%)" }}
              >
                {powerLoading === "restart"
                  ? <Loader2 size={12} className="animate-spin" />
                  : <RotateCcw size={12} />
                }
                Restart
              </button>

              {/* Stop */}
              <button
                onClick={() => sendPower("stop")}
                disabled={!!powerLoading || isStopped || isBusy}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-sm text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-40"
                style={{ background: "hsl(350 85% 10%)", color: "hsl(350 85% 60%)", border: "1px solid hsl(350 85% 25%)" }}
              >
                {powerLoading === "stop"
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Square size={12} />
                }
                Stop
              </button>

              {/* Kill */}
              <button
                onClick={() => sendPower("kill")}
                disabled={!!powerLoading || isStopped}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-sm text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-40"
                style={{ background: "hsl(0 0% 8%)", color: "hsl(0 0% 50%)", border: "1px solid hsl(0 0% 18%)" }}
              >
                {powerLoading === "kill"
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Zap size={12} />
                }
                Kill
              </button>

              <div className="mt-2 rounded-sm px-3 py-2.5 text-[10px] text-muted-foreground/40 leading-relaxed"
                style={{ background: "hsl(0 0% 6%)", border: "1px solid hsl(0 0% 12%)" }}>
                <p className="font-semibold text-muted-foreground/60 mb-1">Connection Info</p>
                {server?.host
                  ? <span className="mono text-muted-foreground/70 break-all">{server.host}</span>
                  : <span>Not yet assigned</span>
                }
              </div>

              <div className="rounded-sm px-3 py-2.5 text-[10px] text-muted-foreground/40 leading-relaxed"
                style={{ background: "hsl(0 0% 6%)", border: "1px solid hsl(0 0% 12%)" }}>
                <p className="font-semibold text-muted-foreground/60 mb-1">Plan</p>
                <span className="text-muted-foreground/70">{server?.plan}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ServerConsole;
