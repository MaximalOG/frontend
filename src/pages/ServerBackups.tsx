import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  HardDrive, Plus, Trash2, RotateCcw, Download,
  Loader2, AlertCircle, X, Check, Clock, AlertTriangle,
} from "lucide-react";
import ServerSidebar from "@/components/ServerSidebar";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

interface ServerData {
  id: string; name: string; status: string;
  plan: string; ram: string; cpu: string; ssd?: string;
}

interface Backup {
  uuid: string; name: string; bytes: number;
  createdAt: string; completedAt: string | null;
  isSuccessful: boolean; isLocked: boolean;
}

function fmtBytes(b: number) {
  if (b >= 1073741824) return `${(b / 1073741824).toFixed(2)} GB`;
  if (b >= 1048576)    return `${(b / 1048576).toFixed(0)} MB`;
  return `${(b / 1024).toFixed(0)} KB`;
}
function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
}

function PageShell({ server, children }: { server: ServerData | null; children: React.ReactNode }) {
  return (
    <div className="flex overflow-hidden" style={{ height: "100vh", background: "#080810" }}>
      <div className="hidden md:flex flex-col h-full overflow-y-auto shrink-0 px-4 py-5"
        style={{ width: 236, background: "#0b0b14", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        {server && <ServerSidebar server={server} onPower={async () => {}} powerLoading={null} />}
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">{children}</div>
      </div>
    </div>
  );
}

export default function ServerBackups() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, token, logout } = useAuth();

  const [server, setServer]           = useState<ServerData | null>(null);
  const [loadingServer, setLS]        = useState(true);
  const [backups, setBackups]         = useState<Backup[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [creating, setCreating]       = useState(false);
  const [createMsg, setCreateMsg]     = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Backup | null>(null);
  const [deleting, setDeleting]       = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null);
  const [restoring, setRestoring]     = useState(false);
  const [restoreError, setRestoreError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { state: { from: `/server/${id}/backups` } });
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

  const loadBackups = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await apiFetch(`/api/servers/${id}/backups`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) {
        const e = await res.json();
        setError(e.error || "Failed to load backups.");
        return;
      }
      const data = await res.json();
      setBackups(Array.isArray(data) ? data : data.backups ?? []);
    } catch { setError("Network error loading backups."); }
    finally { setLoading(false); }
  }, [id, token]);

  useEffect(() => {
    if (user && !loadingServer) loadBackups();
  }, [user, loadingServer, loadBackups]);

  const createBackup = async () => {
    setCreating(true); setCreateMsg(""); setError("");
    try {
      const res = await apiFetch(`/api/servers/${id}/backups`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ name: `Backup ${new Date().toLocaleString("en-IN")}` }),
      });
      if (!res.ok) { const e = await res.json(); setError(e.error || "Failed to create backup."); return; }
      setCreateMsg("Backup started — it may take a few minutes.");
      setTimeout(() => setCreateMsg(""), 5000);
      loadBackups();
    } catch { setError("Network error."); }
    finally { setCreating(false); }
  };

  const deleteBackup = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/servers/${id}/backups/${deleteTarget.uuid}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) { const e = await res.json(); setError(e.error || "Failed to delete backup."); }
      else loadBackups();
    } catch { setError("Network error."); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  const restoreBackup = async () => {
    if (!restoreTarget) return;
    setRestoring(true); setRestoreError("");
    try {
      const res = await apiFetch(`/api/servers/${id}/backups/${restoreTarget.uuid}/restore`, {
        method: "POST", headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) { const e = await res.json(); setRestoreError(e.error || "Restore failed."); return; }
      setRestoreTarget(null);
      setCreateMsg("Restore started. Server will restart automatically.");
      setTimeout(() => setCreateMsg(""), 8000);
    } catch { setRestoreError("Network error."); }
    finally { setRestoring(false); }
  };

  if (authLoading || loadingServer) return (
    <div className="flex items-center justify-center h-screen" style={{ background: "#080810" }}>
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#a855f7" }} />
    </div>
  );

  return (
    <PageShell server={server}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.22)" }}>
            <HardDrive size={16} style={{ color: "#fbbf24" }} />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: "#f1f5f9" }}>Backups</h1>
            <p className="text-[10px] mono mt-0.5" style={{ color: "#475569" }}>
              {backups.length} backup{backups.length !== 1 ? "s" : ""} saved
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadBackups} disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>
            <RotateCcw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={createBackup} disabled={creating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>
            {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={13} />}
            Create Backup
          </button>
        </div>
      </div>

      {/* Status messages */}
      <AnimatePresence>
        {(error || createMsg) && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-xs"
            style={{
              background: error ? "rgba(239,68,68,0.08)" : "rgba(74,222,128,0.07)",
              border: `1px solid ${error ? "rgba(239,68,68,0.22)" : "rgba(74,222,128,0.2)"}`,
              color: error ? "#f87171" : "#4ade80",
            }}>
            {error ? <AlertCircle size={12} /> : <Check size={12} />}
            {error || createMsg}
            <button onClick={() => { setError(""); setCreateMsg(""); }} className="ml-auto"><X size={11} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backup list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#475569" }} />
        </div>
      ) : backups.length === 0 ? (
        <div className="rounded-2xl p-12 text-center"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <HardDrive size={32} className="mx-auto mb-3" style={{ color: "#1e293b" }} />
          <p className="text-sm font-semibold" style={{ color: "#475569" }}>No backups yet</p>
          <p className="text-xs mt-1" style={{ color: "#334155" }}>Create a backup to snapshot your server files</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.07)", background: "#0b0b14" }}>
          {/* Column headers */}
          <div className="grid px-4 py-2 text-[9px] mono uppercase tracking-widest"
            style={{ gridTemplateColumns: "1fr 90px 140px 80px", gap: "0 12px", color: "#334155", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span>Name</span><span>Size</span><span>Created</span><span className="text-right">Actions</span>
          </div>

          {backups.map((b, i) => (
            <motion.div key={b.uuid} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
              className="grid items-center px-4 py-3 transition-colors"
              style={{ gridTemplateColumns: "1fr 90px 140px 80px", gap: "0 12px", borderBottom: i < backups.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: b.isSuccessful ? "#22c55e" : "#f59e0b" }} />
                  <p className="text-xs font-medium truncate" style={{ color: "#e2e8f0" }}>{b.name}</p>
                </div>
                <p className="text-[9px] mono mt-0.5" style={{ color: "#334155" }}>
                  {b.isSuccessful ? "Complete" : "In progress…"}
                </p>
              </div>

              <p className="text-xs mono" style={{ color: "#64748b" }}>
                {b.bytes > 0 ? fmtBytes(b.bytes) : "—"}
              </p>

              <p className="text-[10px]" style={{ color: "#475569" }}>
                <Clock size={9} className="inline mr-1 opacity-50" />
                {fmtDate(b.createdAt)}
              </p>

              <div className="flex items-center justify-end gap-1.5">
                <button title="Restore" onClick={() => { setRestoreTarget(b); setRestoreError(""); }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:opacity-80"
                  style={{ background: "rgba(139,92,246,0.1)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <RotateCcw size={11} />
                </button>
                {!b.isLocked && (
                  <button title="Delete" onClick={() => setDeleteTarget(b)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:opacity-80"
                    style={{ background: "rgba(239,68,68,0.07)", color: "#f87171", border: "1px solid rgba(239,68,68,0.18)" }}>
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
            onClick={() => !deleting && setDeleteTarget(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}
              style={{ background: "linear-gradient(135deg,#0f0f1a,#110d1d)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <Trash2 size={16} style={{ color: "#f87171" }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#f1f5f9" }}>Delete backup?</p>
                  <p className="text-[10px] mt-0.5 truncate max-w-[200px]" style={{ color: "#475569" }}>{deleteTarget.name}</p>
                </div>
              </div>
              <p className="text-xs mb-5" style={{ color: "#64748b" }}>This cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                  className="flex-1 h-9 rounded-xl text-xs disabled:opacity-40"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>Cancel</button>
                <button onClick={deleteBackup} disabled={deleting}
                  className="flex-1 h-9 flex items-center justify-center gap-2 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg,#991b1b,#dc2626)", color: "white" }}>
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Restore modal */}
      <AnimatePresence>
        {restoreTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
            onClick={() => !restoring && setRestoreTarget(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}
              style={{ background: "linear-gradient(135deg,#0f0f1a,#110d1d)", border: "1px solid rgba(139,92,246,0.25)" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)" }}>
                  <RotateCcw size={16} style={{ color: "#a78bfa" }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#f1f5f9" }}>Restore backup?</p>
                  <p className="text-[10px] mt-0.5 truncate max-w-[200px]" style={{ color: "#475569" }}>{restoreTarget.name}</p>
                </div>
              </div>
              <div className="rounded-xl px-3 py-2.5 mb-4 flex items-start gap-2"
                style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.18)" }}>
                <AlertTriangle size={12} className="mt-0.5 shrink-0" style={{ color: "#fbbf24" }} />
                <p className="text-xs" style={{ color: "#92400e" }}>
                  This will overwrite all current server files. The server will restart automatically.
                </p>
              </div>
              {restoreError && <p className="text-xs mb-3" style={{ color: "#f87171" }}>{restoreError}</p>}
              <div className="flex gap-2">
                <button onClick={() => setRestoreTarget(null)} disabled={restoring}
                  className="flex-1 h-9 rounded-xl text-xs disabled:opacity-40"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>Cancel</button>
                <button onClick={restoreBackup} disabled={restoring}
                  className="flex-1 h-9 flex items-center justify-center gap-2 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg,#5b21b6,#7c3aed)", color: "white" }}>
                  {restoring ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                  {restoring ? "Restoring…" : "Restore"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
