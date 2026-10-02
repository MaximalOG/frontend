import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import {
  Loader2, AlertCircle, Wifi, WifiOff, Check, Copy,
  Globe, Edit3, Trash2, Shield, Clock, Users as UsersIcon,
  HardDrive, Cpu, MemoryStick, Download, Search, X,
  ChevronDown, ChevronUp, Package, Calendar, List, Zap,
  Server, Activity, UploadCloud, Menu, ArrowLeft,
  Sparkles, Send,
} from "lucide-react";
import ServerSidebar from "@/components/ServerSidebar";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

/* ─── Types ──────────────────────────────────────────────────────────── */
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

/* ─── Helpers ────────────────────────────────────────────────────────── */
let _lid = 0;
const mkLine = (text: string, type: LogLine["type"] = "info"): LogLine => ({ id: ++_lid, text, type });

function stripAnsi(s: string) {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1B\[[0-9;]*[a-zA-Z]/g,"").replace(/\x1B\[[0-9;]*m/g,"").replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g,"");
}
function rebrand(s: string) {
  return s.replace(/\[Pterodactyl Daemon\]/gi,"[NetherNodes]").replace(/Pterodactyl Daemon/gi,"NetherNodes")
    .replace(/container@pterodactyl~/gi,"server@nethernodes ~").replace(/Pterodactyl/gi,"NetherNodes");
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
function nowStr() { return new Date().toLocaleTimeString("en-IN",{ hour:"2-digit", minute:"2-digit", second:"2-digit" }); }
function fmtBytes(b: number) { return b >= 1073741824 ? `${(b/1073741824).toFixed(1)}GB` : `${(b/1048576).toFixed(0)}MB`; }
function fmtUptime(ms: number) {
  if (ms <= 0) return "—";
  const s = Math.floor(ms/1000), m = Math.floor(s/60), h = Math.floor(m/60), d = Math.floor(h/24);
  if (d > 0) return `${d}d ${h%24}h`;
  if (h > 0) return `${h}h ${m%60}m`;
  return `${m}m ${s%60}s`;
}
function parseRamMB(ram?: string) {
  if (!ram) return 0;
  const n = parseFloat(ram);
  return ram.toLowerCase().includes("gb") ? n * 1024 : n;
}

/* ─── Constants ──────────────────────────────────────────────────────── */
const LINE_STYLE: Record<LogLine["type"], { color: string; badge?: string; badgeBg?: string }> = {
  error:   { color: "#f87171", badge: "ERR",  badgeBg: "rgba(239,68,68,0.12)" },
  warn:    { color: "#fbbf24", badge: "WARN", badgeBg: "rgba(251,191,36,0.10)" },
  success: { color: "#4ade80", badge: "OK",   badgeBg: "rgba(74,222,128,0.08)" },
  info:    { color: "#64748b" },
  input:   { color: "#7dd3fc", badge: "CMD",  badgeBg: "rgba(125,211,252,0.08)" },
  system:  { color: "#a78bfa", badge: "SYS",  badgeBg: "rgba(167,139,250,0.08)" },
};
const STATUS_CFG: Record<string, { color: string; dot: string; label: string }> = {
  running:    { color: "#4ade80", dot: "#22c55e", label: "Online" },
  stopped:    { color: "#475569", dot: "#334155", label: "Offline" },
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

  const LOG_KEY    = `nn_console_logs_${id}`;
  const MAX_STORED = 600;
  const loadStoredLogs = (): LogLine[] => {
    try { const r = sessionStorage.getItem(LOG_KEY); return r ? JSON.parse(r) as LogLine[] : []; } catch { return []; }
  };

  /* ── state ── */
  const [server, setServer]               = useState<ServerData | null>(null);
  const [loadingServer, setLoadingServer] = useState(true);
  const [serverError, setServerError]     = useState("");
  const [logs, setLogs]                   = useState<LogLine[]>(() => loadStoredLogs());
  const [input, setInput]                 = useState("");
  const [history, setHistory]             = useState<string[]>([]);
  const [histIdx, setHistIdx]             = useState(-1);
  const [wsStatus, setWsStatus]           = useState<"disconnected"|"connecting"|"connected"|"error">("disconnected");
  const [autoScroll, setAutoScroll]       = useState(true);
  const [searchOpen, setSearchOpen]       = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const [blink, setBlink]                 = useState(true);
  const [powerLoading, setPowerLoading]   = useState<string | null>(null);
  const [copied, setCopied]               = useState(false);
  const [showDelete, setShowDelete]       = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [deleteInput, setDeleteInput]     = useState("");
  const [deleting, setDeleting]           = useState(false);
  const [showHnForm, setShowHnForm]       = useState(false);
  const [showUploadWorld, setShowUploadWorld] = useState(false);
  const [worldFile, setWorldFile]             = useState<File | null>(null);
  const [worldDragOver, setWorldDragOver]     = useState(false);
  const [uploadingWorld, setUploadingWorld]   = useState(false);
  const [uploadWorldMsg, setUploadWorldMsg]   = useState("");
  const [uploadWorldErr, setUploadWorldErr]   = useState("");
  const worldInputRef = useRef<HTMLInputElement>(null);
  const [showBackup, setShowBackup]       = useState(false);
  const [backupName, setBackupName]       = useState("");
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [backupMsg, setBackupMsg]         = useState("");
  const [backupErr, setBackupErr]         = useState("");
  const [showWhitelist, setShowWhitelist] = useState(false);
  const [wlPlayer, setWlPlayer]           = useState("");
  const [wlAdding, setWlAdding]           = useState(false);
  const [wlMsg, setWlMsg]                 = useState("");
  const [wlErr, setWlErr]                 = useState("");
  const [hnEdit, setHnEdit]               = useState("");
  const [hnChecking, setHnChecking]       = useState(false);
  const [hnAvail, setHnAvail]             = useState<boolean | null>(null);
  const [hnSubmitting, setHnSubmitting]   = useState(false);
  const [hnError, setHnError]             = useState("");
  const [resources, setResources] = useState<{
    available: boolean; cpu: number; memoryBytes: number;
    diskBytes: number; netRxBytes: number; netTxBytes: number; uptimeMs: number;
    limitMemoryMB: number | null; limitDiskMB: number | null; limitCpu: number | null;
  } | null>(null);
  const [cpuHistory, setCpuHistory] = useState<{ t: number; v: number }[]>(
    Array.from({ length: 30 }, (_, i) => ({ t: i, v: 0 }))
  );

  /* ── AI chat state ── */
  const [aiMessages, setAiMessages]     = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [aiInput, setAiInput]           = useState("");
  const [aiLoading, setAiLoading]       = useState(false);
  const aiChatEndRef                    = useRef<HTMLDivElement>(null);

  /* ── refs ── */
  const wsRef    = useRef<WebSocket | null>(null);
  const logsRef  = useRef<HTMLDivElement>(null);
  const logsEnd  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef("");
  const tickRef  = useRef(30);

  /* ── effects ── */
  useEffect(() => { const t = setInterval(() => setBlink(b => !b), 500); return () => clearInterval(t); }, []);
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
    setLogs(prev => {
      const next = [...prev.slice(-1200), mkLine(text, type)];
      try { sessionStorage.setItem(LOG_KEY, JSON.stringify(next.slice(-MAX_STORED))); } catch {}
      return next;
    });
  }, [LOG_KEY, MAX_STORED]);

  useEffect(() => {
    if (autoScroll) logsEnd.current?.scrollIntoView({ behavior: "auto" });
  }, [logs, autoScroll]);

  const handleConsoleScroll = () => {
    const el = logsRef.current;
    if (!el) return;
    setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
  };

  /* ── WebSocket ── */
  const connStatusIdRef = useRef<number | null>(null); // tracks the single "Connecting…/Connected" log line

  const updateConnLog = useCallback((text: string, type: LogLine["type"]) => {
    // If we already have a connection status line, overwrite it in-place.
    // This prevents spamming "Connecting… / Connected" on every reconnect.
    if (connStatusIdRef.current !== null) {
      const lid = connStatusIdRef.current;
      setLogs(prev => {
        const idx = prev.findIndex(l => l.id === lid);
        if (idx === -1) {
          // Line was cleared — append fresh
          const fresh = mkLine(text, type);
          connStatusIdRef.current = fresh.id;
          const next = [...prev.slice(-1200), fresh];
          try { sessionStorage.setItem(LOG_KEY, JSON.stringify(next.slice(-MAX_STORED))); } catch {}
          return next;
        }
        const next = prev.map(l => l.id === lid ? { ...l, text, type } : l);
        try { sessionStorage.setItem(LOG_KEY, JSON.stringify(next.slice(-MAX_STORED))); } catch {}
        return next;
      });
    } else {
      const fresh = mkLine(text, type);
      connStatusIdRef.current = fresh.id;
      setLogs(prev => {
        const next = [...prev.slice(-1200), fresh];
        try { sessionStorage.setItem(LOG_KEY, JSON.stringify(next.slice(-MAX_STORED))); } catch {}
        return next;
      });
    }
  }, [LOG_KEY, MAX_STORED]);

  const connect = useCallback(async () => {
    if (!id || wsRef.current?.readyState === WebSocket.OPEN) return;
    if (document.visibilityState === "hidden") return;
    setWsStatus("connecting");
    updateConnLog(`[${nowStr()}] Connecting…`, "system");
    try {
      const res = await apiFetch(`/api/servers/${id}/console-token`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) { updateConnLog(`[${nowStr()}] Failed: ${(await res.json()).error}`, "error"); setWsStatus("error"); return; }
      const { token: wsTok, socket: wsUrl } = await res.json();
      if (!wsTok || !wsUrl) { updateConnLog(`[${nowStr()}] Console unavailable.`, "error"); setWsStatus("error"); return; }
      tokenRef.current = wsTok;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => ws.send(JSON.stringify({ event: "auth", args: [wsTok] }));
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          switch (msg.event) {
            case "auth success":
              setWsStatus("connected");
              updateConnLog(`[${nowStr()}] ✓ Connected to console`, "success");
              break;
            case "token expiring":
              (async () => {
                try {
                  const r = await apiFetch(`/api/servers/${id}/console-token`, { headers: { Authorization: `Bearer ${token()}` } });
                  if (r.ok) { const { token: t } = await r.json(); tokenRef.current = t; ws.send(JSON.stringify({ event: "auth", args: [t] })); }
                } catch {}
              })();
              break;
            case "token expired":
              updateConnLog(`[${nowStr()}] Session expired — reconnecting…`, "warn");
              ws.close();
              if (document.visibilityState === "visible") setTimeout(connect, 1500);
              break;
            case "console output":
              if (Array.isArray(msg.args)) msg.args.forEach((raw: string) => { const l = processLine(raw); if (l) addLog(l, classifyLine(l)); });
              break;
            case "status": if (msg.args?.[0]) setServer(p => p ? { ...p, status: msg.args[0] } : p); break;
          }
        } catch {}
      };
      ws.onerror = () => {
        if (document.visibilityState === "visible") { setWsStatus("error"); updateConnLog(`[${nowStr()}] Connection error.`, "error"); }
        else setWsStatus("disconnected");
      };
      ws.onclose = (e) => {
        setWsStatus("disconnected");
        if (e.code === 1000 || document.visibilityState === "hidden") return;
        updateConnLog(`[${nowStr()}] Disconnected (${e.code}).`, "warn");
      };
    } catch (err: any) { updateConnLog(`[${nowStr()}] Failed: ${err?.message}`, "error"); setWsStatus("error"); }
  }, [id, token, addLog, updateConnLog]);

  useEffect(() => {
    if (server && !server.pendingSetup) connect();
    return () => { wsRef.current?.close(1000); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server?.id]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" &&
          wsRef.current?.readyState !== WebSocket.OPEN &&
          wsRef.current?.readyState !== WebSocket.CONNECTING) connect();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [connect]);

  /* ── Resource poll ── */
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
            if (d.limitMemoryMB != null || d.limitDiskMB != null || d.limitCpu != null) {
              setServer(prev => {
                if (!prev) return prev;
                const updates: Partial<typeof prev> = {};
                if (d.limitMemoryMB != null) { const gb = d.limitMemoryMB/1024; updates.ram = gb%1===0?`${gb}GB`:`${gb.toFixed(1)}GB`; }
                if (d.limitDiskMB != null)   { const gb = d.limitDiskMB/1024;   updates.ssd = gb%1===0?`${gb}GB`:`${gb.toFixed(1)}GB`; }
                if (d.limitCpu != null)       { updates.cpu = `${d.limitCpu}%`; }
                const changed = (Object.keys(updates) as (keyof typeof updates)[]).some(k => updates[k] !== prev[k as keyof typeof prev]);
                return changed ? { ...prev, ...updates } : prev;
              });
            }
          }
        }
      } catch {}
    };
    poll();
    const iv = setInterval(poll, 3000);
    return () => clearInterval(iv);
  }, [user, id, token]);

  /* ── Handlers ── */
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
    if (e.key === "ArrowUp")   { e.preventDefault(); const n = Math.min(histIdx+1, history.length-1); setHistIdx(n); setInput(history[n]??""); }
    if (e.key === "ArrowDown") { e.preventDefault(); const n = Math.max(histIdx-1, -1); setHistIdx(n); setInput(n===-1?"":history[n]??""); }
  };
  const sendPower = async (signal: "start"|"stop"|"restart"|"kill") => {
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
    a.href = url; a.download = `${server?.name??"server"}-console.log`; a.click(); URL.revokeObjectURL(url);
  };
  const uploadWorld = async () => {
    if (!worldFile) return;
    setUploadingWorld(true); setUploadWorldErr(""); setUploadWorldMsg("");
    try {
      const ext = worldFile.name.split(".").pop()?.toLowerCase() ?? "";
      const BINARY_EXTS = new Set(["zip","tar","gz","rar","7z","mca","dat","mcworld","nbt","ldb","db"]);
      const isBinary = BINARY_EXTS.has(ext);
      const targetPath = ["zip","tar","gz","rar","7z"].includes(ext) ? `/${worldFile.name}` : `/worlds/${worldFile.name}`;
      let body: string;
      if (isBinary) {
        const buf = await worldFile.arrayBuffer(); const bytes = new Uint8Array(buf); let bin = "";
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        body = JSON.stringify({ content: btoa(bin), encoding: "base64" });
      } else { body = JSON.stringify({ content: await worldFile.text() }); }
      const res = await apiFetch(`/api/servers/${id}/files/write?file=${encodeURIComponent(targetPath)}`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }, body,
      });
      if (!res.ok) { let m = "Upload failed."; try { const e = await res.json(); m = e.error||m; } catch {} setUploadWorldErr(m); return; }
      setUploadWorldMsg(`✓ ${worldFile.name} uploaded.`); setWorldFile(null);
      setTimeout(() => { setShowUploadWorld(false); setUploadWorldMsg(""); }, 2500);
    } catch (err: any) { setUploadWorldErr(err?.message||"Upload failed."); }
    finally { setUploadingWorld(false); }
  };
  const createBackupNow = async () => {
    setCreatingBackup(true); setBackupErr(""); setBackupMsg("");
    try {
      const name = backupName.trim() || `Backup ${new Date().toLocaleString("en-IN")}`;
      const res = await apiFetch(`/api/servers/${id}/backups`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ name }),
      });
      let data: any = {}; try { data = await res.json(); } catch {}
      if (!res.ok) { setBackupErr(data.error||`Backup failed (${res.status}).`); return; }
      setBackupMsg("✓ Backup started."); setBackupName("");
      setTimeout(() => { setShowBackup(false); setBackupMsg(""); }, 3000);
    } catch (err: any) { setBackupErr(err?.message||"Network error."); }
    finally { setCreatingBackup(false); }
  };
  const addToWhitelist = async () => {
    if (!wlPlayer.trim()) { setWlErr("Enter a player name."); return; }
    setWlAdding(true); setWlErr(""); setWlMsg("");
    try {
      const res = await apiFetch(`/api/servers/${id}/whitelist`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ username: wlPlayer.trim() }),
      });
      let data: any = {}; try { data = await res.json(); } catch {}
      if (!res.ok) { setWlErr(data.error||`Failed (${res.status}).`); return; }
      setWlMsg(`✓ ${wlPlayer.trim()} added.`); setWlPlayer("");
      setTimeout(() => { setShowWhitelist(false); setWlMsg(""); }, 2500);
    } catch (err: any) { setWlErr(err?.message||"Network error."); }
    finally { setWlAdding(false); }
  };

  /* ── AI chat send ── */
  const sendAiMessage = async () => {
    const msg = aiInput.trim();
    if (!msg || aiLoading) return;
    const userMsg = { role: "user" as const, content: msg };
    setAiMessages(prev => [...prev, userMsg]);
    setAiInput("");
    setAiLoading(true);
    // scroll to bottom
    setTimeout(() => aiChatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    try {
      const res = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history: aiMessages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        }),
      });
      let data: any = {};
      try { data = await res.json(); } catch {}
      const reply = data.message || (res.ok ? "No response." : (data.error || "Error."));
      setAiMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setAiMessages(prev => [...prev, { role: "assistant", content: "Could not reach AI. Check your connection." }]);
    } finally {
      setAiLoading(false);
      setTimeout(() => aiChatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  /* ── Derived values ── */
  const filteredLogs = searchQuery ? logs.filter(l => l.text.toLowerCase().includes(searchQuery.toLowerCase())) : logs;
  const cfg          = STATUS_CFG[server?.status ?? ""] ?? STATUS_CFG.stopped;
  const isRunning    = server?.status === "running";
  const displayAddr  = server?.customAddress ?? server?.host ?? null;
  const ramLimitMB   = parseRamMB(server?.ram);
  const ramUsedMB    = resources ? resources.memoryBytes / 1048576 : 0;
  const ramPct       = ramLimitMB > 0 ? Math.min((ramUsedMB / ramLimitMB) * 100, 100) : 0;
  const cpuPct       = resources?.cpu ?? 0;
  const diskLimitMB  = resources?.limitDiskMB ?? (() => {
    const s = server?.ssd ?? ""; const n = parseFloat(s);
    if (!n) return 0;
    return s.toUpperCase().includes("GB") ? n * 1024 : n;
  })();
  const diskUsedMB   = resources ? resources.diskBytes / 1048576 : 0;
  const diskPct      = diskLimitMB > 0 ? Math.min((diskUsedMB / diskLimitMB) * 100, 100) : 0;

  /* ── Loading / error states ── */
  if (authLoading || loadingServer) return (
    <div className="min-h-screen bg-background flex items-center justify-center" style={{ background: "#080810" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#a78bfa" }} />
        </div>
        <p className="text-xs mono" style={{ color: "#475569" }}>Connecting to console…</p>
      </div>
    </div>
  );
  if (serverError) return (
    <div className="h-screen flex items-center justify-center" style={{ background: "#080810" }}>
      <div className="text-center px-4">
        <AlertCircle className="w-8 h-8 mx-auto mb-3" style={{ color: "#f87171" }} />
        <p className="text-sm font-semibold mb-1" style={{ color: "#f1f5f9" }}>Console unavailable</p>
        <p className="text-xs mb-5" style={{ color: "#475569" }}>{serverError}</p>
        <Link to="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
          style={{ background: "#7c3aed", color: "white" }}>← Dashboard</Link>
      </div>
    </div>
  );

  /* ══════════════════════════ RENDER ═══════════════════════════════════ */
  return (
    <div className="flex overflow-hidden" style={{ height: "100vh", background: "#080810" }}>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 md:hidden" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
              onClick={() => setMobileNavOpen(false)} />
            <motion.div initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed top-0 left-0 h-full z-50 flex flex-col md:hidden px-3 py-4 overflow-y-auto"
              style={{ width: 248, background: "#0a0a12", borderRight: "1px solid rgba(255,255,255,0.07)" }}>
              {server && <ServerSidebar server={server} onPower={sendPower} powerLoading={powerLoading} />}
              <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <button onClick={() => { setMobileNavOpen(false); setShowDelete(true); setDeleteInput(""); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                  style={{ color: "#f87171", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.14)" }}>
                  <Trash2 size={11} /> Delete Server
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Left sidebar (desktop) ── */}
      <div className="hidden md:flex flex-col h-full overflow-y-auto shrink-0 px-3 py-4"
        style={{ width: 220, background: "#0a0a12", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        {server && <ServerSidebar server={server} onPower={sendPower} powerLoading={powerLoading} />}
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <button onClick={() => { setShowDelete(true); setDeleteInput(""); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors hover:opacity-80"
            style={{ color: "#f87171", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.14)" }}>
            <Trash2 size={11} /> Delete Server
          </button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── Top header ── */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5"
          style={{ background: "#0a0a12", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>

          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMobileNavOpen(true)}
              className="md:hidden w-7 h-7 flex items-center justify-center rounded-lg"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Menu size={14} style={{ color: "#64748b" }} />
            </button>

            {/* Avatar */}
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[12px] font-bold"
              style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}30`, color: cfg.color }}>
              {server?.name?.charAt(0)?.toUpperCase()}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold truncate" style={{ color: "#f1f5f9" }}>{server?.name}</span>

                {/* Status dot + label */}
                <span className="flex items-center gap-1.5 text-[11px] font-medium shrink-0">
                  <span className="relative flex h-1.5 w-1.5">
                    {isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: cfg.dot }} />}
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: cfg.dot }} />
                  </span>
                  <span style={{ color: cfg.color }}>{cfg.label}</span>
                </span>

                {/* Plan */}
                <span className="hidden sm:inline text-[10px] mono px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(124,58,237,0.1)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.18)" }}>
                  {server?.plan}
                </span>

                {/* Version */}
                {server?.mcVersion && (
                  <span className="hidden md:inline text-[10px] mono px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(96,165,250,0.08)", color: "#7dd3fc", border: "1px solid rgba(96,165,250,0.15)" }}>
                    {server.serverType && `${server.serverType} `}{server.mcVersion}
                  </span>
                )}
              </div>

              {/* Address inline */}
              {displayAddr && (
                <button onClick={() => copyAddr(displayAddr)}
                  className="flex items-center gap-1 mt-0.5 group"
                  title="Copy address">
                  <span className="text-[11px] mono" style={{ color: "#334155" }}>{displayAddr}</span>
                  {copied
                    ? <Check size={9} style={{ color: "#4ade80" }} />
                    : <Copy size={9} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#475569" }} />}
                </button>
              )}
            </div>
          </div>

          {/* Right: DDoS badge only — metrics moved below */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <span className="text-[11px] mono flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
              style={{ background: "rgba(96,165,250,0.06)", color: "#475569", border: "1px solid rgba(96,165,250,0.12)" }}>
              <Shield size={10} style={{ color: "#60a5fa" }} /> DDoS Protected
            </span>
          </div>
        </div>

        {/* ── Metrics bar ── */}
        {/* ── Metrics cards ── */}
        <div className="shrink-0 hidden lg:flex gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#080810" }}>

          {/* CPU */}
          <div className="flex-1 rounded-xl p-3 flex items-center gap-3"
            style={{ background: "#0d0d18", border: `1px solid ${cpuPct > 80 ? "rgba(248,113,113,0.28)" : "rgba(251,191,36,0.16)"}` }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: cpuPct > 80 ? "rgba(248,113,113,0.12)" : "rgba(251,191,36,0.1)", border: `1px solid ${cpuPct > 80 ? "rgba(248,113,113,0.22)" : "rgba(251,191,36,0.2)"}` }}>
              <Cpu size={16} style={{ color: cpuPct > 80 ? "#f87171" : "#fbbf24" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] mono uppercase tracking-wider" style={{ color: "#475569" }}>CPU</span>
                <span className="text-sm font-bold mono" style={{ color: cpuPct > 80 ? "#f87171" : cpuPct > 50 ? "#fbbf24" : "#f1f5f9" }}>
                  {resources?.available ? `${cpuPct.toFixed(1)}%` : "—"}
                </span>
              </div>
              <div style={{ height: 24 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cpuHistory} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cpuG2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={cpuPct > 80 ? "#f87171" : "#a78bfa"} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={cpuPct > 80 ? "#f87171" : "#a78bfa"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke={cpuPct > 80 ? "#f87171" : cpuPct > 50 ? "#fbbf24" : "#7c3aed"}
                      strokeWidth={1.5} fill="url(#cpuG2)" dot={false} isAnimationActive={false} />
                    <Tooltip content={() => null} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* RAM */}
          <div className="flex-1 rounded-xl p-3 flex items-center gap-3"
            style={{ background: "#0d0d18", border: `1px solid ${ramPct > 90 ? "rgba(248,113,113,0.28)" : "rgba(139,92,246,0.2)"}` }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.22)" }}>
              <MemoryStick size={16} style={{ color: "#a78bfa" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] mono uppercase tracking-wider" style={{ color: "#475569" }}>RAM</span>
                <span className="text-sm font-bold mono" style={{ color: ramPct > 90 ? "#f87171" : "#f1f5f9" }}>
                  {resources?.available ? `${ramUsedMB.toFixed(0)} MB` : "—"}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${ramPct}%`, background: ramPct > 90 ? "#ef4444" : "linear-gradient(90deg,#7c3aed,#a855f7)" }} />
              </div>
              <p className="text-[11px] mono mt-1" style={{ color: "#475569" }}>
                {ramPct.toFixed(0)}% of {server?.ram ?? "?"}
              </p>
            </div>
          </div>

          {/* Disk */}
          <div className="flex-1 rounded-xl p-3 flex items-center gap-3"
            style={{ background: "#0d0d18", border: "1px solid rgba(96,165,250,0.18)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)" }}>
              <HardDrive size={16} style={{ color: "#60a5fa" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] mono uppercase tracking-wider" style={{ color: "#475569" }}>Disk</span>
                <span className="text-sm font-bold mono" style={{ color: "#f1f5f9" }}>
                  {resources?.available ? fmtBytes(resources.diskBytes) : "—"}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${diskPct}%`, background: "linear-gradient(90deg,#1d4ed8,#3b82f6)" }} />
              </div>
              <p className="text-[11px] mono mt-1" style={{ color: "#475569" }}>
                {diskPct.toFixed(0)}% of {server?.ssd ?? "?"}
              </p>
            </div>
          </div>

          {/* Uptime */}
          <div className="flex-1 rounded-xl p-3 flex items-center gap-3"
            style={{ background: "#0d0d18", border: `1px solid ${isRunning ? "rgba(74,222,128,0.18)" : "rgba(71,85,105,0.2)"}` }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: isRunning ? "rgba(74,222,128,0.08)" : "rgba(71,85,105,0.08)", border: isRunning ? "1px solid rgba(74,222,128,0.2)" : "1px solid rgba(71,85,105,0.2)" }}>
              <Activity size={16} style={{ color: isRunning ? "#4ade80" : "#475569" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] mono uppercase tracking-wider" style={{ color: "#475569" }}>Uptime</span>
                <span className="text-[11px] font-semibold" style={{ color: isRunning ? "#4ade80" : "#334155" }}>
                  {isRunning ? "Online" : "Offline"}
                </span>
              </div>
              <p className="text-sm font-bold mono" style={{ color: resources?.uptimeMs && resources.uptimeMs > 0 ? "#f1f5f9" : "#334155" }}>
                {resources?.uptimeMs && resources.uptimeMs > 0 ? fmtUptime(resources.uptimeMs) : "—"}
              </p>
              {resources?.netRxBytes != null && (
                <p className="text-[11px] mono mt-0.5" style={{ color: "#334155" }}>
                  ↓{(resources.netRxBytes/1048576).toFixed(1)} ↑{(resources.netTxBytes/1048576).toFixed(1)} MB
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Console + right sidebar ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Console panel ── */}
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

            {/* Console toolbar */}
            <div className="shrink-0 flex items-center justify-between px-3 py-1.5 gap-2"
              style={{ background: "#060608", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>

              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#f59e0b" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e" }} />
                </div>
                <span className="text-[11px] mono hidden sm:block" style={{ color: "#1e293b" }}>{server?.name} — console</span>
              </div>

              <div className="flex items-center gap-1">
                {/* Search input */}
                <AnimatePresence>
                  {searchOpen && (
                    <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 140, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }} className="overflow-hidden flex items-center rounded-md"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <Search size={9} className="ml-2 shrink-0" style={{ color: "#334155" }} />
                      <input autoFocus type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search…"
                        className="flex-1 bg-transparent outline-none px-2 py-1 mono text-[11px]"
                        style={{ color: "#e2e8f0" }} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {[
                  { icon: Search,     title: "Search",       active: searchOpen,  onClick: () => { setSearchOpen(o => !o); if (searchOpen) setSearchQuery(""); } },
                  { icon: X,          title: "Clear",        active: false,       onClick: () => setLogs([]) },
                  { icon: Download,   title: "Download log", active: false,       onClick: downloadLogs },
                  { icon: autoScroll ? ChevronDown : ChevronUp, title: "Auto-scroll", active: autoScroll, onClick: () => setAutoScroll(a => !a) },
                ].map(({ icon: Icon, title, active, onClick }) => (
                  <button key={title} title={title} onClick={onClick}
                    className="w-6 h-6 flex items-center justify-center rounded transition-all hover:opacity-80"
                    style={{
                      background: active ? "rgba(124,58,237,0.12)" : "transparent",
                      color: active ? "#a78bfa" : "#334155",
                    }}>
                    <Icon size={11} />
                  </button>
                ))}

                {/* WS status chip */}
                {wsStatus === "connected" ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] mono ml-1"
                    style={{ background: "rgba(74,222,128,0.08)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.15)" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live
                  </span>
                ) : wsStatus === "connecting" ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] mono ml-1"
                    style={{ background: "rgba(251,191,36,0.06)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.15)" }}>
                    <Loader2 size={8} className="animate-spin" /> …
                  </span>
                ) : (
                  <button onClick={connect}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] mono ml-1 transition-all hover:opacity-80"
                    style={{ background: "rgba(239,68,68,0.06)", color: "#f87171", border: "1px solid rgba(239,68,68,0.15)" }}>
                    <WifiOff size={8} /> Reconnect
                  </button>
                )}
              </div>
            </div>

            {/* Log output */}
            <div ref={logsRef} onScroll={handleConsoleScroll} onClick={() => inputRef.current?.focus()}
              className="flex-1 overflow-y-auto cursor-text font-mono text-[13px] leading-relaxed"
              style={{ background: "#060608", padding: "14px 18px" }}>

              <div className="mb-3 pb-2.5 select-none" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ color: "#6d28d9" }} className="font-bold">NetherNodes</span>
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
                    <div key={line.id} className="flex items-start gap-1.5 mb-px">
                      {s.badge && (
                        <span className="shrink-0 text-[10px] font-bold px-1 py-px rounded mt-0.5"
                          style={{ color: s.color, background: s.badgeBg, minWidth: 28, textAlign: "center" }}>
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
            <div className="shrink-0 flex items-center"
              style={{ background: "#0a0a12", borderTop: "1px solid rgba(255,255,255,0.06)", minHeight: 44 }}>
              <div className="flex items-center px-3 select-none shrink-0 gap-1">
                <span className="text-base font-bold mono" style={{ color: "#7c3aed" }}>›</span>
                {input === "" && (
                  <span className="inline-block w-1.5 h-3 rounded-sm"
                    style={{ background: "#7c3aed", opacity: blink ? 0.6 : 0, transition: "opacity 0.1s" }} />
                )}
              </div>
              <input ref={inputRef} type="text" value={input}
                onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={wsStatus === "connected" ? "Enter command…" : "Not connected"}
                disabled={wsStatus !== "connected"}
                className="flex-1 bg-transparent outline-none py-3 font-mono text-[13px] disabled:opacity-40"
                style={{ color: "#e2e8f0", caretColor: "transparent" }} />
              <button onClick={sendCommand} disabled={!input.trim() || wsStatus !== "connected"}
                className="px-4 py-3 text-xs font-bold shrink-0 transition-all hover:opacity-90 disabled:opacity-25"
                style={{ background: "rgba(109,40,217,0.5)", color: "#c4b5fd", borderLeft: "1px solid rgba(109,40,217,0.3)" }}>
                RUN
              </button>
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div className="hidden lg:flex flex-col shrink-0 overflow-hidden"
            style={{ width: 232, background: "#09090f", borderLeft: "1px solid rgba(255,255,255,0.05)" }}>

            {/* Address + copy */}
            <div className="p-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <p className="text-[10px] mono uppercase tracking-widest mb-2" style={{ color: "#1e293b" }}>Address</p>
              {displayAddr ? (
                <button onClick={() => copyAddr(displayAddr)}
                  className="w-full flex items-center justify-between gap-2 p-2 rounded-lg transition-all hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-[11px] mono truncate" style={{ color: "#4ade80" }}>{displayAddr}</span>
                  {copied ? <Check size={10} style={{ color: "#4ade80" }} /> : <Copy size={10} style={{ color: "#1e293b" }} />}
                </button>
              ) : (
                <p className="text-[11px] mono" style={{ color: "#1e293b" }}>Not assigned yet</p>
              )}

              {/* Players + Uptime inline under address */}
              <div className="flex gap-3 mt-2.5">
                <div className="flex-1 rounded-lg p-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <p className="text-[10px] mono uppercase tracking-wider mb-0.5" style={{ color: "#1e293b" }}>Players</p>
                  <p className="text-sm font-bold" style={{ color: isRunning ? "#f1f5f9" : "#334155" }}>{isRunning ? "0" : "—"}</p>
                </div>
                <div className="flex-1 rounded-lg p-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <p className="text-[10px] mono uppercase tracking-wider mb-0.5" style={{ color: "#1e293b" }}>Uptime</p>
                  <p className="text-xs font-semibold" style={{ color: resources?.uptimeMs && resources.uptimeMs > 0 ? "#f1f5f9" : "#334155" }}>
                    {resources?.uptimeMs && resources.uptimeMs > 0 ? fmtUptime(resources.uptimeMs) : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Custom domain */}
            <div className="p-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] mono uppercase tracking-widest" style={{ color: "#1e293b" }}>Custom Domain</p>
                {server?.hostname && !showHnForm && (
                  <button onClick={() => { setShowHnForm(true); setHnEdit(server.hostname ?? ""); setHnAvail(null); setHnError(""); }}
                    style={{ color: "#334155" }} className="hover:text-purple-400 transition-colors">
                    <Edit3 size={10} />
                  </button>
                )}
              </div>

              {server?.hostname && !showHnForm ? (
                <div className="rounded-lg p-2" style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.14)" }}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${server.hostnameStatus === "active" ? "bg-green-400" : "bg-yellow-400"}`} />
                    <span className="text-[10px] mono" style={{ color: "#475569" }}>
                      {server.hostnameStatus === "active" ? "Active" : "Activating…"}
                    </span>
                  </div>
                  <p className="text-[11px] mono break-all" style={{ color: "#c4b5fd" }}>{server.customAddress}</p>
                </div>
              ) : showHnForm ? (
                <div className="space-y-1.5">
                  <div className="flex items-center rounded-lg overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <input type="text" value={hnEdit}
                      onChange={e => {
                        const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0, 32);
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
                      className="flex-1 bg-transparent outline-none px-2 py-1.5 mono text-[11px] min-w-0"
                      style={{ color: "#e2e8f0" }} />
                    {hnChecking && <Loader2 size={9} className="animate-spin mr-2" style={{ color: "#475569" }} />}
                    {!hnChecking && hnAvail === true && <Check size={9} className="mr-2" style={{ color: "#4ade80" }} />}
                  </div>
                  {hnError && <p className="text-[10px] mono" style={{ color: "#f87171" }}>{hnError}</p>}
                  <div className="flex gap-1.5">
                    <button onClick={() => { setShowHnForm(false); setHnError(""); }}
                      className="flex-1 h-6 rounded-lg text-[10px] transition-colors"
                      style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#475569" }}>Cancel</button>
                    <button disabled={hnSubmitting || !hnAvail || hnEdit.length < 3}
                      onClick={async () => {
                        setHnSubmitting(true); setHnError("");
                        try {
                          const method = server?.hostname ? "PUT" : "POST";
                          const r = await apiFetch(`/api/servers/${id}/hostname`, {
                            method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
                            body: JSON.stringify({ name: hnEdit }),
                          });
                          let d: any = {}; try { d = await r.json(); } catch {}
                          if (!r.ok) { setHnError(d.error || `Failed.`); return; }
                          setServer(p => p ? { ...p, hostname: d.hostname, hostnameStatus: d.hostnameStatus, customAddress: d.customAddress } : p);
                          setShowHnForm(false);
                        } catch (err: any) { setHnError(err?.message || "Network error."); }
                        finally { setHnSubmitting(false); }
                      }}
                      className="flex-1 h-6 rounded-lg text-[10px] font-semibold disabled:opacity-30"
                      style={{ background: "#7c3aed", color: "white" }}>
                      {hnSubmitting ? <Loader2 size={9} className="animate-spin mx-auto" /> : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setShowHnForm(true); setHnEdit(""); setHnAvail(null); setHnError(""); }}
                  className="w-full h-7 flex items-center justify-center gap-1.5 rounded-lg text-[11px] font-medium transition-all hover:opacity-80"
                  style={{ background: "rgba(124,58,237,0.08)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.16)" }}>
                  <Globe size={10} /> Set Custom Address
                </button>
              )}
            </div>

            {/* Quick Actions */}
            <div className="p-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <p className="text-[10px] mono uppercase tracking-widest mb-2" style={{ color: "#1e293b" }}>Quick Actions</p>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { icon: Package,    label: "Plugins",     color: "#a78bfa", to: `/server/${id}/installer` },
                  { icon: UploadCloud,label: "Upload World",color: "#60a5fa", action: () => { setShowUploadWorld(true); setWorldFile(null); setUploadWorldErr(""); setUploadWorldMsg(""); } },
                  { icon: HardDrive,  label: "Backup",      color: "#fbbf24", action: () => { setShowBackup(true); setBackupName(""); setBackupErr(""); setBackupMsg(""); } },
                  { icon: Calendar,   label: "Schedules",   color: "#4ade80", to: `/server/${id}/schedules` },
                  { icon: List,       label: "Whitelist",   color: "#f87171", action: () => { setShowWhitelist(true); setWlPlayer(""); setWlErr(""); setWlMsg(""); } },
                  { icon: Zap,        label: "Domain",      color: "#c084fc", action: () => { setShowHnForm(true); setHnEdit(server?.hostname ?? ""); setHnAvail(null); setHnError(""); } },
                ] as const).map(item => {
                  const Comp: any = (item as any).to ? Link : "button";
                  const extra = (item as any).to ? { to: (item as any).to } : { onClick: (item as any).action };
                  return (
                    <Comp key={item.label} {...extra}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg w-full text-left transition-all hover:brightness-110"
                      style={{ background: `${item.color}0f`, border: `1px solid ${item.color}22` }}>
                      <item.icon size={11} style={{ color: item.color }} />
                      <span className="text-[11px] font-semibold" style={{ color: item.color }}>{item.label}</span>
                    </Comp>
                  );
                })}
              </div>
            </div>

            {/* ── AI Chat ── */}
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center gap-2 px-3 py-2.5 shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.22)" }}>
                  <Sparkles size={11} style={{ color: "#a78bfa" }} />
                </div>
                <span className="text-[11px] font-semibold" style={{ color: "#94a3b8" }}>NetherNodes AI</span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2" style={{ minHeight: 0 }}>
                {aiMessages.length === 0 ? (
                  <div className="text-center py-4">
                    <Sparkles size={18} className="mx-auto mb-2 opacity-20" style={{ color: "#a78bfa" }} />
                    <p className="text-[11px]" style={{ color: "#334155" }}>Ask me anything about your server, plugins, or hosting.</p>
                  </div>
                ) : (
                  aiMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[90%] rounded-xl px-2.5 py-1.5 text-[11px] leading-relaxed"
                        style={m.role === "user"
                          ? { background: "rgba(124,58,237,0.18)", border: "1px solid rgba(124,58,237,0.28)", color: "#e2e8f0" }
                          : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#94a3b8" }}>
                        {m.content}
                      </div>
                    </div>
                  ))
                )}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-xl px-2.5 py-1.5 flex items-center gap-1.5"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <span className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
                <div ref={aiChatEndRef} />
              </div>

              {/* Input */}
              <div className="shrink-0 flex items-center gap-1.5 p-2"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <input
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendAiMessage()}
                  placeholder="Ask AI…"
                  className="flex-1 bg-transparent outline-none text-[11px] px-2.5 py-1.5 rounded-lg mono"
                  style={{ color: "#e2e8f0", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                />
                <button onClick={sendAiMessage} disabled={!aiInput.trim() || aiLoading}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:opacity-90 disabled:opacity-30 shrink-0"
                  style={{ background: "rgba(124,58,237,0.25)", border: "1px solid rgba(124,58,237,0.35)" }}>
                  <Send size={11} style={{ color: "#a78bfa" }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ MODALS ══════════════════════════════════════════════════════ */}

      {/* Create Backup */}
      <AnimatePresence>
        {showBackup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
            onClick={() => !creatingBackup && setShowBackup(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}
              style={{ background: "#0f0f1a", border: "1px solid rgba(251,191,36,0.2)" }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
                  <HardDrive size={14} style={{ color: "#fbbf24" }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: "#f1f5f9" }}>Create Backup</p>
                  <p className="text-[11px]" style={{ color: "#475569" }}>Snapshot your server now</p>
                </div>
                <button onClick={() => setShowBackup(false)} style={{ color: "#334155" }}><X size={14} /></button>
              </div>
              <input value={backupName} onChange={e => setBackupName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createBackupNow()}
                placeholder={`Backup ${new Date().toLocaleDateString("en-IN")}`}
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none mb-4"
                style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#f1f5f9" }} />
              {backupErr && <p className="text-xs mb-3" style={{ color: "#f87171" }}>{backupErr}</p>}
              {backupMsg && <p className="text-xs mb-3" style={{ color: "#4ade80" }}>{backupMsg}</p>}
              <div className="flex gap-2">
                <button onClick={() => setShowBackup(false)} disabled={creatingBackup}
                  className="flex-1 h-9 rounded-xl text-xs"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>Cancel</button>
                <button onClick={createBackupNow} disabled={creatingBackup}
                  className="flex-1 h-9 flex items-center justify-center gap-2 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg,#92400e,#d97706)", color: "white" }}>
                  {creatingBackup ? <><Loader2 size={12} className="animate-spin" /> Creating…</> : "Create Backup"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Whitelist */}
      <AnimatePresence>
        {showWhitelist && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
            onClick={() => !wlAdding && setShowWhitelist(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}
              style={{ background: "#0f0f1a", border: "1px solid rgba(239,68,68,0.2)" }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <List size={14} style={{ color: "#f87171" }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: "#f1f5f9" }}>Whitelist Player</p>
                  <p className="text-[11px]" style={{ color: "#475569" }}>Add a Minecraft player</p>
                </div>
                <button onClick={() => setShowWhitelist(false)} style={{ color: "#334155" }}><X size={14} /></button>
              </div>
              <input value={wlPlayer} onChange={e => setWlPlayer(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addToWhitelist()}
                placeholder="e.g. Notch" autoFocus
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none mono mb-3"
                style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#f1f5f9" }} />
              {wlErr && <p className="text-xs mb-3" style={{ color: "#f87171" }}>{wlErr}</p>}
              {wlMsg && <p className="text-xs mb-3" style={{ color: "#4ade80" }}>{wlMsg}</p>}
              <div className="flex gap-2">
                <button onClick={() => setShowWhitelist(false)} disabled={wlAdding}
                  className="flex-1 h-9 rounded-xl text-xs"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>Cancel</button>
                <button onClick={addToWhitelist} disabled={wlAdding || !wlPlayer.trim()}
                  className="flex-1 h-9 flex items-center justify-center gap-2 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg,#991b1b,#dc2626)", color: "white" }}>
                  {wlAdding ? <><Loader2 size={12} className="animate-spin" /> Adding…</> : "Add Player"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload World */}
      <AnimatePresence>
        {showUploadWorld && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
            onClick={() => !uploadingWorld && setShowUploadWorld(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}
              style={{ background: "#0f0f1a", border: "1px solid rgba(96,165,250,0.2)" }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)" }}>
                  <UploadCloud size={14} style={{ color: "#60a5fa" }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: "#f1f5f9" }}>Upload World</p>
                  <p className="text-[11px]" style={{ color: "#475569" }}>Upload a world folder or zip</p>
                </div>
                <button onClick={() => setShowUploadWorld(false)} style={{ color: "#334155" }}><X size={14} /></button>
              </div>
              <input ref={worldInputRef} type="file" className="hidden"
                accept=".zip,.tar,.gz,.rar,.7z,.json,.dat,.mca,.mcworld"
                onChange={e => { const f = e.target.files?.[0]; if (f) { setWorldFile(f); setUploadWorldErr(""); setUploadWorldMsg(""); } e.target.value = ""; }} />
              <div onClick={() => worldInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setWorldDragOver(true); }}
                onDragLeave={() => setWorldDragOver(false)}
                onDrop={e => { e.preventDefault(); setWorldDragOver(false); const f = e.dataTransfer.files[0]; if (f) { setWorldFile(f); setUploadWorldErr(""); setUploadWorldMsg(""); } }}
                className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-7 cursor-pointer mb-4 transition-all"
                style={{
                  borderColor: worldDragOver ? "#60a5fa" : worldFile ? "rgba(74,222,128,0.35)" : "rgba(255,255,255,0.08)",
                  background: worldDragOver ? "rgba(96,165,250,0.05)" : worldFile ? "rgba(74,222,128,0.03)" : "rgba(255,255,255,0.02)",
                }}>
                {worldFile ? (
                  <>
                    <Check size={20} className="mb-2" style={{ color: "#4ade80" }} />
                    <p className="text-sm font-semibold" style={{ color: "#4ade80" }}>{worldFile.name}</p>
                    <p className="text-[11px] mt-1" style={{ color: "#475569" }}>{(worldFile.size/1048576).toFixed(2)} MB — click to change</p>
                  </>
                ) : (
                  <>
                    <UploadCloud size={20} className="mb-2" style={{ color: worldDragOver ? "#60a5fa" : "#334155" }} />
                    <p className="text-sm font-semibold" style={{ color: worldDragOver ? "#60a5fa" : "#64748b" }}>
                      {worldDragOver ? "Drop it!" : "Click or drag & drop"}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "#1e293b" }}>Supports .zip, .dat, .mca, .mcworld</p>
                  </>
                )}
              </div>
              {uploadWorldErr && <p className="text-xs mb-3" style={{ color: "#f87171" }}>{uploadWorldErr}</p>}
              {uploadWorldMsg && <p className="text-xs mb-3" style={{ color: "#4ade80" }}>{uploadWorldMsg}</p>}
              <div className="flex gap-2">
                <button onClick={() => setShowUploadWorld(false)} disabled={uploadingWorld}
                  className="flex-1 h-9 rounded-xl text-xs"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>Cancel</button>
                <button onClick={uploadWorld} disabled={!worldFile || uploadingWorld}
                  className="flex-1 h-9 flex items-center justify-center gap-2 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "white" }}>
                  {uploadingWorld ? <><Loader2 size={12} className="animate-spin" /> Uploading…</> : "Upload World"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete server */}
      <AnimatePresence>
        {showDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)" }}
            onClick={() => !deleting && setShowDelete(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}
              style={{ background: "#0f0f1a", border: "1px solid rgba(239,68,68,0.22)" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.22)" }}>
                  <Trash2 size={15} style={{ color: "#f87171" }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#f1f5f9" }}>Delete Server?</p>
                  <p className="text-[11px]" style={{ color: "#475569" }}>This cannot be undone</p>
                </div>
              </div>
              <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.14)", color: "#fca5a5" }}>
                All files and data will be permanently deleted.
              </p>
              <label className="text-[10px] mono uppercase tracking-wider block mb-1.5" style={{ color: "#475569" }}>
                Type <strong style={{ color: "#f1f5f9" }}>{server?.name}</strong> to confirm
              </label>
              <input type="text" value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && deleteInput === server?.name && deleteServer()}
                autoFocus placeholder={server?.name}
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none mb-4 mono"
                style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#f1f5f9" }} />
              <div className="flex gap-2">
                <button onClick={() => setShowDelete(false)} disabled={deleting}
                  className="flex-1 h-9 rounded-xl text-xs"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>Cancel</button>
                <button onClick={deleteServer} disabled={deleting || deleteInput !== server?.name}
                  className="flex-1 h-9 flex items-center justify-center gap-2 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg,#991b1b,#dc2626)", color: "white" }}>
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : "Delete Forever"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
