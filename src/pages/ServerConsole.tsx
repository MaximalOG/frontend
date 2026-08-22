import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, AlertCircle, Wifi, WifiOff, Check, Copy,
  MemoryStick, Cpu, HardDrive, Globe, Edit3, X, Trash2, Zap,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import ServerSidebar from "@/components/ServerSidebar";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

interface ServerData {
  id: string; name: string; status: string;
  ram: string; cpu: string; ssd?: string;
  plan: string; host?: string;
  serverType?: string; mcVersion?: string;
  pendingSetup?: boolean;
  hostname?: string | null;
  hostnameStatus?: string | null;
  customAddress?: string | null;
}

interface LogLine {
  id: number; text: string;
  type: "info" | "warn" | "error" | "success" | "input" | "system";
}

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
  if (t.includes("done") || t.includes("started") || t.includes("ready") || t.includes("running") || t.includes("loaded") || t.includes("finished") || t.includes("connected to console")) return "success";
  return "info";
}

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
  const [wsStatus, setWsStatus]           = useState<"disconnected"|"connecting"|"connected"|"error">("disconnected");
  const [powerLoading, setPowerLoading]   = useState<string | null>(null);
  const [copied, setCopied]               = useState(false);
  const [autoScroll, setAutoScroll]       = useState(true);

  // Delete state
  const [showDelete, setShowDelete]   = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting]       = useState(false);

  // Hostname state
  const [showHnForm, setShowHnForm]     = useState(false);
  const [hnEdit, setHnEdit]             = useState("");
  const [hnChecking, setHnChecking]     = useState(false);
  const [hnAvail, setHnAvail]           = useState<null|boolean>(null);
  const [hnSubmitting, setHnSubmitting] = useState(false);
  const [hnError, setHnError]           = useState("");

  const wsRef   = useRef<WebSocket | null>(null);
  const logsRef = useRef<HTMLDivElement>(null);
  const logsEnd = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (autoScroll) logsEnd.current?.scrollIntoView({ behavior: "auto" });
  }, [logs, autoScroll]);

  const handleScroll = () => {
    const el = logsRef.current;
    if (!el) return;
    setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
  };

  const connect = useCallback(async () => {
    if (!id || wsRef.current?.readyState === WebSocket.OPEN) return;
    setWsStatus("connecting");
    addLog(`[${now()}] Connecting to NetherNodes console…`, "system");
    try {
      const res = await apiFetch(`/api/servers/${id}/console-token`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) { const e = await res.json(); addLog(`[${now()}] Failed: ${e.error}`, "error"); setWsStatus("error"); return; }
      const { token: wsToken, socket: wsUrl } = await res.json();
      if (!wsToken || !wsUrl) { addLog(`[${now()}] Console unavailable.`, "error"); setWsStatus("error"); return; }
      tokenRef.current = wsToken;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => ws.send(JSON.stringify({ event: "auth", args: [wsToken] }));
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          switch (msg.event) {
            case "auth success": setWsStatus("connected"); addLog(`[${now()}] ✓ Connected`, "success"); break;
            case "token expiring":
              (async () => {
                try {
                  const r = await apiFetch(`/api/servers/${id}/console-token`, { headers: { Authorization: `Bearer ${token()}` } });
                  if (r.ok) { const { token: t } = await r.json(); tokenRef.current = t; ws.send(JSON.stringify({ event: "auth", args: [t] })); }
                } catch {}
              })();
              break;
            case "token expired": addLog(`[${now()}] Session expired.`, "warn"); ws.close(); setTimeout(connect, 1500); break;
            case "console output":
              if (Array.isArray(msg.args)) msg.args.forEach((raw: string) => { const l = processLine(raw); if (l) addLog(l, classifyLine(l)); });
              break;
            case "status": if (msg.args?.[0]) setServer(p => p ? { ...p, status: msg.args[0] } : p); break;
          }
        } catch {}
      };
      ws.onerror = () => { setWsStatus("error"); addLog(`[${now()}] Connection error.`, "error"); };
      ws.onclose = (e) => { setWsStatus("disconnected"); if (e.code !== 1000) addLog(`[${now()}] Disconnected (${e.code}).`, "warn"); };
    } catch (err: any) { addLog(`[${now()}] Failed: ${err?.message}`, "error"); setWsStatus("error"); }
  }, [id, token, addLog]);

  useEffect(() => {
    if (server && !server.pendingSetup) connect();
    return () => { wsRef.current?.close(1000); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server?.id]);

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
    if (e.key === "ArrowUp") { e.preventDefault(); const n = Math.min(histIdx+1,history.length-1); setHistIdx(n); setInput(history[n]??""); }
    if (e.key === "ArrowDown") { e.preventDefault(); const n = Math.max(histIdx-1,-1); setHistIdx(n); setInput(n===-1?"":history[n]??""); }
  };

  const sendPower = async (signal: "start"|"stop"|"restart"|"kill") => {
    setPowerLoading(signal);
    try {
      const res = await apiFetch(`/api/servers/${id}/power`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ signal }),
      });
      const data = await res.json();
      if (res.ok) addLog(`[${now()}] Power signal "${signal}" sent.`, "success");
      else addLog(`[${now()}] Power error: ${data.error}`, "error");
    } catch { addLog(`[${now()}] Network error.`, "error"); }
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

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex flex-1 overflow-hidden" style={{ paddingTop: 64 }}>

        {/* ── Left Sidebar ── */}
        <div className="hidden md:flex flex-col h-[calc(100vh-64px)] sticky top-16 px-4 py-5 overflow-y-auto"
          style={{ width: 236, borderRight: "1px solid hsl(0 0% 12%)", background: "hsl(0 0% 4.5%)" }}>
          {server && (
            <ServerSidebar server={server} onPower={sendPower} powerLoading={powerLoading} />
          )}

          {/* Delete — at very bottom of sidebar */}
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid hsl(0 0% 12%)" }}>
            <button onClick={() => { setShowDelete(true); setDeleteInput(""); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-sm text-xs transition-all hover:brightness-110"
              style={{ color: "hsl(350 85% 45%)", background: "hsl(350 85% 5%)", border: "1px solid hsl(350 85% 16%)" }}>
              <Trash2 size={12} /> Delete Server
            </button>
          </div>
        </div>

        {/* ── Main area ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Console */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0"
              style={{ borderBottom: "1px solid hsl(0 0% 12%)", background: "hsl(0 0% 5%)" }}>
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: "hsl(0 70% 50%)" }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: "hsl(38 90% 55%)" }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: "hsl(142 60% 45%)" }} />
                </div>
                <span className="text-xs text-muted-foreground/50 mono">{server?.name} — console</span>
              </div>
              <div className="flex items-center gap-3">
                {!autoScroll && (
                  <button onClick={() => { setAutoScroll(true); logsEnd.current?.scrollIntoView({ behavior: "smooth" }); }}
                    className="text-[10px] text-primary/60 hover:text-primary mono">↓ bottom</button>
                )}
                {wsStatus === "connected"
                  ? <span className="flex items-center gap-1.5 text-[10px] text-green-400"><Wifi size={10} /> Live</span>
                  : wsStatus === "connecting"
                  ? <span className="flex items-center gap-1.5 text-[10px] text-yellow-400"><Loader2 size={10} className="animate-spin" /> Connecting…</span>
                  : <button onClick={connect} className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40 hover:text-primary transition-colors">
                      <WifiOff size={10} /> Reconnect
                    </button>
                }
              </div>
            </div>

            {/* Log output */}
            <div ref={logsRef} onScroll={handleScroll} onClick={() => inputRef.current?.focus()}
              className="flex-1 overflow-y-auto font-mono text-[11.5px] leading-[1.7] cursor-text"
              style={{ background: "hsl(0 0% 3%)", padding: "16px 18px" }}>
              <div className="mb-3 pb-3 select-none" style={{ borderBottom: "1px solid hsl(0 0% 9%)" }}>
                <span style={{ color: "hsl(350 85% 50%)" }} className="font-bold">NetherNodes</span>
                <span className="text-muted-foreground/25"> — Minecraft Server Console</span>
                <br />
                <span className="text-muted-foreground/20 text-[10px]">{server?.plan} plan · {server?.ram}</span>
              </div>
              {logs.length === 0
                ? <span className="text-muted-foreground/20 select-none">Waiting for output…</span>
                : logs.map(line => {
                    const color = line.type==="error" ? "hsl(350 85% 60%)" : line.type==="warn" ? "hsl(38 90% 58%)" : line.type==="success" ? "hsl(142 65% 50%)" : line.type==="input" ? "hsl(210 80% 65%)" : line.type==="system" ? "hsl(270 60% 65%)" : "hsl(0 0% 75%)";
                    return <div key={line.id} className="whitespace-pre-wrap break-all" style={{ color }}>{line.text}</div>;
                  })
              }
              <div ref={logsEnd} />
            </div>

            {/* Input */}
            <div className="flex items-center shrink-0"
              style={{ borderTop: "1px solid hsl(0 0% 10%)", background: "hsl(0 0% 4.5%)" }}>
              <span className="px-4 text-primary font-bold mono select-none">›</span>
              <input ref={inputRef} type="text" value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={wsStatus === "connected" ? "Type a command and press Enter…" : "Not connected"}
                disabled={wsStatus !== "connected"}
                className="flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground/20 outline-none py-3 mono"
              />
              <button onClick={sendCommand} disabled={!input.trim() || wsStatus !== "connected"}
                className="px-5 py-3 text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-30"
                style={{ background: "hsl(350 85% 42%)", color: "white", borderLeft: "1px solid hsl(350 85% 28%)" }}>
                Send
              </button>
            </div>
          </div>

          {/* ── Right stats panel ── */}
          <div className="hidden lg:flex flex-col gap-3 p-4 overflow-y-auto shrink-0"
            style={{ width: 220, borderLeft: "1px solid hsl(0 0% 12%)", background: "hsl(0 0% 4.5%)" }}>

            {/* Address */}
            <div className="rounded-sm p-3" style={{ background: "hsl(0 0% 7%)", border: "1px solid hsl(0 0% 14%)" }}>
              <p className="text-[9px] mono uppercase tracking-wider text-muted-foreground/40 mb-2">Address</p>
              {server?.customAddress ? (
                <button onClick={() => copyAddress(server.customAddress!)}
                  className="w-full text-left flex items-center justify-between gap-1 text-[11px] mono transition-colors group">
                  <span className="text-green-300/80 group-hover:text-green-300 truncate">{server.customAddress}</span>
                  {copied ? <Check size={10} className="text-green-400 shrink-0" /> : <Copy size={10} className="opacity-30 group-hover:opacity-80 shrink-0" />}
                </button>
              ) : server?.host ? (
                <button onClick={() => copyAddress(server.host!)}
                  className="w-full text-left flex items-center justify-between gap-1 text-[11px] mono text-muted-foreground/60 hover:text-foreground transition-colors">
                  <span className="truncate">{server.host}</span>
                  {copied ? <Check size={10} className="text-green-400 shrink-0" /> : <Copy size={10} className="opacity-30 shrink-0" />}
                </button>
              ) : (
                <span className="text-[10px] text-muted-foreground/30">Not assigned yet</span>
              )}
            </div>

            {/* Stats */}
            {[
              { icon: MemoryStick, label: "Memory",  value: server?.ram,  color: "hsl(270 60% 55%)" },
              { icon: Cpu,         label: "CPU",      value: server?.cpu,  color: "hsl(38 90% 55%)" },
              { icon: HardDrive,   label: "Disk",     value: server?.ssd,  color: "hsl(200 70% 55%)" },
            ].filter(s => s.value).map(stat => (
              <div key={stat.label} className="rounded-sm p-3"
                style={{ background: "hsl(0 0% 7%)", border: "1px solid hsl(0 0% 14%)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-sm flex items-center justify-center shrink-0"
                    style={{ background: `${stat.color}20` }}>
                    <stat.icon size={12} style={{ color: stat.color }} />
                  </div>
                  <span className="text-[9px] mono uppercase tracking-wider text-muted-foreground/40">{stat.label}</span>
                </div>
                <p className="text-sm font-bold text-foreground ml-8">{stat.value}</p>
              </div>
            ))}

            {/* Server info */}
            <div className="rounded-sm p-3" style={{ background: "hsl(0 0% 7%)", border: "1px solid hsl(0 0% 14%)" }}>
              <p className="text-[9px] mono uppercase tracking-wider text-muted-foreground/40 mb-2">Server</p>
              {[
                { label: "Type",    value: server?.serverType },
                { label: "Version", value: server?.mcVersion },
                { label: "Plan",    value: server?.plan },
              ].filter(r => r.value).map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="text-muted-foreground/40">{label}</span>
                  <span className="text-foreground/80 mono">{value}</span>
                </div>
              ))}
            </div>

            {/* Custom address card */}
            <div className="rounded-sm p-3" style={{ background: "hsl(0 0% 7%)", border: "1px solid hsl(0 0% 14%)" }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] mono uppercase tracking-wider text-muted-foreground/40">Custom Address</p>
                {server?.hostname && !showHnForm && (
                  <button onClick={() => { setShowHnForm(true); setHnEdit(server.hostname ?? ""); setHnAvail(null); setHnError(""); }}
                    className="text-muted-foreground/30 hover:text-primary transition-colors">
                    <Edit3 size={10} />
                  </button>
                )}
              </div>
              {server?.hostname && !showHnForm ? (
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${server.hostnameStatus==="active" ? "bg-green-400" : "bg-yellow-400"}`} />
                    <span className="text-[9px] text-muted-foreground/40">{server.hostnameStatus==="active"?"Active":"Activating…"}</span>
                  </div>
                  <p className="text-[11px] mono text-foreground/80 break-all">{server.customAddress}</p>
                </div>
              ) : showHnForm ? (
                <div className="space-y-2">
                  <div className="flex rounded-sm overflow-hidden" style={{ border: "1px solid hsl(0 0% 20%)" }}>
                    <input type="text" value={hnEdit}
                      onChange={e => {
                        const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,32);
                        setHnEdit(v); setHnAvail(null);
                        if (v.length>=3) { clearTimeout((window as any)._hn2); (window as any)._hn2 = setTimeout(async()=>{ setHnChecking(true); try { const r=await apiFetch(`/api/hostnames/check?name=${encodeURIComponent(v)}`); const d=await r.json(); setHnAvail(d.available); setHnError(d.available?"":(d.reason||"Not available")); } catch{setHnAvail(null);} finally{setHnChecking(false);} },500); }
                      }}
                      placeholder="yourname"
                      className="flex-1 bg-transparent text-[11px] text-foreground outline-none px-2 py-1.5 mono min-w-0"
                    />
                    {hnChecking && <Loader2 size={10} className="animate-spin self-center mr-2 text-muted-foreground/40" />}
                    {!hnChecking && hnAvail===true && <Check size={10} className="self-center mr-2 text-green-400" />}
                  </div>
                  {hnError && <p className="text-[9px]" style={{ color:"hsl(350 85% 60%)" }}>{hnError}</p>}
                  <div className="flex gap-1.5">
                    <button onClick={()=>{setShowHnForm(false);setHnError("");}} className="flex-1 h-7 rounded-sm text-[10px] text-muted-foreground" style={{border:"1px solid hsl(0 0% 18%)"}}>Cancel</button>
                    <button disabled={hnSubmitting||!hnAvail||hnEdit.length<3} onClick={async()=>{ setHnSubmitting(true); setHnError(""); try{ const method=server?.hostname?"PUT":"POST"; const r=await apiFetch(`/api/servers/${id}/hostname`,{method,headers:{"Content-Type":"application/json",Authorization:`Bearer ${token()}`},body:JSON.stringify({name:hnEdit})}); const d=await r.json(); if(!r.ok){setHnError(d.error||"Failed.");return;} setServer(p=>p?{...p,hostname:d.hostname,hostnameStatus:d.hostnameStatus,customAddress:d.customAddress}:p); setShowHnForm(false); }catch{setHnError("Network error.");} finally{setHnSubmitting(false);} }}
                      className="flex-1 h-7 rounded-sm text-[10px] font-semibold disabled:opacity-30 hover:brightness-110" style={{background:"hsl(350 85% 45%)",color:"white"}}>
                      {hnSubmitting?<Loader2 size={10} className="animate-spin mx-auto"/>:"Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={()=>{setShowHnForm(true);setHnEdit("");setHnAvail(null);setHnError("");}}
                  className="w-full h-7 flex items-center justify-center gap-1.5 rounded-sm text-[10px] font-medium hover:brightness-110"
                  style={{background:"hsl(350 85% 10%)",color:"hsl(350 85% 55%)",border:"1px solid hsl(350 85% 20%)"}}>
                  <Globe size={10}/> Set Custom Address
                </button>
              )}
            </div>

            <p className="text-[9px] text-muted-foreground/20 text-center">↑↓ arrow keys for command history</p>
          </div>
        </div>
      </div>

      {/* Delete modal */}
      <AnimatePresence>
        {showDelete && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{background:"rgba(0,0,0,0.8)",backdropFilter:"blur(4px)"}}
            onClick={()=>!deleting&&setShowDelete(false)}>
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.95,opacity:0}}
              className="rounded-sm p-6 max-w-sm w-full"
              style={{background:"hsl(0 0% 8%)",border:"1px solid hsl(350 85% 35%)"}}
              onClick={e=>e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-sm flex items-center justify-center shrink-0" style={{background:"hsl(350 85% 12%)",border:"1px solid hsl(350 85% 30%)"}}>
                  <Trash2 size={18} className="text-primary"/>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Delete server?</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">Permanently destroys <span className="text-foreground font-medium">{server?.name}</span></p>
                </div>
              </div>
              <div className="rounded-sm px-3 py-2 mb-4 text-xs" style={{background:"hsl(350 85% 6%)",border:"1px solid hsl(350 85% 18%)",color:"hsl(350 85% 60%)"}}>
                ⚠ This cannot be undone. All files and data will be lost.
              </div>
              <label className="text-[9px] mono uppercase tracking-wider text-muted-foreground/50 block mb-1.5">
                Type <span className="text-foreground font-bold">{server?.name}</span> to confirm
              </label>
              <input type="text" value={deleteInput} onChange={e=>setDeleteInput(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&deleteInput===server?.name&&deleteServer()}
                autoFocus placeholder={server?.name}
                className="w-full rounded-sm px-3 py-2 text-sm text-foreground bg-transparent outline-none mb-4 mono"
                style={{border:"1px solid hsl(0 0% 22%)"}}/>
              <div className="flex gap-3">
                <button onClick={()=>setShowDelete(false)} disabled={deleting}
                  className="flex-1 h-9 rounded-sm text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                  style={{border:"1px solid hsl(0 0% 20%)"}}>Cancel</button>
                <button onClick={deleteServer} disabled={deleting||deleteInput!==server?.name}
                  className="flex-1 h-9 flex items-center justify-center gap-2 rounded-sm text-xs font-semibold hover:brightness-110 disabled:opacity-30"
                  style={{background:"hsl(350 85% 40%)",color:"white"}}>
                  {deleting?<Loader2 size={12} className="animate-spin"/>:<Trash2 size={12}/>}
                  {deleting?"Deleting…":"Delete Forever"}
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
