import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Plus, Trash2, Play, Pause, Clock,
  Loader2, Check, X, ChevronDown, ChevronUp, AlertTriangle,
} from "lucide-react";
import ServerSidebar from "@/components/ServerSidebar";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

interface ServerData {
  id: string; name: string; status: string;
  plan: string; ram: string; cpu: string; ssd?: string;
}

interface Schedule {
  id: string;
  name: string;
  cron: string;
  action: "restart" | "stop" | "start" | "command";
  command?: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

const PRESET_CRONS = [
  { label: "Every hour",        cron: "0 * * * *" },
  { label: "Every 6 hours",     cron: "0 */6 * * *" },
  { label: "Every 12 hours",    cron: "0 */12 * * *" },
  { label: "Daily at midnight", cron: "0 0 * * *" },
  { label: "Daily at 6 AM",     cron: "0 6 * * *" },
  { label: "Weekly (Monday)",   cron: "0 0 * * 1" },
  { label: "Custom…",           cron: "" },
];

const ACTION_CFG = {
  restart: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.2)",  label: "Restart" },
  stop:    { color: "#f87171", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.2)",   label: "Stop" },
  start:   { color: "#4ade80", bg: "rgba(74,222,128,0.1)",  border: "rgba(74,222,128,0.2)",  label: "Start" },
  command: { color: "#a78bfa", bg: "rgba(139,92,246,0.1)",  border: "rgba(139,92,246,0.2)",  label: "Command" },
};

