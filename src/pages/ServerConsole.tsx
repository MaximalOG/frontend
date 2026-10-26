import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import {
  Loader2, AlertCircle, Wifi, WifiOff, Check, Copy,
  Globe, Edit3, Trash2, Shield, Clock, Users as UsersIcon,
  HardDrive, Cpu, MemoryStick, Download, Search, X,
  ChevronDown, ChevronUp, Package, Calendar, List, Zap,
  Server, Activity, UploadCloud, Menu, Play, Square,
  RotateCcw, Terminal, FolderOpen, Settings2, ArrowLeft,
  Sparkles, Send, Wifi as WifiIcon, ChevronRight,
} from "lucide-react";
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

/* ─── Helpers ─────────────────────────────────────────────────────────── */
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
function fmtBytes(b: number) { return b >= 1073741824 ? `${(b/1073741824).toFixed(2)} GB` : b >= 1048576 ? `${(b/1048576).toFixed(0)} MB` : `${(b/1024).toFixed(0)} KB`; }
function fmtBytesShort(b: number) { return b >= 1073741824 ? `${(b/1073741824).toFixed(1)}GB` : b >= 1048576 ? `${(b/1048576).toFixed(0)}MB` : `${(b/1024).toFixed(0)}KB`; }
function fmtUptime(ms: number) {
  if (ms <= 0) return "Not running";
  const s = Math.floor(ms/1000), m = Math.floor(s/60), h = Math.floor(m/60), d = Math.floor(h/24);
  if (d > 0) return `${d}d ${h%24}h ${m%60}m`;
  if (h > 0) return `${h}h ${m%60}m ${s%60}s`;
  return `${m}m ${s%60}s`;
}
function parseRamMB(ram?: string) {
  if (!ram) return 0;
  const n = parseFloat(ram);
  return ram.toLowerCase().includes("gb") ? n * 1024 : n;
}

