import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, UserPlus, Trash2, Shield,
  Loader2, AlertCircle, X, Check,
  UserCheck, UserX,
} from "lucide-react";
import ServerPageShell from "@/components/ServerPageShell";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

const ease = [0.16, 1, 0.3, 1] as const;

const PERMISSION_GROUPS = [
  {
    group: "Control",
    perms: [
      { key: "control.console",  label: "Console",    desc: "Can send commands via console" },
      { key: "control.start",    label: "Start",      desc: "Can start the server" },
      { key: "control.stop",     label: "Stop",       desc: "Can stop the server" },
      { key: "control.restart",  label: "Restart",    desc: "Can restart the server" },
    ],
  },
  {
    group: "Files",
    perms: [
      { key: "file.read",         label: "View Files",    desc: "Can list files and folders" },
      { key: "file.read-content", label: "Read Content",  desc: "Can view file contents" },
      { key: "file.create",       label: "Create",        desc: "Can upload and create files" },
      { key: "file.update",       label: "Edit",          desc: "Can modify existing files" },
      { key: "file.delete",       label: "Delete",        desc: "Can delete files and folders" },
      { key: "file.archive",      label: "Archive",       desc: "Can compress files" },
    ],
  },
  {
    group: "Backups",
    perms: [
      { key: "backup.read",    label: "View Backups", desc: "Can see backup list" },
      { key: "backup.create",  label: "Create",       desc: "Can create backups" },
      { key: "backup.delete",  label: "Delete",       desc: "Can delete backups" },
      { key: "backup.download",label: "Download",     desc: "Can download backups" },
      { key: "backup.restore", label: "Restore",      desc: "Can restore from backup" },
    ],
  },
  {
    group: "Startup",
    perms: [
      { key: "startup.read",         label: "View Startup",  desc: "Can view startup variables" },
      { key: "startup.update",       label: "Edit Startup",  desc: "Can modify startup variables" },
      { key: "startup.docker-image", label: "Docker Image",  desc: "Can change Docker image" },
    ],
  },
  {
    group: "Database",
    perms: [
      { key: "database.read",          label: "View Databases", desc: "Can see databases" },
      { key: "database.create",        label: "Create",         desc: "Can create databases" },
      { key: "database.update",        label: "Edit",           desc: "Can modify databases" },
      { key: "database.delete",        label: "Delete",         desc: "Can delete databases" },
      { key: "database.view_password", label: "View Password",  desc: "Can see database passwords" },
    ],
  },
  {
    group: "Settings",
    perms: [
      { key: "settings.rename",    label: "Rename Server", desc: "Can rename the server" },
      { key: "settings.reinstall", label: "Reinstall",     desc: "Can reinstall the server" },
    ],
  },
];

const DEFAULT_PERMS = [
  "control.console", "control.start", "control.stop", "control.restart",
  "file.read", "file.read-content", "file.create", "file.update",
];

interface Subuser {
  uuid: string;
  username: string;
  email: string;
  permissions: string[];
  twoFactor: boolean;
  nnAccount: { name: string; username: string } | null;
}