function PageShell({ server, children, onPower, powerLoading }: { server: ServerData | null; children: React.ReactNode; onPower: any; powerLoading: any }) {
  return (
    <div className="flex overflow-hidden" style={{ height: "100vh", background: "#080810" }}>
      <div className="hidden md:flex flex-col h-full overflow-y-auto shrink-0 px-4 py-5"
        style={{ width: 236, background: "#0b0b14", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        {server && <ServerSidebar server={server} onPower={onPower} powerLoading={powerLoading} />}
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">{children}</div>
      </div>
    </div>
  );
}

export default function ServerSchedules() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, token, logout } = useAuth();

  const [server, setServer]           = useState<ServerData | null>(null);
  const [loadingServer, setLS]        = useState(true);
  const [schedules, setSchedules]     = useState<Schedule[]>([]);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [showCreate, setShowCreate]   = useState(false);

  // Create form
  const [newName, setNewName]         = useState("");
  const [newCronPreset, setNewCronPreset] = useState(PRESET_CRONS[3].cron);
  const [newCronCustom, setNewCronCustom] = useState("");
  const [newAction, setNewAction]     = useState<Schedule["action"]>("restart");
  const [newCommand, setNewCommand]   = useState("");
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState("");

  const isCustomCron = newCronPreset === "";

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { state: { from: `/server/${id}/schedules` } });
  }, [authLoading, user, navigate, id]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      try {
        const res = await apiFetch("/api/servers", { headers: { Authorization: `Bearer ${token()}` } });
        if (res.status === 401) { logout(); navigate("/login"); return; }
        const all = await res.json();
        const srv = all.find((s: any) => s.id === id);
        if (srv) setServer(srv);
      } catch {}
      finally { setLS(false); }
    })();
  }, [user, id, token, logout, navigate]);

  // Load schedules from localStorage (no backend endpoint for schedules yet)
  useEffect(() => {
    if (!id) return;
    try {
      const saved = localStorage.getItem(`schedules_${id}`);
      if (saved) setSchedules(JSON.parse(saved));
    } catch {}
  }, [id]);

  const save = (list: Schedule[]) => {
    setSchedules(list);
    localStorage.setItem(`schedules_${id}`, JSON.stringify(list));
  };

  const createSchedule = () => {
    if (!newName.trim()) { setCreateError("Name is required."); return; }
    const cron = isCustomCron ? newCronCustom.trim() : newCronPreset;
    if (!cron) { setCreateError("Select or enter a cron expression."); return; }
    if (newAction === "command" && !newCommand.trim()) { setCreateError("Command is required."); return; }
    setCreating(true);
    const schedule: Schedule = {
      id: `sch_${Date.now()}`,
      name: newName.trim(),
      cron,
      action: newAction,
      command: newAction === "command" ? newCommand.trim() : undefined,
      enabled: true,
    };
    save([...schedules, schedule]);
    setNewName(""); setNewCronPreset(PRESET_CRONS[3].cron); setNewCronCustom("");
    setNewAction("restart"); setNewCommand(""); setCreateError("");
    setShowCreate(false);
    setCreating(false);
  };

  const toggleSchedule = (sid: string) => {
    save(schedules.map(s => s.id === sid ? { ...s, enabled: !s.enabled } : s));
  };

  const deleteSchedule = (sid: string) => {
    save(schedules.filter(s => s.id !== sid));
    if (expandedId === sid) setExpandedId(null);
  };

  if (authLoading || loadingServer) return (
    <div className="flex items-center justify-center h-screen" style={{ background: "#080810" }}>
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#a855f7" }} />
    </div>
  );

  return (
    <PageShell server={server} onPower={async () => {}} powerLoading={null}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)" }}>
            <Calendar size={16} style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: "#f1f5f9" }}>Schedules</h1>
            <p className="text-[10px] mono mt-0.5" style={{ color: "#475569" }}>Automate restarts, stops and commands</p>
          </div>
        </div>
        <button onClick={() => { setShowCreate(true); setCreateError(""); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
          style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" }}>
          <Plus size={13} /> New Schedule
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl p-5 mb-5 space-y-4"
            style={{ background: "linear-gradient(135deg,#0f0d1c,#0d0d18)", border: "1px solid rgba(139,92,246,0.25)" }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>New Schedule</p>
              <button onClick={() => setShowCreate(false)} style={{ color: "#475569" }}><X size={15} /></button>
            </div>

            {/* Name */}
            <div>
              <label className="text-[9px] mono uppercase tracking-widest block mb-1.5" style={{ color: "#475569" }}>Schedule Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Daily Restart"
                className="w-full rounded-xl px-3 py-2 text-sm bg-transparent outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#f1f5f9" }} />
            </div>

            {/* Cron */}
            <div>
              <label className="text-[9px] mono uppercase tracking-widest block mb-1.5" style={{ color: "#475569" }}>Frequency</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                {PRESET_CRONS.map(p => (
                  <button key={p.cron} onClick={() => setNewCronPreset(p.cron)}
                    className="px-3 py-2 rounded-xl text-xs font-medium transition-all text-left"
                    style={{
                      background: newCronPreset === p.cron ? "rgba(139,92,246,0.18)" : "rgba(255,255,255,0.04)",
                      color: newCronPreset === p.cron ? "#c4b5fd" : "#64748b",
                      border: `1px solid ${newCronPreset === p.cron ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.07)"}`,
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
              {isCustomCron && (
                <input value={newCronCustom} onChange={e => setNewCronCustom(e.target.value)}
                  placeholder="* * * * * (minute hour day month weekday)"
                  className="w-full rounded-xl px-3 py-2 text-sm bg-transparent outline-none mono"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#f1f5f9" }} />
              )}
            </div>

            {/* Action */}
            <div>
              <label className="text-[9px] mono uppercase tracking-widest block mb-1.5" style={{ color: "#475569" }}>Action</label>
              <div className="flex gap-2">
                {(Object.keys(ACTION_CFG) as Schedule["action"][]).map(a => {
                  const c = ACTION_CFG[a];
                  return (
                    <button key={a} onClick={() => setNewAction(a)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: newAction === a ? c.bg : "rgba(255,255,255,0.04)",
                        color: newAction === a ? c.color : "#64748b",
                        border: `1px solid ${newAction === a ? c.border : "rgba(255,255,255,0.07)"}`,
                      }}>
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {newAction === "command" && (
              <div>
                <label className="text-[9px] mono uppercase tracking-widest block mb-1.5" style={{ color: "#475569" }}>Command</label>
                <input value={newCommand} onChange={e => setNewCommand(e.target.value)} placeholder="say Server restarting in 1 minute"
                  className="w-full rounded-xl px-3 py-2 text-sm bg-transparent outline-none mono"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#c4b5fd" }} />
              </div>
            )}

            {createError && <p className="text-xs" style={{ color: "#f87171" }}>{createError}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 h-9 rounded-xl text-xs transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>Cancel</button>
              <button onClick={createSchedule} disabled={creating}
                className="flex-1 h-9 rounded-xl text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#5b21b6,#7c3aed)", color: "white" }}>
                {creating ? <Loader2 size={12} className="animate-spin mx-auto" /> : "Create Schedule"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schedule list */}
      {schedules.length === 0 ? (
        <div className="rounded-2xl p-12 text-center"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Calendar size={32} className="mx-auto mb-3" style={{ color: "#1e293b" }} />
          <p className="text-sm font-semibold" style={{ color: "#475569" }}>No schedules yet</p>
          <p className="text-xs mt-1" style={{ color: "#334155" }}>Create a schedule to automate server actions</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.07)", background: "#0b0b14" }}>
          {schedules.map((s, i) => {
            const ac = ACTION_CFG[s.action];
            const isOpen = expandedId === s.id;
            return (
              <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ borderBottom: i < schedules.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer group transition-colors"
                  onClick={() => setExpandedId(isOpen ? null : s.id)}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>

                  {/* Enabled dot */}
                  <div className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: s.enabled ? "#22c55e" : "#334155", boxShadow: s.enabled ? "0 0 5px #22c55e" : "none" }} />

                  {/* Name + cron */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#e2e8f0" }}>{s.name}</p>
                    <p className="text-[10px] mono mt-0.5" style={{ color: "#475569" }}>{s.cron}</p>
                  </div>

                  {/* Action badge */}
                  <span className="shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-semibold mono"
                    style={{ background: ac.bg, color: ac.color, border: `1px solid ${ac.border}` }}>
                    {ac.label}
                  </span>

                  {/* Toggle + chevron */}
                  <button onClick={e => { e.stopPropagation(); toggleSchedule(s.id); }}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                    style={{
                      background: s.enabled ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.04)",
                      color: s.enabled ? "#4ade80" : "#475569",
                    }}>
                    {s.enabled ? <Play size={11} /> : <Pause size={11} />}
                  </button>
                  {isOpen ? <ChevronUp size={13} style={{ color: "#475569", flexShrink: 0 }} />
                           : <ChevronDown size={13} style={{ color: "#475569", flexShrink: 0 }} />}
                </div>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div key="exp" initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                      style={{ overflow: "hidden" }}>
                      <div className="px-4 pb-4 pt-2 space-y-3"
                        style={{ background: "rgba(139,92,246,0.04)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl px-3 py-2.5"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <p className="text-[9px] mono uppercase tracking-widest mb-1" style={{ color: "#475569" }}>
                              <Clock size={8} className="inline mr-1" />Cron Expression
                            </p>
                            <p className="text-sm mono font-bold" style={{ color: "#c4b5fd" }}>{s.cron}</p>
                          </div>
                          <div className="rounded-xl px-3 py-2.5"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <p className="text-[9px] mono uppercase tracking-widest mb-1" style={{ color: "#475569" }}>Action</p>
                            <p className="text-sm font-bold" style={{ color: ac.color }}>{ac.label}</p>
                          </div>
                        </div>
                        {s.command && (
                          <div className="rounded-xl px-3 py-2.5"
                            style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
                            <p className="text-[9px] mono uppercase tracking-widest mb-1" style={{ color: "#475569" }}>Command</p>
                            <p className="text-sm mono" style={{ color: "#e2e8f0" }}>{s.command}</p>
                          </div>
                        )}
                        <button onClick={() => deleteSchedule(s.id)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all hover:opacity-80"
                          style={{ color: "#f87171", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)" }}>
                          <Trash2 size={12} /> Delete Schedule
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Note */}
      <div className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-xl"
        style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.12)" }}>
        <AlertTriangle size={12} className="mt-0.5 shrink-0" style={{ color: "#fbbf24" }} />
        <p className="text-[10px]" style={{ color: "#92400e" }}>
          Schedules are stored locally in your browser. They will execute actions via the server console when your panel is open.
        </p>
      </div>
    </PageShell>
  );
}
