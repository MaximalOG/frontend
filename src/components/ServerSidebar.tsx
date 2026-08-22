import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Terminal, FolderOpen, Users, ArrowLeft,
  Play, Square, RotateCcw, Zap, Loader2,
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

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { to: "console", icon: Terminal,  label: "Console" },
    ],
  },
  {
    label: "Management",
    items: [
      { to: "files",   icon: FolderOpen, label: "Files" },
      { to: "users",   icon: Users,      label: "Users" },
    ],
  },
];

export default function ServerSidebar({ server, onPower, powerLoading }: Props) {
  const { pathname } = useLocation();
  const base = `/server/${server.id}`;

  const isRunning = server.status === "running";
  const isStopped = server.status === "stopped";
  const isBusy    = server.status === "starting" || server.status === "stopping";
  const statusColor = STATUS_COLOR[server.status] ?? STATUS_COLOR.unknown;

  return (
    <aside className="flex flex-col h-full" style={{ width: 220, minWidth: 220 }}>
      {/* Back link */}
      <Link to="/dashboard"
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5 px-1">
        <ArrowLeft size={13} /> Dashboard
      </Link>

      {/* Server identity */}
      <div className="rounded-sm px-3 py-3 mb-5"
        style={{ background: "hsl(0 0% 7%)", border: "1px solid hsl(0 0% 14%)" }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="relative flex h-2 w-2 shrink-0">
            {isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
              style={{ background: statusColor }} />}
            <span className="relative inline-flex rounded-full h-2 w-2"
              style={{ background: statusColor, boxShadow: isRunning ? `0 0 8px ${statusColor}` : undefined }} />
          </span>
          <span className="text-sm font-bold text-foreground truncate">{server.name}</span>
        </div>
        <span className="text-[9px] mono uppercase tracking-widest ml-4"
          style={{ color: statusColor }}>{STATUS_LABEL[server.status] ?? server.status}</span>
        <p className="text-[10px] text-muted-foreground/40 mono mt-1 ml-4">{server.plan} plan</p>
      </div>

      {/* Nav sections */}
      {NAV_SECTIONS.map(section => (
        <div key={section.label} className="mb-5">
          <p className="text-[9px] mono uppercase tracking-widest text-muted-foreground/30 font-semibold px-1 mb-1.5">
            {section.label}
          </p>
          {section.items.map(item => {
            const href = `${base}/${item.to}`;
            const active = pathname === href;
            return (
              <Link key={item.to} to={href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm font-medium transition-all mb-0.5"
                style={{
                  background: active ? "hsl(350 85% 15%)" : "transparent",
                  color:      active ? "hsl(350 85% 65%)" : "hsl(0 0% 55%)",
                  border:     active ? "1px solid hsl(350 85% 28%)" : "1px solid transparent",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "white"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "hsl(0 0% 55%)"; }}
              >
                <item.icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Power controls */}
      <div className="space-y-1.5">
        <p className="text-[9px] mono uppercase tracking-widest text-muted-foreground/30 font-semibold px-1 mb-2">Power</p>
        <div className="flex gap-1.5">
          <button onClick={() => onPower("start")} disabled={!!powerLoading || isRunning || isBusy}
            className="flex-1 h-8 flex items-center justify-center gap-1 rounded-sm text-[11px] font-semibold transition-all hover:brightness-110 disabled:opacity-30"
            style={{ background: "hsl(142 60% 14%)", color: "hsl(142 65% 52%)", border: "1px solid hsl(142 60% 22%)" }}>
            {powerLoading === "start" ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
            Start
          </button>
          <button onClick={() => onPower("restart")} disabled={!!powerLoading || !isRunning}
            className="flex-1 h-8 flex items-center justify-center gap-1 rounded-sm text-[11px] font-semibold transition-all hover:brightness-110 disabled:opacity-30"
            style={{ background: "hsl(38 90% 9%)", color: "hsl(38 90% 58%)", border: "1px solid hsl(38 90% 22%)" }}>
            {powerLoading === "restart" ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
            Restart
          </button>
        </div>
        <button onClick={() => onPower("stop")} disabled={!!powerLoading || isStopped || isBusy}
          className="w-full h-8 flex items-center justify-center gap-1 rounded-sm text-[11px] font-semibold transition-all hover:brightness-110 disabled:opacity-30"
          style={{ background: "hsl(350 85% 9%)", color: "hsl(350 85% 58%)", border: "1px solid hsl(350 85% 22%)" }}>
          {powerLoading === "stop" ? <Loader2 size={11} className="animate-spin" /> : <Square size={11} />}
          Stop Server
        </button>
      </div>
    </aside>
  );
}