/* ─── Constants ──────────────────────────────────────────────────────── */
const LINE_STYLE: Record<LogLine["type"], { color: string; badge?: string }> = {
  error:   { color: "#ef4444", badge: "ERR" },
  warn:    { color: "#0ea5e9", badge: "WARN" },
  success: { color: "#22c55e", badge: "INFO" },
  info:    { color: "#6b7280" },
  input:   { color: "#60a5fa", badge: "CMD" },
  system:  { color: "#0ea5e9", badge: "SYS" },
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  running:    { label: "RUNNING",    color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  stopped:    { label: "STOPPED",   color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  starting:   { label: "STARTING",  color: "#0ea5e9", bg: "rgba(14,165,233,0.12)" },
  stopping:   { label: "STOPPING",  color: "#0ea5e9", bg: "rgba(14,165,233,0.12)" },
  installing: { label: "INSTALLING",color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  suspended:  { label: "SUSPENDED", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

/* ─── Sidebar nav ────────────────────────────────────────────────────── */
const NAV = [
  { section: "ESSENTIALS", items: [
    { to: "console",   label: "Console",   icon: Terminal },
    { to: "files",     label: "Files",     icon: FolderOpen },
    { to: "version",   label: "Startup",   icon: Settings2 },
  ]},
  { section: "MC UTILS", items: [
    { to: "users",     label: "Players",   icon: UsersIcon },
    { to: "installer", label: "Plugins",   icon: Package },
    { to: "version",   label: "Version",   icon: Settings2 },
    { to: "whitelist", label: "Whitelist", icon: List },
  ]},
  { section: "MANAGEMENT", items: [
    { to: "schedules", label: "Schedules", icon: Calendar },
    { to: "backups",   label: "Backups",   icon: HardDrive },
  ]},
];

/* ═══════════════════════ COMPONENT ════════════════════════════════════ */
export default function ServerConsole() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, token, logout } = useAuth();

  const LOG_KEY    = `nn_console_logs_${id}`;
  const MAX_STORED = 600;
  const loadStoredLogs = (): LogLine[] => {
    try { const r = sessionStorage.getItem(LOG_KEY); return r ? JSON.parse(r) as LogLine[] : []; } catch { return []; }
  };

  /* state */
  const [server, setServer]               = useState<ServerData | null>(null);
  const [loadingServer, setLoadingServer] = useState(true);
  const [serverError, setServerError]     = useState("");
  const [logs, setLogs]                   = useState<LogLine[]>(() => loadStoredLogs());
  const [input, setInput]                 = useState("");
  const [cmdHistory, setCmdHistory]       = useState<string[]>([]);
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
  const [cpuHistory, setCpuHistory]   = useState<{ t: number; v: number }[]>(Array.from({ length: 20 }, (_, i) => ({ t: i, v: 0 })));
  const [memHistory, setMemHistory]   = useState<{ t: number; v: number }[]>(Array.from({ length: 20 }, (_, i) => ({ t: i, v: 0 })));
  const [netRxHistory, setNetRxHistory] = useState<{ t: number; v: number }[]>(Array.from({ length: 20 }, (_, i) => ({ t: i, v: 0 })));
  const [netTxHistory, setNetTxHistory] = useState<{ t: number; v: number }[]>(Array.from({ length: 20 }, (_, i) => ({ t: i, v: 0 })));

  /* AI chat state */
  const [aiMessages, setAiMessages]     = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [aiInput, setAiInput]           = useState("");
  const [aiLoading, setAiLoading]       = useState(false);
  const aiChatEndRef                    = useRef<HTMLDivElement>(null);

  /* Log analysis state */
  const [analysis, setAnalysis]   = useState<{
    severity: "healthy"|"warning"|"error"|"critical";
    summary: string; problem: string; cause: string; fixSteps: string[];
  } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeErr, setAnalyzeErr] = useState("");

  /* refs */
  const wsRef           = useRef<WebSocket | null>(null);
  const logsRef         = useRef<HTMLDivElement>(null);
  const logsEnd         = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLInputElement>(null);
  const tokenRef        = useRef("");
  const tickRef         = useRef(20);
  const connStatusIdRef = useRef<number | null>(null);
  const prevRxRef       = useRef(0);
  const prevTxRef       = useRef(0);

  /* effects */
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

  /* WebSocket */
  const updateConnLog = useCallback((text: string, type: LogLine["type"]) => {
    if (connStatusIdRef.current !== null) {
      const lid = connStatusIdRef.current;
      setLogs(prev => {
        const idx = prev.findIndex(l => l.id === lid);
        if (idx === -1) {
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

  /* Resource poll */
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
            const memMB = d.memoryBytes / 1048576;
            const rxDelta = Math.max(0, d.netRxBytes - prevRxRef.current);
            const txDelta = Math.max(0, d.netTxBytes - prevTxRef.current);
            prevRxRef.current = d.netRxBytes;
            prevTxRef.current = d.netTxBytes;
            setCpuHistory(prev  => [...prev.slice(1), { t: tick, v: d.cpu }]);
            setMemHistory(prev  => [...prev.slice(1), { t: tick, v: memMB }]);
            setNetRxHistory(prev => [...prev.slice(1), { t: tick, v: rxDelta / 1024 }]);
            setNetTxHistory(prev => [...prev.slice(1), { t: tick, v: txDelta / 1024 }]);
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

  /* Handlers */
  const sendCommand = () => {
    const cmd = input.trim();
    if (!cmd || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ event: "send command", args: [cmd] }));
    addLog(`> ${cmd}`, "input");
    setCmdHistory(h => [cmd, ...h.slice(0, 49)]);
    setHistIdx(-1); setInput(""); setAutoScroll(true);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { sendCommand(); return; }
    if (e.key === "ArrowUp")   { e.preventDefault(); const n = Math.min(histIdx+1, cmdHistory.length-1); setHistIdx(n); setInput(cmdHistory[n]??""); }
    if (e.key === "ArrowDown") { e.preventDefault(); const n = Math.max(histIdx-1, -1); setHistIdx(n); setInput(n===-1?"":cmdHistory[n]??""); }
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

  /* Log analyzer */
  const analyzeLog = async () => {
    const lines = logs.filter(l => l.type !== "input").slice(-80).map(l => l.text);
    if (lines.length === 0) { setAnalyzeErr("No console output to analyze yet."); return; }
    setAnalyzing(true); setAnalysis(null); setAnalyzeErr("");
    try {
      const res = await apiFetch(`/api/servers/${id}/analyze-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ lines }),
      });
      let data: any = {}; try { data = await res.json(); } catch {}
      if (!res.ok) { setAnalyzeErr(data.error || "Analysis failed."); return; }
      setAnalysis(data);
    } catch { setAnalyzeErr("Network error. Please try again."); }
    finally { setAnalyzing(false); }
  };

  /* AI chat send */
  const sendAiMessage = async () => {
    const msg = aiInput.trim();
    if (!msg || aiLoading) return;
    setAiMessages(prev => [...prev, { role: "user", content: msg }]);
    setAiInput(""); setAiLoading(true);
    setTimeout(() => aiChatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    try {
      // Prepend server context so the AI gives relevant, formatted responses
      const contextPrefix = server
        ? `[Server context: ${server.name}, ${server.serverType ?? "unknown"} ${server.mcVersion ?? ""}, ${server.ram} RAM, status: ${server.status}]\n\n`
        : "";
      const res = await apiFetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: contextPrefix + msg,
          history: aiMessages.slice(-8).map(m => ({ role: m.role, content: m.content })),
        }),
      });
      let data: any = {}; try { data = await res.json(); } catch {}
      const reply = data.message || (res.ok ? "No response." : (data.error || "Error."));
      setAiMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setAiMessages(prev => [...prev, { role: "assistant", content: "Could not reach AI. Check your connection." }]);
    } finally {
      setAiLoading(false);
      setTimeout(() => aiChatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  /* Derived */
  const filteredLogs = searchQuery ? logs.filter(l => l.text.toLowerCase().includes(searchQuery.toLowerCase())) : logs;
  const st         = STATUS_MAP[server?.status ?? ""] ?? STATUS_MAP.stopped;
  const isRunning  = server?.status === "running";
  const displayAddr = server?.customAddress ?? server?.host ?? null;
  const ramLimitMB  = parseRamMB(server?.ram);
  const ramUsedMB   = resources ? resources.memoryBytes / 1048576 : 0;
  const ramPct      = ramLimitMB > 0 ? Math.min((ramUsedMB / ramLimitMB) * 100, 100) : 0;
  const cpuPct      = resources?.cpu ?? 0;
  const diskLimitMB = resources?.limitDiskMB ?? (() => {
    const s = server?.ssd ?? ""; const n = parseFloat(s);
    if (!n) return 0;
    return s.toUpperCase().includes("GB") ? n * 1024 : n;
  })();
  const diskUsedMB  = resources ? resources.diskBytes / 1048576 : 0;
  const diskPct     = diskLimitMB > 0 ? Math.min((diskUsedMB / diskLimitMB) * 100, 100) : 0;
  const diskFreeMB  = Math.max(0, diskLimitMB - diskUsedMB);

  /* ── Loading / error ── */
  if (authLoading || loadingServer) return (
    <div className="h-screen flex items-center justify-center" style={{ background: "#0e0e10" }}>
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#6b7280" }} />
    </div>
  );
  if (serverError) return (
    <div className="h-screen flex items-center justify-center" style={{ background: "#0e0e10" }}>
      <div className="text-center px-4">
        <AlertCircle className="w-8 h-8 mx-auto mb-3" style={{ color: "#ef4444" }} />
        <p className="text-sm mb-1" style={{ color: "#f3f4f6" }}>Console unavailable</p>
        <p className="text-xs mb-5" style={{ color: "#6b7280" }}>{serverError}</p>
        <Link to="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium"
          style={{ background: "#221d17", border: "1px solid #332a1f", color: "#d1d5db" }}>← Dashboard</Link>
      </div>
    </div>
  );

  /* ══════════════════════════ RENDER ══════════════════════════════════ */
  const sidebarBg    = "#141210";
  const cardBg       = "#1a1612";
  const border       = "1px solid #2a2218";
  const mutedText    = "#6b7280";
  const labelText    = "#9ca3af";
  const headingText  = "#f3f4f6";

  return (
    <div className="flex overflow-hidden" style={{ height: "100vh", background: "#0e0e10", fontFamily: "Inter, sans-serif" }}>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 md:hidden" style={{ background: "rgba(0,0,0,0.7)" }}
              onClick={() => setMobileNavOpen(false)} />
            <motion.div initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed top-0 left-0 h-full z-50 flex flex-col md:hidden py-4 px-3 overflow-y-auto"
              style={{ width: 240, background: sidebarBg, borderRight: border }}>
              <SidebarContent id={id!} server={server} sendPower={sendPower} powerLoading={powerLoading}
                setShowDelete={setShowDelete} setDeleteInput={setDeleteInput} onClose={() => setMobileNavOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Left sidebar ── */}
      <div className="hidden md:flex flex-col shrink-0 overflow-y-auto py-4 px-3"
        style={{ width: 220, background: sidebarBg, borderRight: border }}>
        <SidebarContent id={id!} server={server} sendPower={sendPower} powerLoading={powerLoading}
          setShowDelete={setShowDelete} setDeleteInput={setDeleteInput} />
      </div>

      {/* ── Centre: scrollable main content ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── Server header card ── */}
        <div className="shrink-0 mx-3 sm:mx-4 mt-3 sm:mt-4 mb-2 sm:mb-3 rounded-xl p-3 sm:p-4"
          style={{ background: cardBg, border }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">

            {/* Left: hamburger + avatar + name + address */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button onClick={() => setMobileNavOpen(true)}
                className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg shrink-0"
                style={{ background: "#221d17", border }}>
                <Menu size={14} style={{ color: mutedText }} />
              </button>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                style={{ background: "#221d17", border, color: headingText }}>
                {server?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm" style={{ color: headingText }}>{server?.name}</span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold"
                    style={{ background: st.bg, color: st.color }}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? "animate-pulse" : ""}`}
                      style={{ background: st.color }} />
                    {st.label}
                  </span>
                  {server?.plan && (
                    <span className="hidden sm:inline text-[11px] font-medium" style={{ color: mutedText }}>
                      {server.plan}
                    </span>
                  )}
                </div>
                {displayAddr && (
                  <button onClick={() => copyAddr(displayAddr)} className="flex items-center gap-1 mt-0.5 group">
                    <span className="text-[11px] mono" style={{ color: mutedText }}>{displayAddr}</span>
                    {copied ? <Check size={10} style={{ color: "#22c55e" }} /> : <Copy size={10} style={{ color: mutedText }} />}
                  </button>
                )}
              </div>
            </div>

            {/* Right: power buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
              <PowerBtn label="Start" signal="start" icon={Play} color="#22c55e"
                disabled={isRunning || server?.status === "starting"} loading={powerLoading === "start"} onPower={sendPower} />
              <PowerBtn label="Restart" signal="restart" icon={RotateCcw} color="#0ea5e9"
                disabled={!isRunning} loading={powerLoading === "restart"} onPower={sendPower} />
              <PowerBtn label="Stop" signal="stop" icon={Square} color="#ef4444"
                disabled={!isRunning} loading={powerLoading === "stop"} onPower={sendPower} />
              <PowerBtn label="Kill" signal="kill" icon={X} color="#ef4444"
                disabled={false} loading={powerLoading === "kill"} onPower={sendPower} variant="ghost" />
            </div>
          </div>
        </div>

        {/* ── Mobile tab bar — Console / Stats / AI ── */}
        <div className="flex lg:hidden shrink-0 mx-3 mb-2 rounded-xl overflow-hidden"
          style={{ background: cardBg, border }}>
          {(["console", "stats", "ai"] as const).map(t => (
            <button key={t} onClick={() => setMobileTab(t)}
              className="flex-1 py-2.5 text-xs font-semibold capitalize transition-all"
              style={{
                background: mobileTab === t ? "#e53935" : "transparent",
                color: mobileTab === t ? "white" : mutedText,
              }}>
              {t === "ai" ? "AI" : t === "stats" ? "Stats" : "Console"}
            </button>
          ))}
        </div>

        {/* ── Content area — tabs on mobile, side-by-side on desktop ── */}
        <div className="flex flex-col lg:flex-row gap-3 px-3 sm:px-4 pb-4 flex-1 min-h-0">

          {/* ── Stats column — hidden on mobile unless tab selected ── */}
          <div className={`${mobileTab === "stats" ? "flex" : "hidden"} lg:flex flex-col gap-3 w-full lg:w-auto lg:shrink-0`}
            style={{ minWidth: 0 }}>

            {/* Metrics charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

              {/* CPU history chart */}
              <div className="rounded-xl p-4" style={{ background: cardBg, border }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Cpu size={12} style={{ color: mutedText }} />
                    <span className="text-xs font-medium" style={{ color: mutedText }}>CPU</span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: headingText }}>{cpuPct.toFixed(1)}%</span>
                  <span className="text-[10px]" style={{ color: mutedText }}>of {server?.cpu ?? "—"}</span>
                </div>
                <div style={{ height: 80 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cpuHistory} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="cpuH" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#e53935" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#e53935" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="v" stroke="#e53935" strokeWidth={1.5} fill="url(#cpuH)" dot={false} isAnimationActive={false} />
                      <Tooltip content={() => null} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-1">
                  {cpuHistory.slice(-4).map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "#221d17" }}>
                        <div style={{ width: `${p.v}%`, height: "100%", background: "#e53935", borderRadius: 999 }} />
                      </div>
                      <span className="text-[10px] w-8 text-right" style={{ color: mutedText }}>{p.v.toFixed(1)}%</span>
                    </div>
                  ))}
                  <p className="text-[10px] mt-1" style={{ color: mutedText }}>Last 4 · peak {Math.max(...cpuHistory.map(p => p.v)).toFixed(1)}%</p>
                </div>
              </div>

              {/* Memory history chart */}
              <div className="rounded-xl p-4" style={{ background: cardBg, border }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MemoryStick size={12} style={{ color: mutedText }} />
                    <span className="text-xs font-medium" style={{ color: mutedText }}>Memory</span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: headingText }}>
                    {resources?.available ? `${ramUsedMB.toFixed(0)} MB` : "— MB"}
                  </span>
                  <span className="text-[10px]" style={{ color: mutedText }}>of {server?.ram ?? "—"}</span>
                </div>
                <div style={{ height: 80 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={memHistory} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="memH" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={1.5} fill="url(#memH)" dot={false} isAnimationActive={false} />
                      <Tooltip content={() => null} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-1">
                  {memHistory.slice(-4).map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "#221d17" }}>
                        <div style={{ width: `${ramLimitMB > 0 ? (p.v / ramLimitMB) * 100 : 0}%`, height: "100%", background: "#3b82f6", borderRadius: 999 }} />
                      </div>
                      <span className="text-[10px] w-12 text-right" style={{ color: mutedText }}>{p.v.toFixed(0)} MB</span>
                    </div>
                  ))}
                  <p className="text-[10px] mt-1" style={{ color: mutedText }}>Last 4 · peak {Math.max(...memHistory.map(p => p.v)).toFixed(0)} MB</p>
                </div>
              </div>

              {/* Disk donut */}
              <div className="rounded-xl p-4" style={{ background: cardBg, border }}>
                <div className="flex items-center gap-2 mb-3">
                  <HardDrive size={12} style={{ color: mutedText }} />
                  <span className="text-xs font-medium" style={{ color: mutedText }}>Disk usage</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
                    <PieChart width={80} height={80}>
                      <Pie data={[{ value: diskPct }, { value: Math.max(0, 100 - diskPct) }]}
                        cx={35} cy={35} innerRadius={26} outerRadius={38} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                        <Cell fill="#3b82f6" />
                        <Cell fill="#221d17" />
                      </Pie>
                    </PieChart>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold" style={{ color: headingText }}>{diskPct.toFixed(0)}%</span>
                    </div>
                    <p className="text-[9px] text-center mt-0.5" style={{ color: mutedText }}>Used</p>
                  </div>
                  <div className="space-y-2 flex-1">
                    {[
                      { label: "Used",  val: resources?.available ? fmtBytes(resources.diskBytes) : "—", color: "#3b82f6" },
                      { label: "Free",  val: diskLimitMB > 0 ? fmtBytes(diskFreeMB * 1048576) : "—", color: null },
                      { label: "Limit", val: server?.ssd ?? "—", color: null },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs" style={{ color: labelText }}>
                          <span className="w-2 h-2 rounded-sm" style={{ background: color ?? "#221d17", border: color ? undefined : "1px solid #374151" }} />
                          {label}
                        </span>
                        <span className="text-xs font-semibold" style={{ color: headingText }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Server Info card */}
            <div className="rounded-xl overflow-hidden" style={{ background: cardBg, border }}>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid #2a2218" }}>
                <div className="flex items-center gap-2">
                  <Server size={12} style={{ color: mutedText }} />
                  <span className="text-xs font-semibold" style={{ color: labelText }}>Server Info</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 divide-x divide-y" style={{ borderColor: "#221d17" }}>
                {[
                  { label: "Status", value: st.label, color: st.color },
                  { label: "Uptime", value: resources?.uptimeMs && resources.uptimeMs > 0 ? fmtUptime(resources.uptimeMs) : "Not running" },
                  { label: "Plan", value: server?.plan ?? "—" },
                  { label: "RAM", value: server?.ram ?? "—" },
                  { label: "CPU", value: server?.cpu ?? "—" },
                  { label: "Disk", value: server?.ssd ?? "—" },
                ].map(({ label, value, color }: any) => (
                  <div key={label} className="flex flex-col px-4 py-2.5">
                    <span className="text-[10px]" style={{ color: mutedText }}>{label}</span>
                    <span className="text-xs font-semibold mt-0.5" style={{ color: color ?? labelText }}>{value}</span>
                  </div>
                ))}
              </div>
              {/* Quick actions */}
              <div className="px-4 py-4" style={{ borderTop: "1px solid #2a2218" }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: mutedText }}>Quick Actions</p>
                <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-2 gap-2">
                  {([
                    { icon: Package,     label: "Plugins",   color: "#0ea5e9", to: `/server/${id}/installer` },
                    { icon: HardDrive,   label: "Backup",    color: "#22c55e", action: () => { setShowBackup(true); setBackupName(""); setBackupErr(""); setBackupMsg(""); } },
                    { icon: UploadCloud, label: "Upload",    color: "#0ea5e9", action: () => { setShowUploadWorld(true); setWorldFile(null); setUploadWorldErr(""); setUploadWorldMsg(""); } },
                    { icon: List,        label: "Whitelist", color: "#22c55e", action: () => { setShowWhitelist(true); setWlPlayer(""); setWlErr(""); setWlMsg(""); } },
                    { icon: Calendar,    label: "Schedules", color: "#0ea5e9", to: `/server/${id}/schedules` },
                    { icon: Globe,       label: "Domain",    color: "#22c55e", action: () => { setShowHnForm(true); setHnEdit(server?.hostname ?? ""); setHnAvail(null); setHnError(""); } },
                  ] as const).map(item => {
                    const Comp: any = (item as any).to ? Link : "button";
                    const extra = (item as any).to ? { to: (item as any).to } : { onClick: (item as any).action };
                    return (
                      <Comp key={item.label} {...extra}
                        className="flex items-center gap-2 px-2.5 py-2.5 rounded-lg w-full text-left transition-all hover:brightness-110 active:scale-95"
                        style={{ background: `${item.color}15`, border: `1px solid ${item.color}30` }}>
                        <item.icon size={12} style={{ color: item.color }} />
                        <span className="text-xs font-semibold truncate" style={{ color: item.color }}>{item.label}</span>
                      </Comp>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Console panel — always visible on desktop, tab-controlled on mobile ── */}
          <div className={`${mobileTab === "console" ? "flex" : "hidden"} lg:flex flex-col flex-1 min-w-0 min-h-0 rounded-xl overflow-hidden`}
            style={{ background: cardBg, border }}>

            {/* Toolbar */}
            <div className="shrink-0 flex items-center justify-between px-3 py-2 gap-2"
              style={{ borderBottom: "1px solid #2a2218", background: "#141210" }}>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#0ea5e9" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e" }} />
                </div>
                <span className="text-[11px] hidden sm:block" style={{ color: "#374151" }}>{server?.name} — console</span>
              </div>
              <div className="flex items-center gap-1">
                <AnimatePresence>
                  {searchOpen && (
                    <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 130, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }} className="overflow-hidden flex items-center rounded-md"
                      style={{ background: "#221d17", border: "1px solid #332a1f" }}>
                      <Search size={9} className="ml-2 shrink-0" style={{ color: mutedText }} />
                      <input autoFocus type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search…" className="flex-1 bg-transparent outline-none px-2 py-1 mono text-[11px]"
                        style={{ color: "#d1d5db" }} />
                    </motion.div>
                  )}
                </AnimatePresence>
                {[
                  { icon: Search,   title: "Search",       active: searchOpen,  onClick: () => { setSearchOpen(o => !o); if (searchOpen) setSearchQuery(""); } },
                  { icon: X,        title: "Clear",        active: false,       onClick: () => setLogs([]) },
                  { icon: Download, title: "Download log", active: false,       onClick: downloadLogs },
                  { icon: autoScroll ? ChevronDown : ChevronUp, title: "Auto-scroll", active: autoScroll, onClick: () => setAutoScroll(a => !a) },
                ].map(({ icon: Icon, title, active, onClick }) => (
                  <button key={title} title={title} onClick={onClick}
                    className="w-7 h-7 flex items-center justify-center rounded transition-colors hover:bg-white/5"
                    style={{ color: active ? "#0ea5e9" : "#374151" }}>
                    <Icon size={11} />
                  </button>
                ))}
                <button onClick={analyzeLog} disabled={analyzing || logs.length === 0}
                  title="Analyze logs with AI"
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] ml-1 transition-all hover:opacity-90 disabled:opacity-30"
                  style={{ background: "rgba(229,57,53,0.12)", color: "#22c55e", border: "1px solid rgba(229,57,53,0.2)" }}>
                  {analyzing ? <><Loader2 size={9} className="animate-spin" /> Analyzing…</> : <><Sparkles size={9} /> Analyze</>}
                </button>
                {wsStatus === "connected" ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] mono ml-1"
                    style={{ background: "rgba(34,197,94,0.08)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#22c55e" }} /> Live
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

            {/* Analysis panel */}
            <AnimatePresence>
              {(analysis || analyzeErr) && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
                  className="shrink-0 overflow-hidden" style={{ borderBottom: "1px solid #2a2218" }}>
                  {analyzeErr ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 text-xs" style={{ color: "#ef4444" }}>
                      <AlertCircle size={12} /> {analyzeErr}
                      <button onClick={() => setAnalyzeErr("")} className="ml-auto"><X size={11} /></button>
                    </div>
                  ) : analysis && (() => {
                    const SEV = {
                      healthy:  { color: "#22c55e", label: "✓ Healthy" },
                      warning:  { color: "#fbbf24", label: "⚠ Warning" },
                      error:    { color: "#ef4444", label: "✗ Error" },
                      critical: { color: "#ef4444", label: "🔴 Critical" },
                    }[analysis.severity] ?? { color: "#0ea5e9", label: "Analysis" };
                    return (
                      <div className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold px-2 py-0.5 rounded"
                              style={{ background: `${SEV.color}15`, color: SEV.color, border: `1px solid ${SEV.color}30` }}>
                              {SEV.label}
                            </span>
                            <span className="text-xs" style={{ color: labelText }}>{analysis.summary}</span>
                          </div>
                          <button onClick={() => setAnalysis(null)} style={{ color: mutedText }}><X size={12} /></button>
                        </div>
                        {analysis.problem && analysis.problem !== "No issues detected" && (
                          <p className="text-[11px] mb-1"><span style={{ color: mutedText }}>Problem: </span><span style={{ color: labelText }}>{analysis.problem}</span></p>
                        )}
                        {analysis.cause && analysis.cause !== "N/A" && (
                          <p className="text-[11px] mb-1"><span style={{ color: mutedText }}>Cause: </span><span style={{ color: labelText }}>{analysis.cause}</span></p>
                        )}
                        <div className="space-y-0.5 mt-1">
                          {analysis.fixSteps.map((step, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="text-[10px] font-bold shrink-0" style={{ color: SEV.color }}>{i + 1}.</span>
                              <span className="text-[11px] font-mono" style={{ color: labelText }}>{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Log output — FILLS remaining height */}
            <div ref={logsRef} onScroll={handleConsoleScroll} onClick={() => inputRef.current?.focus()}
              className="flex-1 overflow-y-auto cursor-text font-mono text-[12.5px] leading-relaxed"
              style={{ background: "#0c0a08", padding: "12px 16px", minHeight: 200 }}>
              {filteredLogs.length === 0 ? (
                <span className="select-none" style={{ color: "#374151" }}>
                  {searchQuery ? "No matching lines." : "Waiting for output…"}
                </span>
              ) : (
                filteredLogs.map(line => {
                  const s = LINE_STYLE[line.type];
                  return (
                    <div key={line.id} className="flex items-start gap-1.5 mb-px">
                      {s.badge && (
                        <span className="shrink-0 text-[9px] font-bold px-1 py-px rounded mt-0.5"
                          style={{ color: s.color, background: `${s.color}15`, minWidth: 28, textAlign: "center" }}>
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
              style={{ background: "#141210", borderTop: "1px solid #2a2218", minHeight: 48 }}>
              <div className="flex items-center px-3 select-none shrink-0 gap-1">
                <span className="text-base font-bold mono" style={{ color: "#e53935" }}>›</span>
                {input === "" && (
                  <span className="inline-block w-1.5 h-3 rounded-sm ml-0.5"
                    style={{ background: "#e53935", opacity: blink ? 0.6 : 0, transition: "opacity 0.1s" }} />
                )}
              </div>
              <input ref={inputRef} type="text" value={input}
                onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={wsStatus === "connected" ? "Enter command…" : "Not connected"}
                disabled={wsStatus !== "connected"}
                className="flex-1 bg-transparent outline-none py-3 font-mono text-[13px] disabled:opacity-40"
                style={{ color: "#d1d5db", caretColor: "transparent" }} />
              <button onClick={sendCommand} disabled={!input.trim() || wsStatus !== "connected"}
                className="px-4 py-3 text-xs font-bold shrink-0 transition-all hover:opacity-90 disabled:opacity-30"
                style={{ background: "#221d17", color: "#9ca3af", borderLeft: "1px solid #2a2218" }}>
                RUN
              </button>
            </div>
          </div>

          {/* ── AI Chat panel — tab on mobile, sidebar on desktop ── */}
          <div className={`${mobileTab === "ai" ? "flex" : "hidden"} xl:flex flex-col shrink-0 rounded-xl overflow-hidden`}
            style={{ width: undefined, minWidth: 0, flex: mobileTab === "ai" ? "1" : undefined, ...(window.innerWidth >= 1280 ? { width: 280 } : {}) }}>
            <div className="w-full xl:w-72 flex flex-col h-full rounded-xl overflow-hidden" style={{ background: cardBg, border }}>

              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-3 shrink-0"
                style={{ borderBottom: "1px solid #2a2218", background: "#141210" }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(229,57,53,0.15)", border: "1px solid rgba(229,57,53,0.3)" }}>
                  <Sparkles size={12} style={{ color: "#22c55e" }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: labelText }}>NetherNodes AI</span>
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(229,57,53,0.1)", color: "#0ea5e9", border: "1px solid rgba(229,57,53,0.2)" }}>
                  Beta
                </span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2" style={{ minHeight: 0 }}>
                {aiMessages.length === 0 ? (
                  <div className="text-center py-6">
                    <Sparkles size={22} className="mx-auto mb-3 opacity-20" style={{ color: "#0ea5e9" }} />
                    <p className="text-xs font-medium mb-1" style={{ color: labelText }}>NetherNodes AI</p>
                    <p className="text-[11px]" style={{ color: mutedText }}>Ask about your server, plugins, errors, or hosting.</p>
                    <div className="mt-4 space-y-1.5">
                      {["Why is my server lagging?", "How do I install Essentials?", "What does this error mean?"].map(q => (
                        <button key={q} onClick={() => { setAiInput(q); }}
                          className="w-full text-left px-2.5 py-2.5 rounded-lg text-[11px] transition-all hover:brightness-110 active:scale-95"
                          style={{ background: "#221d17", border: "1px solid #332a1f", color: labelText }}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : aiMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    {m.role === "user" ? (
                      <div className="max-w-[88%] rounded-xl px-3 py-2 text-[12px] leading-relaxed"
                        style={{ background: "#221d17", border: "1px solid #332a1f", color: "#d1d5db" }}>
                        {m.content}
                      </div>
                    ) : (
                      <div className="max-w-[96%] rounded-xl px-3 py-2.5 text-[12px]"
                        style={{ background: "#1a1612", border: "1px solid #2a2218", color: "#d1d5db" }}>
                        <AiMarkdown text={m.content} />
                      </div>
                    )}
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-xl px-3 py-2 flex items-center gap-1.5"
                      style={{ background: "#1a1612", border: "1px solid #2a2218" }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#94a3b8", animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#94a3b8", animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#94a3b8", animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
                <div ref={aiChatEndRef} />
              </div>

              {/* Input */}
              <div className="shrink-0 p-2.5" style={{ borderTop: "1px solid #2a2218" }}>
                <div className="flex items-center gap-2 rounded-xl px-3 py-2"
                  style={{ background: "#221d17", border: "1px solid #332a1f" }}>
                  <input value={aiInput} onChange={e => setAiInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendAiMessage()}
                    placeholder="Ask AI…"
                    className="flex-1 bg-transparent outline-none text-[12px]"
                    style={{ color: "#d1d5db" }} />
                  <button onClick={sendAiMessage} disabled={!aiInput.trim() || aiLoading}
                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:opacity-90 disabled:opacity-30 shrink-0"
                    style={{ background: "rgba(229,57,53,0.2)", border: "1px solid rgba(229,57,53,0.3)" }}>
                    <Send size={12} style={{ color: "#e53935" }} />
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

            {/* Left: avatar + name + address */}
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setMobileNavOpen(true)}
                className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg shrink-0"
                style={{ background: "#221d17", border }}>
                <Menu size={14} style={{ color: mutedText }} />
              </button>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                style={{ background: "#221d17", border, color: headingText }}>
                {server?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold" style={{ color: headingText, fontSize: 15 }}>{server?.name}</span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold"
                    style={{ background: st.bg, color: st.color }}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? "animate-pulse" : ""}`}
                      style={{ background: st.color }} />
                    {st.label}
                  </span>
                  {server?.plan && (
                    <span className="text-[11px] font-medium" style={{ color: mutedText }}>
                      {server.plan}
                    </span>
                  )}
                  {server?.mcVersion && (
                    <span className="hidden sm:inline text-[11px]" style={{ color: mutedText }}>
                      {server.serverType} {server.mcVersion}
                    </span>
                  )}
                </div>
                {displayAddr && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[12px]" style={{ color: mutedText }}>{displayAddr}</span>
                    <button onClick={() => copyAddr(displayAddr)}
                      className="text-[11px]" style={{ color: mutedText }}>
                      {copied ? <Check size={11} style={{ color: "#22c55e" }} /> : <Copy size={11} />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: power buttons */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              <PowerBtn label="Start" signal="start" icon={Play} color="#22c55e"
                disabled={isRunning || server?.status === "starting"} loading={powerLoading === "start"} onPower={sendPower} />
              <PowerBtn label="Restart" signal="restart" icon={RotateCcw} color="#0ea5e9"
                disabled={!isRunning} loading={powerLoading === "restart"} onPower={sendPower} />
              <PowerBtn label="Stop" signal="stop" icon={Square} color="#ef4444"
                disabled={!isRunning} loading={powerLoading === "stop"} onPower={sendPower} />
              <PowerBtn label="Kill" signal="kill" icon={X} color="#ef4444"
                disabled={false} loading={powerLoading === "kill"} onPower={sendPower} variant="ghost" />
            </div>
          </div>
        </div>

        {/* ── Metrics row 2: CPU chart + Memory chart + Disk donut ── */}
        <div className="shrink-0 grid grid-cols-1 lg:grid-cols-3 gap-3 px-4 mb-3">

          {/* CPU history chart */}
          <div className="rounded-xl p-4" style={{ background: cardBg, border }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cpu size={12} style={{ color: mutedText }} />
                <span className="text-xs font-medium" style={{ color: mutedText }}>CPU</span>
              </div>
              <span className="text-xs font-bold" style={{ color: headingText }}>
                {cpuPct.toFixed(1)}%
              </span>
              <span className="text-[10px]" style={{ color: mutedText }}>of {server?.cpu ?? "—"}</span>
            </div>
            <div style={{ height: 80 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cpuHistory} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cpuH" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e53935" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#e53935" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#e53935" strokeWidth={1.5} fill="url(#cpuH)" dot={false} isAnimationActive={false} />
                  <Tooltip content={() => null} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* mini history rows */}
            <div className="mt-3 space-y-1">
              {cpuHistory.slice(-4).map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "#221d17" }}>
                    <div style={{ width: `${p.v}%`, height: "100%", background: "#e53935", borderRadius: 999 }} />
                  </div>
                  <span className="text-[10px] w-8 text-right" style={{ color: mutedText }}>{p.v.toFixed(1)}%</span>
                </div>
              ))}
              <p className="text-[10px] mt-1" style={{ color: mutedText }}>
                Last 4 readings · peak {Math.max(...cpuHistory.map(p => p.v)).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Memory history chart */}
          <div className="rounded-xl p-4" style={{ background: cardBg, border }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MemoryStick size={12} style={{ color: mutedText }} />
                <span className="text-xs font-medium" style={{ color: mutedText }}>Memory</span>
              </div>
              <span className="text-xs font-bold" style={{ color: headingText }}>
                {resources?.available ? `${ramUsedMB.toFixed(0)} MB` : "— MB"}
              </span>
              <span className="text-[10px]" style={{ color: mutedText }}>of {server?.ram ?? "—"}</span>
            </div>
            <div style={{ height: 80 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={memHistory} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="memH" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={1.5} fill="url(#memH)" dot={false} isAnimationActive={false} />
                  <Tooltip content={() => null} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-1">
              {memHistory.slice(-4).map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "#221d17" }}>
                    <div style={{ width: `${ramLimitMB > 0 ? (p.v / ramLimitMB) * 100 : 0}%`, height: "100%", background: "#3b82f6", borderRadius: 999 }} />
                  </div>
                  <span className="text-[10px] w-12 text-right" style={{ color: mutedText }}>{p.v.toFixed(0)} MB</span>
                </div>
              ))}
              <p className="text-[10px] mt-1" style={{ color: mutedText }}>
                Last 4 readings · peak {Math.max(...memHistory.map(p => p.v)).toFixed(0)} MB
              </p>
            </div>
          </div>

          {/* Disk donut */}
          <div className="rounded-xl p-4 flex gap-4" style={{ background: cardBg, border }}>
            <div className="flex items-center gap-2 mb-3">
              <HardDrive size={12} style={{ color: mutedText }} />
              <span className="text-xs font-medium" style={{ color: mutedText }}>Disk usage</span>
            </div>
            <div className="flex items-center gap-4 mt-1">
              {/* Donut */}
              <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
                <PieChart width={80} height={80}>
                  <Pie data={[
                    { value: diskPct },
                    { value: Math.max(0, 100 - diskPct) },
                  ]} cx={35} cy={35} innerRadius={26} outerRadius={38} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                    <Cell fill="#3b82f6" />
                    <Cell fill="#221d17" />
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold" style={{ color: headingText }}>{diskPct.toFixed(0)}%</span>
                </div>
                <p className="text-[9px] text-center mt-0.5" style={{ color: mutedText }}>Used</p>
              </div>

              {/* Stats */}
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: labelText }}>
                    <span className="w-2 h-2 rounded-sm" style={{ background: "#3b82f6" }} /> Used
                  </span>
                  <span className="text-xs font-semibold" style={{ color: headingText }}>
                    {resources?.available ? fmtBytes(resources.diskBytes) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: labelText }}>
                    <span className="w-2 h-2 rounded-sm" style={{ background: "#221d17", border: "1px solid #374151" }} /> Free
                  </span>
                  <span className="text-xs font-semibold" style={{ color: headingText }}>
                    {diskLimitMB > 0 ? fmtBytes(diskFreeMB * 1048576) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: labelText }}>
                    <span className="w-2 h-2 rounded-sm opacity-0" /> Limit
                  </span>
                  <span className="text-xs font-semibold" style={{ color: headingText }}>{server?.ssd ?? "—"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Server Info card + Console side by side ── */}
        <div className="flex flex-col lg:flex-row gap-3 px-4 pb-4 min-h-0 flex-1">

          {/* Server Info card — stacks above console on mobile, sidebar on desktop */}
          <div className="w-full lg:w-72 lg:shrink-0 rounded-xl overflow-hidden" style={{ background: cardBg, border }}>
            <div className="px-4 py-3" style={{ borderBottom: "1px solid #2a2218" }}>
              <div className="flex items-center gap-2">
                <Server size={12} style={{ color: mutedText }} />
                <span className="text-xs font-semibold" style={{ color: labelText }}>Server Info</span>
              </div>
            </div>
            <div className="divide-y" style={{ borderColor: "#221d17" }}>
              {[
                { label: "Status", value: (
                  <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: st.color }}>
                    <span className={`w-2 h-2 rounded-full ${isRunning ? "animate-pulse" : ""}`} style={{ background: st.color }} />
                    {st.label}
                  </span>
                )},
                { label: "Uptime", value: resources?.uptimeMs && resources.uptimeMs > 0 ? fmtUptime(resources.uptimeMs) : "Not running" },
                { label: "Hostname", value: displayAddr ? (
                  <button onClick={() => copyAddr(displayAddr)} className="flex items-center gap-1 group" style={{ color: labelText }}>
                    <span className="text-xs truncate max-w-[120px]">{displayAddr}</span>
                    {copied ? <Check size={10} style={{ color: "#22c55e" }} /> : <Copy size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </button>
                ) : "—" },
                { label: "Node", value: "India" },
                { label: "Plan", value: server?.plan ?? "—" },
                { label: "RAM", value: server?.ram ?? "—" },
                { label: "CPU", value: server?.cpu ?? "—" },
                { label: "Disk", value: server?.ssd ?? "—" },
                { label: "Network ↓", value: resources?.available ? fmtBytesShort(resources.netRxBytes) : "—" },
                { label: "Network ↑", value: resources?.available ? fmtBytesShort(resources.netTxBytes) : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2">
                  <span className="text-xs" style={{ color: mutedText }}>{label}</span>
                  {typeof value === "string"
                    ? <span className="text-xs font-medium" style={{ color: labelText }}>{value}</span>
                    : value}
                </div>
              ))}
            </div>

            {/* Quick actions — full-size buttons, visible */}
            <div className="px-4 py-4" style={{ borderTop: "1px solid #2a2218" }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: mutedText }}>Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { icon: Package,     label: "Plugins",   color: "#0ea5e9", to: `/server/${id}/installer` },
                  { icon: HardDrive,   label: "Backup",    color: "#22c55e", action: () => { setShowBackup(true); setBackupName(""); setBackupErr(""); setBackupMsg(""); } },
                  { icon: UploadCloud, label: "Upload",    color: "#0ea5e9", action: () => { setShowUploadWorld(true); setWorldFile(null); setUploadWorldErr(""); setUploadWorldMsg(""); } },
                  { icon: List,        label: "Whitelist", color: "#22c55e", action: () => { setShowWhitelist(true); setWlPlayer(""); setWlErr(""); setWlMsg(""); } },
                  { icon: Calendar,    label: "Schedules", color: "#0ea5e9", to: `/server/${id}/schedules` },
                  { icon: Globe,       label: "Domain",    color: "#22c55e", action: () => { setShowHnForm(true); setHnEdit(server?.hostname ?? ""); setHnAvail(null); setHnError(""); } },
                ] as const).map(item => {
                  const Comp: any = (item as any).to ? Link : "button";
                  const extra = (item as any).to ? { to: (item as any).to } : { onClick: (item as any).action };
                  return (
                    <Comp key={item.label} {...extra}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg w-full text-left transition-all hover:brightness-110 active:scale-95"
                      style={{ background: `${item.color}15`, border: `1px solid ${item.color}30` }}>
                      <item.icon size={13} style={{ color: item.color }} />
                      <span className="text-xs font-semibold" style={{ color: item.color }}>{item.label}</span>
                    </Comp>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Console panel */}
          <div className="flex flex-col flex-1 min-w-0 rounded-xl overflow-hidden" style={{ background: cardBg, border }}>

            {/* Toolbar */}
            <div className="shrink-0 flex items-center justify-between px-3 py-2 gap-2"
              style={{ borderBottom: "1px solid #2a2218", background: "#141210" }}>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#0ea5e9" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e" }} />
                </div>
                <span className="text-[11px]" style={{ color: "#374151" }}>{server?.name} — console</span>
              </div>
              <div className="flex items-center gap-1">
                <AnimatePresence>
                  {searchOpen && (
                    <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 130, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }} className="overflow-hidden flex items-center rounded-md"
                      style={{ background: "#221d17", border: "1px solid #332a1f" }}>
                      <Search size={9} className="ml-2 shrink-0" style={{ color: mutedText }} />
                      <input autoFocus type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search…" className="flex-1 bg-transparent outline-none px-2 py-1 mono text-[11px]"
                        style={{ color: "#d1d5db" }} />
                    </motion.div>
                  )}
                </AnimatePresence>
                {[
                  { icon: Search,   title: "Search",       active: searchOpen,  onClick: () => { setSearchOpen(o => !o); if (searchOpen) setSearchQuery(""); } },
                  { icon: X,        title: "Clear",        active: false,       onClick: () => setLogs([]) },
                  { icon: Download, title: "Download log", active: false,       onClick: downloadLogs },
                  { icon: autoScroll ? ChevronDown : ChevronUp, title: "Auto-scroll", active: autoScroll, onClick: () => setAutoScroll(a => !a) },
                ].map(({ icon: Icon, title, active, onClick }) => (
                  <button key={title} title={title} onClick={onClick}
                    className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-white/5"
                    style={{ color: active ? "#0ea5e9" : "#374151" }}>
                    <Icon size={11} />
                  </button>
                ))}
                <button onClick={analyzeLog} disabled={analyzing || logs.length === 0}
                  title="Analyze logs with AI"
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ml-1 transition-all hover:opacity-90 disabled:opacity-30"
                  style={{ background: "rgba(229,57,53,0.12)", color: "#22c55e", border: "1px solid rgba(229,57,53,0.2)" }}>
                  {analyzing ? <><Loader2 size={9} className="animate-spin" /> Analyzing…</> : <><Sparkles size={9} /> Analyze</>}
                </button>
                {wsStatus === "connected" ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] mono ml-1"
                    style={{ background: "rgba(34,197,94,0.08)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#22c55e" }} /> Live
                  </span>
                ) : wsStatus === "connecting" ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] mono ml-1"
                    style={{ background: "rgba(14,165,233,0.08)", color: "#0ea5e9", border: "1px solid rgba(14,165,233,0.2)" }}>
                    <Loader2 size={8} className="animate-spin" /> …
                  </span>
                ) : (
                  <button onClick={connect}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] mono ml-1 transition-all hover:opacity-80"
                    style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <WifiOff size={8} /> Reconnect
                  </button>
                )}
              </div>
            </div>

            {/* Analysis panel */}
            <AnimatePresence>
              {(analysis || analyzeErr) && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
                  className="shrink-0 overflow-hidden" style={{ borderBottom: "1px solid #2a2218" }}>
                  {analyzeErr ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 text-xs" style={{ color: "#ef4444" }}>
                      <AlertCircle size={12} /> {analyzeErr}
                      <button onClick={() => setAnalyzeErr("")} className="ml-auto"><X size={11} /></button>
                    </div>
                  ) : analysis && (() => {
                    const SEV = {
                      healthy:  { color: "#22c55e", label: "✓ Healthy" },
                      warning:  { color: "#0ea5e9", label: "⚠ Warning" },
                      error:    { color: "#ef4444", label: "✗ Error" },
                      critical: { color: "#ef4444", label: "🔴 Critical" },
                    }[analysis.severity] ?? { color: "#0ea5e9", label: "Analysis" };
                    return (
                      <div className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded"
                              style={{ background: `${SEV.color}15`, color: SEV.color, border: `1px solid ${SEV.color}30` }}>
                              {SEV.label}
                            </span>
                            <span className="text-xs" style={{ color: labelText }}>{analysis.summary}</span>
                          </div>
                          <button onClick={() => setAnalysis(null)} style={{ color: mutedText }}><X size={12} /></button>
                        </div>
                        {analysis.problem && analysis.problem !== "No issues detected" && (
                          <p className="text-[11px] mb-1"><span style={{ color: mutedText }}>Problem: </span><span style={{ color: labelText }}>{analysis.problem}</span></p>
                        )}
                        {analysis.cause && analysis.cause !== "N/A" && (
                          <p className="text-[11px] mb-1"><span style={{ color: mutedText }}>Cause: </span><span style={{ color: labelText }}>{analysis.cause}</span></p>
                        )}
                        <div className="space-y-0.5 mt-1">
                          {analysis.fixSteps.map((step, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="text-[10px] font-bold shrink-0" style={{ color: SEV.color }}>{i + 1}.</span>
                              <span className="text-[11px] font-mono" style={{ color: labelText }}>{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Log output */}
            <div ref={logsRef} onScroll={handleConsoleScroll} onClick={() => inputRef.current?.focus()}
              className="flex-1 overflow-y-auto cursor-text font-mono text-[12.5px] leading-relaxed"
              style={{ background: "#0f0d0a", padding: "12px 16px" }}>
              {filteredLogs.length === 0 ? (
                <span className="select-none" style={{ color: "#374151" }}>
                  {searchQuery ? "No matching lines." : "Waiting for output…"}
                </span>
              ) : (
                filteredLogs.map(line => {
                  const s = LINE_STYLE[line.type];
                  return (
                    <div key={line.id} className="flex items-start gap-1.5 mb-px">
                      {s.badge && (
                        <span className="shrink-0 text-[9px] font-bold px-1 py-px rounded mt-0.5"
                          style={{ color: s.color, background: `${s.color}15`, minWidth: 28, textAlign: "center" }}>
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
              style={{ background: "#141210", borderTop: "1px solid #2a2218", minHeight: 44 }}>
              <div className="flex items-center px-3 select-none shrink-0 gap-1">
                <span className="text-base font-bold mono" style={{ color: "#0ea5e9" }}>›</span>
                {input === "" && (
                  <span className="inline-block w-1.5 h-3 rounded-sm ml-0.5"
                    style={{ background: "#0ea5e9", opacity: blink ? 0.7 : 0, transition: "opacity 0.1s" }} />
                )}
              </div>
              <input ref={inputRef} type="text" value={input}
                onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={wsStatus === "connected" ? "Enter command…" : "Not connected"}
                disabled={wsStatus !== "connected"}
                className="flex-1 bg-transparent outline-none py-3 font-mono text-[13px] disabled:opacity-40"
                style={{ color: "#d1d5db", caretColor: "transparent" }} />
              <button onClick={sendCommand} disabled={!input.trim() || wsStatus !== "connected"}
                className="px-4 py-3 text-xs font-bold shrink-0 transition-all hover:opacity-90 disabled:opacity-30"
                style={{ background: "#221d17", color: "#9ca3af", borderLeft: "1px solid #2a2218" }}>
                RUN
              </button>
            </div>
          </div>

          {/* ── AI Chat right panel ── */}
          <div className="hidden xl:flex flex-col shrink-0 rounded-xl overflow-hidden"
            style={{ width: 280, background: cardBg, border }}>

            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 shrink-0"
              style={{ borderBottom: "1px solid #2a2218", background: "#141210" }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(229,57,53,0.15)", border: "1px solid rgba(229,57,53,0.3)" }}>
                <Sparkles size={12} style={{ color: "#22c55e" }} />
              </div>
              <span className="text-xs font-semibold" style={{ color: labelText }}>NetherNodes AI</span>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: "rgba(229,57,53,0.1)", color: "#0ea5e9", border: "1px solid rgba(229,57,53,0.2)" }}>
                Beta
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2" style={{ minHeight: 0 }}>
              {aiMessages.length === 0 ? (
                <div className="text-center py-6">
                  <Sparkles size={22} className="mx-auto mb-3 opacity-20" style={{ color: "#0ea5e9" }} />
                  <p className="text-xs font-medium mb-1" style={{ color: labelText }}>NetherNodes AI</p>
                  <p className="text-[11px]" style={{ color: mutedText }}>Ask about your server, plugins, errors, or hosting.</p>
                  <div className="mt-4 space-y-1.5">
                    {["Why is my server lagging?", "How do I install Essentials?", "What does this error mean?"].map(q => (
                      <button key={q} onClick={() => { setAiInput(q); }}
                        className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] transition-all hover:brightness-110"
                        style={{ background: "#221d17", border: "1px solid #332a1f", color: labelText }}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : aiMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "user" ? (
                    <div className="max-w-[88%] rounded-xl px-3 py-2 text-[12px] leading-relaxed"
                      style={{ background: "#221d17", border: "1px solid #332a1f", color: "#d1d5db" }}>
                      {m.content}
                    </div>
                  ) : (
                    <div className="max-w-[96%] rounded-xl px-3 py-2.5 text-[12px]"
                      style={{ background: "#1a1612", border: "1px solid #2a2218", color: "#d1d5db" }}>
                      <AiMarkdown text={m.content} />
                    </div>
                  )}
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="rounded-xl px-3 py-2 flex items-center gap-1.5"
                    style={{ background: "#1a1612", border: "1px solid #2a2218" }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#94a3b8", animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#94a3b8", animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#94a3b8", animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={aiChatEndRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 p-3" style={{ borderTop: "1px solid #2a2218" }}>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: "#221d17", border: "1px solid #332a1f" }}>
                <input value={aiInput} onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendAiMessage()}
                  placeholder="Ask AI…"
                  className="flex-1 bg-transparent outline-none text-[12px]"
                  style={{ color: "#d1d5db" }} />
                <button onClick={sendAiMessage} disabled={!aiInput.trim() || aiLoading}
                  className="w-6 h-6 flex items-center justify-center rounded-lg transition-all hover:opacity-90 disabled:opacity-30 shrink-0"
                  style={{ background: "rgba(229,57,53,0.2)", border: "1px solid rgba(229,57,53,0.3)" }}>
                  <Send size={11} style={{ color: "#22c55e" }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ MODALS ══════════════════════════════════════════════════════ */}

      {/* Create Backup */}
      <Modal show={showBackup} onClose={() => !creatingBackup && setShowBackup(false)}>
        <ModalHeader icon={<HardDrive size={15} />} iconColor="#0ea5e9" title="Create Backup" sub="Snapshot your server now" onClose={() => setShowBackup(false)} />
        <input value={backupName} onChange={e => setBackupName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && createBackupNow()}
          placeholder={`Backup ${new Date().toLocaleDateString("en-IN")}`}
          className="w-full rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none mb-4"
          style={{ border: "1px solid #332a1f", color: "#f3f4f6" }} />
        {backupErr && <p className="text-xs mb-3" style={{ color: "#ef4444" }}>{backupErr}</p>}
        {backupMsg && <p className="text-xs mb-3" style={{ color: "#22c55e" }}>{backupMsg}</p>}
        <ModalActions onCancel={() => setShowBackup(false)} cancelDisabled={creatingBackup}
          onConfirm={createBackupNow} confirmDisabled={creatingBackup}
          confirmLabel={creatingBackup ? "Creating…" : "Create Backup"} confirmColor="#0ea5e9" loading={creatingBackup} />
      </Modal>

      {/* Whitelist */}
      <Modal show={showWhitelist} onClose={() => !wlAdding && setShowWhitelist(false)}>
        <ModalHeader icon={<List size={15} />} iconColor="#ef4444" title="Whitelist Player" sub="Add a Minecraft player" onClose={() => setShowWhitelist(false)} />
        <input value={wlPlayer} onChange={e => setWlPlayer(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addToWhitelist()}
          placeholder="e.g. Notch" autoFocus
          className="w-full rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none mono mb-3"
          style={{ border: "1px solid #332a1f", color: "#f3f4f6" }} />
        {wlErr && <p className="text-xs mb-3" style={{ color: "#ef4444" }}>{wlErr}</p>}
        {wlMsg && <p className="text-xs mb-3" style={{ color: "#22c55e" }}>{wlMsg}</p>}
        <ModalActions onCancel={() => setShowWhitelist(false)} cancelDisabled={wlAdding}
          onConfirm={addToWhitelist} confirmDisabled={wlAdding || !wlPlayer.trim()}
          confirmLabel={wlAdding ? "Adding…" : "Add Player"} confirmColor="#ef4444" loading={wlAdding} />
      </Modal>

      {/* Upload World */}
      <Modal show={showUploadWorld} onClose={() => !uploadingWorld && setShowUploadWorld(false)} maxW="max-w-md">
        <ModalHeader icon={<UploadCloud size={15} />} iconColor="#3b82f6" title="Upload World" sub="Upload a world folder or zip" onClose={() => setShowUploadWorld(false)} />
        <input ref={worldInputRef} type="file" className="hidden"
          accept=".zip,.tar,.gz,.rar,.7z,.json,.dat,.mca,.mcworld"
          onChange={e => { const f = e.target.files?.[0]; if (f) { setWorldFile(f); setUploadWorldErr(""); setUploadWorldMsg(""); } e.target.value = ""; }} />
        <div onClick={() => worldInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setWorldDragOver(true); }}
          onDragLeave={() => setWorldDragOver(false)}
          onDrop={e => { e.preventDefault(); setWorldDragOver(false); const f = e.dataTransfer.files[0]; if (f) { setWorldFile(f); setUploadWorldErr(""); setUploadWorldMsg(""); } }}
          className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-7 cursor-pointer mb-4 transition-all"
          style={{ borderColor: worldDragOver ? "#3b82f6" : worldFile ? "#22c55e40" : "#332a1f", background: worldDragOver ? "rgba(59,130,246,0.04)" : "rgba(255,255,255,0.02)" }}>
          {worldFile ? (
            <><Check size={20} className="mb-2" style={{ color: "#22c55e" }} />
              <p className="text-sm font-semibold" style={{ color: "#22c55e" }}>{worldFile.name}</p>
              <p className="text-[11px] mt-1" style={{ color: mutedText }}>{(worldFile.size/1048576).toFixed(2)} MB</p></>
          ) : (
            <><UploadCloud size={20} className="mb-2" style={{ color: worldDragOver ? "#3b82f6" : "#374151" }} />
              <p className="text-sm font-semibold" style={{ color: worldDragOver ? "#3b82f6" : mutedText }}>{worldDragOver ? "Drop it!" : "Click or drag & drop"}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "#374151" }}>Supports .zip, .dat, .mca, .mcworld</p></>
          )}
        </div>
        {uploadWorldErr && <p className="text-xs mb-3" style={{ color: "#ef4444" }}>{uploadWorldErr}</p>}
        {uploadWorldMsg && <p className="text-xs mb-3" style={{ color: "#22c55e" }}>{uploadWorldMsg}</p>}
        <ModalActions onCancel={() => setShowUploadWorld(false)} cancelDisabled={uploadingWorld}
          onConfirm={uploadWorld} confirmDisabled={!worldFile || uploadingWorld}
          confirmLabel={uploadingWorld ? "Uploading…" : "Upload World"} confirmColor="#3b82f6" loading={uploadingWorld} />
      </Modal>

      {/* Delete server */}
      <Modal show={showDelete} onClose={() => !deleting && setShowDelete(false)}>
        <ModalHeader icon={<Trash2 size={15} />} iconColor="#ef4444" title="Delete Server?" sub="This cannot be undone" onClose={() => setShowDelete(false)} />
        <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#fca5a5" }}>
          All files and data will be permanently deleted.
        </p>
        <label className="text-[11px] block mb-1.5" style={{ color: mutedText }}>
          Type <strong style={{ color: "#f3f4f6" }}>{server?.name}</strong> to confirm
        </label>
        <input type="text" value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && deleteInput === server?.name && deleteServer()}
          autoFocus placeholder={server?.name}
          className="w-full rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none mb-4 mono"
          style={{ border: "1px solid #332a1f", color: "#f3f4f6" }} />
        <ModalActions onCancel={() => setShowDelete(false)} cancelDisabled={deleting}
          onConfirm={deleteServer} confirmDisabled={deleting || deleteInput !== server?.name}
          confirmLabel={deleting ? "Deleting…" : "Delete Forever"} confirmColor="#ef4444" loading={deleting} />
      </Modal>

      {/* Custom hostname form (inline modal) */}
      <AnimatePresence>
        {showHnForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}
            onClick={() => !hnSubmitting && setShowHnForm(false)}>
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              className="rounded-2xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}
              style={{ background: "#1a1612", border: "1px solid #332a1f" }}>
              <ModalHeader icon={<Globe size={15} />} iconColor="#0ea5e9" title="Custom Domain" sub="Set a custom subdomain" onClose={() => setShowHnForm(false)} />
              {server?.hostname && !showHnForm ? (
                <div className="rounded-xl p-3 mb-4" style={{ background: "rgba(229,57,53,0.08)", border: "1px solid rgba(229,57,53,0.2)" }}>
                  <p className="text-xs" style={{ color: "#fcd34d" }}>{server.customAddress}</p>
                </div>
              ) : (
                <div className="mb-4">
                  <div className="flex items-center rounded-xl overflow-hidden mb-2"
                    style={{ background: "#221d17", border: "1px solid #332a1f" }}>
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
                      className="flex-1 bg-transparent outline-none px-3 py-2.5 text-sm min-w-0"
                      style={{ color: "#f3f4f6" }} />
                    {hnChecking && <Loader2 size={12} className="animate-spin mr-3" style={{ color: mutedText }} />}
                    {!hnChecking && hnAvail === true && <Check size={12} className="mr-3" style={{ color: "#22c55e" }} />}
                  </div>
                  {hnError && <p className="text-[11px]" style={{ color: "#ef4444" }}>{hnError}</p>}
                </div>
              )}
              <ModalActions onCancel={() => { setShowHnForm(false); setHnError(""); }} cancelDisabled={hnSubmitting}
                onConfirm={async () => {
                  setHnSubmitting(true); setHnError("");
                  try {
                    const method = server?.hostname ? "PUT" : "POST";
                    const r = await apiFetch(`/api/servers/${id}/hostname`, {
                      method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
                      body: JSON.stringify({ name: hnEdit }),
                    });
                    let d: any = {}; try { d = await r.json(); } catch {}
                    if (!r.ok) { setHnError(d.error || "Failed."); return; }
                    setServer(p => p ? { ...p, hostname: d.hostname, hostnameStatus: d.hostnameStatus, customAddress: d.customAddress } : p);
                    setShowHnForm(false);
                  } catch (err: any) { setHnError(err?.message || "Network error."); }
                  finally { setHnSubmitting(false); }
                }}
                confirmDisabled={hnSubmitting || !hnAvail || hnEdit.length < 3}
                confirmLabel={hnSubmitting ? "Saving…" : "Save"} confirmColor="#0ea5e9" loading={hnSubmitting} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

function PowerBtn({ label, signal, icon: Icon, color, disabled, loading, onPower, variant = "default" }: {
  label: string; signal: "start"|"stop"|"restart"|"kill"; icon: any;
  color: string; disabled: boolean; loading: boolean;
  onPower: (s: "start"|"stop"|"restart"|"kill") => void;
  variant?: "default"|"ghost";
}) {
  return (
    <button
      onClick={() => onPower(signal)}
      disabled={disabled || loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-30"
      style={variant === "ghost"
        ? { background: "transparent", color: "#6b7280", border: "1px solid #332a1f" }
        : { background: `${color}15`, color, border: `1px solid ${color}30` }}>
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
      {label}
    </button>
  );
}

function SidebarContent({ id, server, sendPower, powerLoading, setShowDelete, setDeleteInput, onClose }: {
  id: string; server: ServerData | null;
  sendPower: (s: "start"|"stop"|"restart"|"kill") => void; powerLoading: string | null;
  setShowDelete: (v: boolean) => void; setDeleteInput: (v: string) => void;
  onClose?: () => void;
}) {
  const { pathname } = { pathname: window.location.pathname };
  const st = STATUS_MAP[server?.status ?? ""] ?? STATUS_MAP.stopped;
  const isRunning = server?.status === "running";

  return (
    <div className="flex flex-col h-full">
      {/* Back */}
      <Link to="/dashboard" onClick={onClose}
        className="flex items-center gap-2 mb-5 px-1 text-xs transition-colors"
        style={{ color: "#6b7280" }}
        onMouseEnter={e => (e.currentTarget.style.color = "#9ca3af")}
        onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}>
        <ArrowLeft size={12} /> Back to Dashboard
      </Link>

      {/* Server card */}
      <div className="mb-5 rounded-xl p-3" style={{ background: "#1a1a1d", border: "1px solid #332a1f" }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
            style={{ background: "#2a2218", border: "1px solid #332a1f", color: "#f3f4f6" }}>
            {server?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate" style={{ color: "#f3f4f6" }}>{server?.name}</p>
            <p className="text-[10px]" style={{ color: "#6b7280" }}>{server?.plan} plan</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg mb-3"
          style={{ background: "#2a2218", border: "1px solid #332a1f" }}>
          <span className={`w-2 h-2 rounded-full ${isRunning ? "animate-pulse" : ""}`} style={{ background: st.color }} />
          <span className="text-[11px] font-semibold" style={{ color: st.color }}>{st.label}</span>
          <span className="ml-auto text-[10px]" style={{ color: "#6b7280" }}>{server?.ram}</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: "Start", signal: "start" as const, icon: Play,      color: "#22c55e", disabled: isRunning || server?.status === "starting" },
            { label: "Restart", signal: "restart" as const, icon: RotateCcw, color: "#0ea5e9", disabled: !isRunning },
            { label: "Stop",  signal: "stop" as const,  icon: Square,    color: "#ef4444", disabled: !isRunning },
          ].map(btn => (
            <button key={btn.label}
              onClick={() => sendPower(btn.signal)} disabled={btn.disabled || !!powerLoading}
              className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-[9px] font-semibold transition-all disabled:opacity-25"
              style={{ background: `${btn.color}10`, border: `1px solid ${btn.color}22`, color: btn.color }}>
              {powerLoading === btn.signal
                ? <Loader2 size={13} className="animate-spin" style={{ color: btn.color }} />
                : <btn.icon size={13} style={{ color: btn.color }} />}
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {NAV.map(section => (
          <div key={section.section}>
            <p className="text-[9px] font-semibold uppercase tracking-widest px-2 mb-1" style={{ color: "#4b5563" }}>
              {section.section}
            </p>
            {section.items.map(item => {
              const href   = `/server/${id}/${item.to}`;
              const active = pathname === href || (item.to === "console" && pathname === `/server/${id}/console`);
              return (
                <Link key={item.label} to={href} onClick={onClose}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all mb-0.5"
                  style={{
                    background: active ? "#2a2218" : "transparent",
                    color: active ? "#f3f4f6" : "#6b7280",
                    border: active ? "1px solid #332a1f" : "1px solid transparent",
                  }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "#1a1a1d"; (e.currentTarget as HTMLElement).style.color = "#9ca3af"; }}}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#6b7280"; }}}>
                  <item.icon size={13} /> {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Delete */}
      <div className="mt-3 pt-3" style={{ borderTop: "1px solid #221d17" }}>
        <button onClick={() => { setShowDelete(true); setDeleteInput(""); onClose?.(); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors hover:opacity-80"
          style={{ color: "#ef4444", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.14)" }}>
          <Trash2 size={11} /> Delete Server
        </button>
      </div>
    </div>
  );
}

/* ─── Modal helpers ──────────────────────────────────────────────────── */

function Modal({ show, onClose, children, maxW = "max-w-sm" }: {
  show: boolean; onClose: () => void; children: React.ReactNode; maxW?: string;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}
          onClick={onClose}>
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`rounded-2xl p-5 w-full ${maxW}`} onClick={e => e.stopPropagation()}
            style={{ background: "#1a1612", border: "1px solid #332a1f" }}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ModalHeader({ icon, iconColor, title, sub, onClose }: {
  icon: React.ReactNode; iconColor: string; title: string; sub: string; onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${iconColor}12`, border: `1px solid ${iconColor}25` }}>
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold" style={{ color: "#f3f4f6" }}>{title}</p>
        <p className="text-[11px]" style={{ color: "#6b7280" }}>{sub}</p>
      </div>
      <button onClick={onClose} style={{ color: "#4b5563" }}><X size={14} /></button>
    </div>
  );
}

function ModalActions({ onCancel, cancelDisabled, onConfirm, confirmDisabled, confirmLabel, confirmColor, loading }: {
  onCancel: () => void; cancelDisabled: boolean;
  onConfirm: () => void; confirmDisabled: boolean;
  confirmLabel: string; confirmColor: string; loading: boolean;
}) {
  return (
    <div className="flex gap-2">
      <button onClick={onCancel} disabled={cancelDisabled}
        className="flex-1 h-9 rounded-xl text-xs disabled:opacity-40"
        style={{ border: "1px solid #332a1f", color: "#6b7280" }}>Cancel</button>
      <button onClick={onConfirm} disabled={confirmDisabled}
        className="flex-1 h-9 flex items-center justify-center gap-2 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-30"
        style={{ background: `${confirmColor}20`, color: confirmColor, border: `1px solid ${confirmColor}30` }}>
        {loading && <Loader2 size={12} className="animate-spin" />}
        {confirmLabel}
      </button>
    </div>
  );
}

/* ─── AI Markdown Renderer ───────────────────────────────────────────────────
 * Renders the AI response with proper formatting:
 * - ## Heading  → bold section header
 * - **bold**    → bold
 * - `code`      → inline code
 * - - bullet    → bullet list item
 * - 1. item     → numbered list item
 * - blank line  → paragraph break
 */
function AiMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const els: React.ReactNode[] = [];
  let i = 0;

  const renderInline = (s: string): React.ReactNode => {
    // Split on **bold** and `code` patterns
    const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((p, idx) => {
      if (p.startsWith("**") && p.endsWith("**"))
        return <strong key={idx} style={{ color: "#f3f4f6", fontWeight: 600 }}>{p.slice(2, -2)}</strong>;
      if (p.startsWith("`") && p.endsWith("`"))
        return (
          <code key={idx} className="font-mono text-[11px] px-1 py-0.5 rounded"
            style={{ background: "#2a2218", color: "#22c55e" }}>
            {p.slice(1, -1)}
          </code>
        );
      return p;
    });
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line — small spacer
    if (!trimmed) { els.push(<div key={i} className="h-2" />); i++; continue; }

    // Heading ## or ###
    if (/^#{1,3}\s/.test(trimmed)) {
      const text2 = trimmed.replace(/^#+\s/, "");
      els.push(
        <p key={i} className="text-[12px] font-bold mt-2 mb-1" style={{ color: "#f3f4f6" }}>
          {renderInline(text2)}
        </p>
      );
      i++; continue;
    }

    // Bullet list — collect consecutive bullets
    if (/^[-*•]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s/, ""));
        i++;
      }
      els.push(
        <ul key={`ul-${i}`} className="space-y-1 my-1.5 ml-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-[12px]" style={{ color: "#c9c0b5" }}>
              <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: "#4b5563" }} />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list — collect consecutive
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = [];
      let n = 1;
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ""));
        i++;
      }
      els.push(
        <ol key={`ol-${i}`} className="space-y-1 my-1.5 ml-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-[12px]" style={{ color: "#c9c0b5" }}>
              <span className="text-[10px] font-bold shrink-0 mt-0.5" style={{ color: "#6b7280", minWidth: 14 }}>{idx + 1}.</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Horizontal rule ---
    if (/^---+$/.test(trimmed)) {
      els.push(<hr key={i} className="my-2" style={{ borderColor: "#2a2218" }} />);
      i++; continue;
    }

    // Regular paragraph line
    els.push(
      <p key={i} className="text-[12px] leading-relaxed" style={{ color: "#c9c0b5" }}>
        {renderInline(trimmed)}
      </p>
    );
    i++;
  }

  return <div className="space-y-0.5">{els}</div>;
}
