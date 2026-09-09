import { Link, useLocation } from "react-router-dom";
import {
  Terminal, FolderOpen, Users, ArrowLeft,
  Play, Square, RotateCcw, Loader2, Package, Settings2,
  Calendar, HardDrive, List,
} from "lucide-react";

interface ServerData {
  id: string;
  name: string;
  status: string;
  plan: string;
  ram: string;
  cpu: string;
  ssd?: string;
  host?: string;
  customAddress?: string | null;
}

interface Props {
  server: ServerData;
  onPower: (signal: "start" | "stop" | "restart" | "kill") => void;
  powerLoading: string | null;
}

const STATUS_CFG: Record<string, { color: string; dot: string; label: string }> = {
  running:    { color: "#4ade80", dot: "#22c55e", label: "Online" },
  stopped:    { color: "#64748b", dot: "#475569", label: "Offline" },
  starting:   { color: "#fbbf24", dot: "#f59e0b", label: "Starting" },
  stopping:   { color: "#fbbf24", dot: "#f59e0b", label: "Stopping" },
  installing: { color: "#60a5fa", dot: "#3b82f6", label: "Installing" },
  suspended:  { color: "#f87171", dot: "#ef4444", label: "Suspended" },
  unknown:    { color: "#64748b", dot: "#475569", label: "Unknown" },
};

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { to: "console",   icon: Terminal,   label: "Console" },
    ],
  },
  {
    label: "Management",
    items: [
      { to: "files",     icon: FolderOpen, label: "Files" },
      { to: "installer", icon: Package,    label: "Plugins & Mods" },
      { to: "version",   icon: Settings2,  label: "Version" },
      { to: "users",     icon: Users,      label: "Users" },
    ],
  },
  {
    label: "Tools",
    items: [
      { to: "schedules", icon: Calendar,   label: "Schedules" },
      { to: "backups",   icon: HardDrive,  label: "Backups" },
      { to: "whitelist", icon: List,       label: "Whitelist" },
    ],
  },
];

export default function ServerSidebar({ server, onPower, powerLoading }: Props) {
  const { pathname } = useLocation();
  const base = `/server/${server.id}`;

  const isRunning = server.status === "running";
  const isStopped = server.status === "stopped";
  const isBusy    = server.status === "starting" || server.status === "stopping";
  const cfg       = STATUS_CFG[server.status] ?? STATUS_CFG.unknown;

  return (
    <aside className="flex flex-col h-full select-none" style={{ width: 204, minWidth: 204 }}>

      {/* ── Back link ── */}
      <Link to="/dashboard"
        className="flex items-center gap-2 mb-5 px-1 text-xs font-medium transition-colors"
        style={{ color: "#475569" }}
        onMouseEnter={e => (e.currentTarget.style.color = "#94a3b8")}
        onMouseLeave={e => (e.currentTarget.style.color = "#475569")}>
        <ArrowLeft size={12} /> Back to Dashboard
      </Link>

      {/* ── Server identity card ── */}
      <div className="mb-5 rounded-xl p-3 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(59,130,246,0.04) 100%)",
          border: "1px solid rgba(139,92,246,0.18)",
        }}>
        {/* subtle glow blob */}
        <div className="absolute -top-4 -left-4 w-16 h-16 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${cfg.color}30 0%, transparent 70%)` }} />

        <div className="relative flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: `linear-gradient(135deg, ${cfg.color}18, ${cfg.color}08)`,
              border: `1px solid ${cfg.color}30`,
            }}>
            <Terminal size={13} style={{ color: cfg.color }} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate" style={{ color: "#f1f5f9" }}>{server.name}</p>
            <p className="text-[10px] mono" style={{ color: "#475569" }}>{server.plan} plan</p>
          </div>
        </div>

        {/* Status pill */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg mb-3"
          style={{ background: `${cfg.color}0d`, border: `1px solid ${cfg.color}20` }}>
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            {isRunning && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: cfg.dot }} />
            )}
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: cfg.dot }} />
          </span>
          <span className="text-[10px] font-semibold mono" style={{ color: cfg.color }}>{cfg.label}</span>
          <span className="ml-auto text-[9px] mono" style={{ color: "#334155" }}>{server.ram} RAM</span>
        </div>

        {/* ── Power controls — inside the card, always visible ── */}
        <div className="relative grid grid-cols-3 gap-1.5">
          <button
            onClick={() => onPower("start")}
            disabled={!!powerLoading || isRunning || isBusy}
            title="Start server"
            className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl font-semibold transition-all disabled:opacity-25 disabled:cursor-not-allowed"
            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.22)" }}
            onMouseEnter={e => { if (!e.currentTarget.disabled) (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.1)"; }}>
            {powerLoading === "start"
              ? <Loader2 size={14} className="animate-spin" style={{ color: "#4ade80" }} />
              : <Play size={14} style={{ color: "#4ade80" }} />}
            <span className="text-[9px] mono uppercase tracking-wider" style={{ color: "#4ade80" }}>Start</span>
          </button>

          <button
            onClick={() => onPower("restart")}
            disabled={!!powerLoading || !isRunning}
            title="Restart server"
            className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl font-semibold transition-all disabled:opacity-25 disabled:cursor-not-allowed"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}
            onMouseEnter={e => { if (!e.currentTarget.disabled) (e.currentTarget as HTMLElement).style.background = "rgba(251,191,36,0.18)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(251,191,36,0.08)"; }}>
            {powerLoading === "restart"
              ? <Loader2 size={14} className="animate-spin" style={{ color: "#fbbf24" }} />
              : <RotateCcw size={14} style={{ color: "#fbbf24" }} />}
            <span className="text-[9px] mono uppercase tracking-wider" style={{ color: "#fbbf24" }}>Restart</span>
          </button>

          <button
            onClick={() => onPower("stop")}
            disabled={!!powerLoading || isStopped || isBusy}
            title="Stop server"
            className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl font-semibold transition-all disabled:opacity-25 disabled:cursor-not-allowed"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
            onMouseEnter={e => { if (!e.currentTarget.disabled) (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.18)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"; }}>
            {powerLoading === "stop"
              ? <Loader2 size={14} className="animate-spin" style={{ color: "#f87171" }} />
              : <Square size={14} style={{ color: "#f87171" }} />}
            <span className="text-[9px] mono uppercase tracking-wider" style={{ color: "#f87171" }}>Stop</span>
          </button>
        </div>
      </div>

      {/* ── Nav sections ── */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-0.5">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <p className="text-[9px] mono uppercase tracking-widest font-semibold px-2 mb-1"
              style={{ color: "#334155" }}>
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(item => {
                const href   = `${base}/${item.to}`;
                const active = pathname === href;
                return (
                  <Link key={item.to} to={href}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: active
                        ? "linear-gradient(90deg, rgba(139,92,246,0.18), rgba(139,92,246,0.06))"
                        : "transparent",
                      color:  active ? "#c4b5fd" : "#64748b",
                      border: active ? "1px solid rgba(139,92,246,0.25)" : "1px solid transparent",
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                        (e.currentTarget as HTMLElement).style.color = "#94a3b8";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                        (e.currentTarget as HTMLElement).style.color = "#64748b";
                      }
                    }}>
                    <item.icon size={13} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

    </aside>
  );
}