const ServerUsers = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, token, logout } = useAuth();

  const [loadingServer, setLoadingServer] = useState(true);
  const [subusers, setSubusers]   = useState<Subuser[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [serverData, setServerData] = useState<any>(null);

  const [showAdd, setShowAdd]   = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addPerms, setAddPerms] = useState<string[]>(DEFAULT_PERMS);
  const [adding, setAdding]     = useState(false);
  const [addError, setAddError] = useState("");

  const [editTarget, setEditTarget] = useState<Subuser | null>(null);
  const [editPerms, setEditPerms]   = useState<string[]>([]);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Subuser | null>(null);
  const [deleting, setDeleting]         = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { state: { from: `/server/${id}/users` } });
  }, [authLoading, user, navigate, id]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      try {
        const res = await apiFetch("/api/servers", { headers: { Authorization: `Bearer ${token()}` } });
        if (res.status === 401) { logout(); navigate("/login"); return; }
        const all = await res.json();
        const srv = all.find((s: any) => s.id === id);
        if (srv) setServerData(srv);
      } catch {}
      finally { setLoadingServer(false); }
    })();
  }, [user, id, token, logout, navigate]);

  const loadUsers = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await apiFetch(`/api/servers/${id}/users`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) { const e = await res.json(); setError(e.error || "Failed to load users."); return; }
      setSubusers(await res.json());
    } catch { setError("Network error loading users."); }
    finally { setLoading(false); }
  }, [id, token]);

  useEffect(() => {
    if (user && !loadingServer) loadUsers();
  }, [user, loadingServer, loadUsers]);

  const addUser = async () => {
    if (!addEmail.trim()) { setAddError("Email is required."); return; }
    setAdding(true); setAddError("");
    try {
      const res = await apiFetch(`/api/servers/${id}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ email: addEmail.trim(), permissions: addPerms }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error || "Failed to add user."); return; }
      setShowAdd(false); setAddEmail(""); setAddPerms(DEFAULT_PERMS); loadUsers();
    } catch { setAddError("Network error."); }
    finally { setAdding(false); }
  };

  const savePermissions = async () => {
    if (!editTarget) return;
    setSaving(true); setSaveError("");
    try {
      const res = await apiFetch(`/api/servers/${id}/users/${editTarget.uuid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ permissions: editPerms }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error || "Failed to save."); return; }
      setEditTarget(null); loadUsers();
    } catch { setSaveError("Network error."); }
    finally { setSaving(false); }
  };

  const removeUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/servers/${id}/users/${deleteTarget.uuid}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) { const e = await res.json(); setError(e.error || "Failed to remove user."); }
      else loadUsers();
    } catch { setError("Network error removing user."); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  const togglePerm = (perms: string[], perm: string): string[] =>
    perms.includes(perm) ? perms.filter(p => p !== perm) : [...perms, perm];

  if (authLoading || loadingServer) return (
    <div className="flex items-center justify-center h-screen" style={{ background: "#080810" }}>
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#a855f7" }} />
    </div>
  );

  return (
    <ServerPageShell server={serverData} title="Server Users" maxWidth="max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }}>

        {/* Error banner */}
        {error && (
          <div className="rounded-xl px-4 py-3 mb-4 text-xs flex items-center gap-2"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", color: "#f87171" }}>
            <AlertCircle size={13} /> {error}
            <button onClick={() => setError("")} className="ml-auto"><X size={11} /></button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)" }}>
              <Shield size={16} style={{ color: "#a78bfa" }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: "#f1f5f9" }}>Server Users</h2>
              <p className="text-[10px] mt-0.5" style={{ color: "#475569" }}>Invite players to co-manage this server</p>
            </div>
          </div>
          <button onClick={() => { setShowAdd(true); setAddError(""); setAddEmail(""); setAddPerms(DEFAULT_PERMS); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
            style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" }}>
            <UserPlus size={13} /> Invite User
          </button>
        </div>

        {/* Add user form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} className="rounded-2xl overflow-hidden mb-4"
              style={{ border: "1px solid rgba(139,92,246,0.25)" }}>
              <div className="px-5 py-4 space-y-4"
                style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.07),rgba(59,130,246,0.03))" }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold flex items-center gap-2" style={{ color: "#f1f5f9" }}>
                    <UserPlus size={14} style={{ color: "#a78bfa" }} /> Invite a user
                  </p>
                  <button onClick={() => setShowAdd(false)} style={{ color: "#475569" }}><X size={14} /></button>
                </div>
                <div>
                  <label className="text-[9px] mono uppercase tracking-widest block mb-1.5" style={{ color: "#475569" }}>
                    NetherNodes Email
                  </label>
                  <input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addUser()} placeholder="friend@example.com"
                    className="w-full rounded-xl px-3 py-2 text-sm bg-transparent outline-none"
                    style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#f1f5f9" }} />
                  <p className="text-[10px] mt-1" style={{ color: "#334155" }}>
                    The user must already have a NetherNodes account.
                  </p>
                </div>
                <div>
                  <label className="text-[9px] mono uppercase tracking-widest block mb-2" style={{ color: "#475569" }}>
                    Permissions
                  </label>
                  <div className="space-y-3">
                    {PERMISSION_GROUPS.map(group => (
                      <div key={group.group}>
                        <p className="text-[9px] mono uppercase tracking-widest mb-1.5" style={{ color: "#334155" }}>
                          {group.group}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {group.perms.map(p => (
                            <button key={p.key} onClick={() => setAddPerms(prev => togglePerm(prev, p.key))}
                              title={p.desc}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                              style={{
                                background: addPerms.includes(p.key) ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.04)",
                                color: addPerms.includes(p.key) ? "#4ade80" : "#64748b",
                                border: `1px solid ${addPerms.includes(p.key) ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.08)"}`,
                              }}>
                              {addPerms.includes(p.key) && <Check size={9} />}
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {addError && <p className="text-xs" style={{ color: "#f87171" }}>{addError}</p>}
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setShowAdd(false)}
                    className="h-9 px-4 rounded-xl text-xs transition-colors"
                    style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>Cancel</button>
                  <button onClick={addUser} disabled={adding || !addEmail.trim()}
                    className="flex-1 h-9 flex items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg,#5b21b6,#7c3aed)", color: "white" }}>
                    {adding ? <><Loader2 size={12} className="animate-spin" /> Sending…</> : <><UserPlus size={12} /> Send Invite</>}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User table */}
        <div className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.07)", background: "#0b0b14" }}>
          {/* Column headers — hide permissions col on mobile */}
          <div className="grid px-4 py-2 text-[9px] mono uppercase tracking-widest"
            style={{ gridTemplateColumns: "1fr 1fr auto", gap: "0 12px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "#334155" }}>
            <span>User</span>
            <span className="hidden sm:block">Permissions</span>
            <span className="text-right">Actions</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12" style={{ color: "#475569" }}>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Loading users…</span>
            </div>
          ) : subusers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-8 h-8 mx-auto mb-2" style={{ color: "#1e293b" }} />
              <p className="text-sm" style={{ color: "#475569" }}>No subusers yet</p>
              <p className="text-xs mt-1" style={{ color: "#334155" }}>Invite someone to help manage this server</p>
            </div>
          ) : (
            subusers.map((u, i) => (
              <motion.div key={u.uuid} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                className="grid items-center px-4 py-3 transition-colors"
                style={{ gridTemplateColumns: "1fr 1fr auto", gap: "0 12px", borderBottom: i < subusers.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>

                {/* User info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd" }}>
                    {(u.nnAccount?.name || u.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold truncate" style={{ color: "#e2e8f0" }}>
                        {u.nnAccount?.name || u.username}
                      </p>
                      {u.nnAccount
                        ? <UserCheck size={10} className="text-green-400 shrink-0" />
                        : <UserX size={10} className="text-yellow-400 shrink-0" />}
                    </div>
                    <p className="text-[10px] truncate" style={{ color: "#475569" }}>{u.email}</p>
                  </div>
                </div>

                {/* Permissions — hidden on mobile */}
                <div className="hidden sm:flex flex-wrap gap-1">
                  {u.permissions.slice(0, 4).map(perm => {
                    const label = PERMISSION_GROUPS.flatMap(g => g.perms).find(p => p.key === perm)?.label ?? perm.split(".")[1];
                    return (
                      <span key={perm} className="px-1.5 py-0.5 rounded-md text-[9px] mono"
                        style={{ background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {label}
                      </span>
                    );
                  })}
                  {u.permissions.length > 4 && (
                    <span className="text-[9px]" style={{ color: "#334155" }}>+{u.permissions.length - 4}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1.5">
                  <button onClick={() => { setEditTarget(u); setEditPerms([...u.permissions]); setSaveError(""); }}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all hover:opacity-80"
                    style={{ background: "rgba(139,92,246,0.1)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}>
                    <Shield size={9} /> Edit
                  </button>
                  <button onClick={() => setDeleteTarget(u)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:opacity-80"
                    style={{ background: "rgba(239,68,68,0.07)", color: "#f87171", border: "1px solid rgba(239,68,68,0.18)" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Edit permissions modal */}
      <AnimatePresence>
        {editTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
            onClick={() => setEditTarget(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl w-full max-w-lg overflow-hidden"
              style={{ background: "linear-gradient(135deg,#0f0f1a,#0d0d18)", border: "1px solid rgba(139,92,246,0.25)", maxHeight: "85vh" }}
              onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 flex items-center justify-between px-5 py-4"
                style={{ background: "#0f0f1a", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>Edit Permissions</p>
                  <p className="text-[10px] mono mt-0.5" style={{ color: "#475569" }}>{editTarget.email}</p>
                </div>
                <button onClick={() => setEditTarget(null)} style={{ color: "#475569" }}><X size={16} /></button>
              </div>
              <div className="px-5 py-4 space-y-5 overflow-y-auto" style={{ maxHeight: "calc(85vh - 120px)" }}>
                {PERMISSION_GROUPS.map(group => (
                  <div key={group.group}>
                    <p className="text-[9px] mono uppercase tracking-widest mb-2" style={{ color: "#334155" }}>{group.group}</p>
                    <div className="space-y-1.5">
                      {group.perms.map(p => (
                        <button key={p.key} onClick={() => setEditPerms(prev => togglePerm(prev, p.key))}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all text-left"
                          style={{
                            background: editPerms.includes(p.key) ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.03)",
                            border: `1px solid ${editPerms.includes(p.key) ? "rgba(74,222,128,0.22)" : "rgba(255,255,255,0.07)"}`,
                          }}>
                          <div>
                            <span style={{ color: editPerms.includes(p.key) ? "#4ade80" : "#94a3b8" }}>{p.label}</span>
                            <p className="text-[10px] mt-0.5" style={{ color: "#334155" }}>{p.desc}</p>
                          </div>
                          <div className="w-4 h-4 rounded-md flex items-center justify-center shrink-0 ml-3"
                            style={{
                              background: editPerms.includes(p.key) ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.06)",
                              border: `1px solid ${editPerms.includes(p.key) ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.1)"}`,
                            }}>
                            {editPerms.includes(p.key) && <Check size={10} style={{ color: "#4ade80" }} />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {saveError && <p className="text-xs" style={{ color: "#f87171" }}>{saveError}</p>}
                <div className="flex gap-3 pt-2 pb-2">
                  <button onClick={() => setEditTarget(null)}
                    className="h-10 px-4 rounded-xl text-xs transition-colors"
                    style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>Cancel</button>
                  <button onClick={savePermissions} disabled={saving}
                    className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#5b21b6,#7c3aed)", color: "white" }}>
                    {saving ? <><Loader2 size={12} className="animate-spin" /> Saving…</> : <><Check size={12} /> Save Permissions</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
            onClick={() => setDeleteTarget(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}
              style={{ background: "linear-gradient(135deg,#0f0f1a,#110d1d)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <AlertCircle size={18} style={{ color: "#f87171" }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#f1f5f9" }}>Remove user?</p>
                  <p className="text-[10px] mt-0.5 truncate max-w-[200px]" style={{ color: "#475569" }}>{deleteTarget.email}</p>
                </div>
              </div>
              <p className="text-xs mb-5" style={{ color: "#64748b" }}>
                This user will immediately lose all access to the server.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                  className="flex-1 h-9 rounded-xl text-xs disabled:opacity-40"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>Cancel</button>
                <button onClick={removeUser} disabled={deleting}
                  className="flex-1 h-9 flex items-center justify-center gap-2 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg,#991b1b,#dc2626)", color: "white" }}>
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : "Remove"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ServerPageShell>
  );
};

export default ServerUsers;
