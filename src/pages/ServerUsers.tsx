import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, UserPlus, Trash2, Shield,
  Loader2, AlertCircle, X, Check,
  UserCheck, UserX,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import ServerSidebar from "@/components/ServerSidebar";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

const ease = [0.16, 1, 0.3, 1] as const;

// All available Pterodactyl permissions with human-readable labels
const PERMISSION_GROUPS = [
  {
    group: "Control",
    perms: [
      { key: "control.console",  label: "Console",              desc: "Can send commands via console" },
      { key: "control.start",    label: "Start",                desc: "Can start the server" },
      { key: "control.stop",     label: "Stop",                 desc: "Can stop the server" },
      { key: "control.restart",  label: "Restart",              desc: "Can restart the server" },
    ],
  },
  {
    group: "Files",
    perms: [
      { key: "file.read",         label: "View Files",           desc: "Can list files and folders" },
      { key: "file.read-content", label: "Read Content",         desc: "Can view file contents" },
      { key: "file.create",       label: "Create",               desc: "Can upload and create files" },
      { key: "file.update",       label: "Edit",                 desc: "Can modify existing files" },
      { key: "file.delete",       label: "Delete",               desc: "Can delete files and folders" },
      { key: "file.archive",      label: "Archive",              desc: "Can compress files" },
    ],
  },
  {
    group: "Backups",
    perms: [
      { key: "backup.read",       label: "View Backups",         desc: "Can see backup list" },
      { key: "backup.create",     label: "Create",               desc: "Can create backups" },
      { key: "backup.delete",     label: "Delete",               desc: "Can delete backups" },
      { key: "backup.download",   label: "Download",             desc: "Can download backups" },
      { key: "backup.restore",    label: "Restore",              desc: "Can restore from backup" },
    ],
  },
  {
    group: "Startup",
    perms: [
      { key: "startup.read",      label: "View Startup",         desc: "Can view startup variables" },
      { key: "startup.update",    label: "Edit Startup",         desc: "Can modify startup variables" },
      { key: "startup.docker-image", label: "Docker Image",      desc: "Can change Docker image" },
    ],
  },
  {
    group: "Database",
    perms: [
      { key: "database.read",     label: "View Databases",       desc: "Can see databases" },
      { key: "database.create",   label: "Create",               desc: "Can create databases" },
      { key: "database.update",   label: "Edit",                 desc: "Can modify databases" },
      { key: "database.delete",   label: "Delete",               desc: "Can delete databases" },
      { key: "database.view_password", label: "View Password",   desc: "Can see database passwords" },
    ],
  },
  {
    group: "Settings",
    perms: [
      { key: "settings.rename",   label: "Rename Server",        desc: "Can rename the server" },
      { key: "settings.reinstall","label": "Reinstall",          desc: "Can reinstall the server" },
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

  const [serverName, setServerName] = useState("Server");
  const [loadingServer, setLoadingServer] = useState(true);

  const [subusers, setSubusers]   = useState<Subuser[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  // Add user form
  const [showAdd, setShowAdd]         = useState(false);
  const [addEmail, setAddEmail]       = useState("");
  const [addPerms, setAddPerms]       = useState<string[]>(DEFAULT_PERMS);
  const [adding, setAdding]           = useState(false);
  const [addError, setAddError]       = useState("");

  // Edit permissions modal
  const [editTarget, setEditTarget]   = useState<Subuser | null>(null);
  const [editPerms, setEditPerms]     = useState<string[]>([]);
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState("");

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Subuser | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // Server data for sidebar
  const [serverData, setServerData] = useState<any>(null);

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
        if (srv) { setServerName(srv.name); setServerData(srv); }
      } catch {}
      finally { setLoadingServer(false); }
    })();
  }, [user, id, token, logout, navigate]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/servers/${id}/users`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) { const e = await res.json(); setError(e.error || "Failed to load users."); return; }
      setSubusers(await res.json());
    } catch {
      setError("Network error loading users.");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    if (user && !loadingServer) loadUsers();
  }, [user, loadingServer, loadUsers]);

  const addUser = async () => {
    if (!addEmail.trim()) { setAddError("Email is required."); return; }
    setAdding(true);
    setAddError("");
    try {
      const res = await apiFetch(`/api/servers/${id}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ email: addEmail.trim(), permissions: addPerms }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error || "Failed to add user."); return; }
      setShowAdd(false);
      setAddEmail("");
      setAddPerms(DEFAULT_PERMS);
      loadUsers();
    } catch {
      setAddError("Network error.");
    } finally {
      setAdding(false);
    }
  };

  const savePermissions = async () => {
    if (!editTarget) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await apiFetch(`/api/servers/${id}/users/${editTarget.uuid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ permissions: editPerms }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error || "Failed to save."); return; }
      setEditTarget(null);
      loadUsers();
    } catch {
      setSaveError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/servers/${id}/users/${deleteTarget.uuid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) { const e = await res.json(); setError(e.error || "Failed to remove user."); }
      else loadUsers();
    } catch {
      setError("Network error removing user.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const togglePerm = (perms: string[], perm: string): string[] =>
    perms.includes(perm) ? perms.filter(p => p !== perm) : [...perms, perm];

  if (authLoading || loadingServer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex flex-1 overflow-hidden" style={{ paddingTop: 64 }}>

        {/* Sidebar */}
        <div className="hidden md:flex flex-col h-[calc(100vh-64px)] sticky top-16 px-4 py-5 overflow-y-auto"
          style={{ width: 236, borderRight: "1px solid hsl(0 0% 12%)", background: "hsl(0 0% 4.5%)" }}>
          {serverData && <ServerSidebar server={serverData} onPower={async () => {}} powerLoading={null} />}
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }} className="max-w-3xl mx-auto">

          {/* Error */}
          {error && (
            <div className="rounded-sm px-4 py-3 mb-4 text-xs flex items-center gap-2"
              style={{ background: "hsl(350 85% 8%)", border: "1px solid hsl(350 85% 25%)", color: "hsl(350 85% 65%)" }}>
              <AlertCircle size={13} /> {error}
              <button onClick={() => setError("")} className="ml-auto"><X size={11} /></button>
            </div>
          )}

          {/* Header bar */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Shield size={14} className="text-primary" /> Server Users
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Invite players to manage this server. They must have a NetherNodes account.</p>
            </div>
            <button
              onClick={() => { setShowAdd(true); setAddError(""); setAddEmail(""); setAddPerms(DEFAULT_PERMS); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all hover:brightness-110"
              style={{ background: "hsl(350 85% 45%)", color: "white" }}
            >
              <UserPlus size={12} /> Invite User
            </button>
          </div>

          {/* Add user panel */}
          <AnimatePresence>
            {showAdd && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-sm overflow-hidden mb-4"
                style={{ border: "1px solid hsl(350 85% 30%)" }}
              >
                <div className="px-5 py-4 space-y-4" style={{ background: "hsl(350 85% 5%)" }}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <UserPlus size={14} className="text-primary" /> Invite a user
                    </p>
                    <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <X size={14} />
                    </button>
                  </div>

                  <div>
                    <label className="text-[9px] mono uppercase tracking-wider text-muted-foreground/50 block mb-1.5">NetherNodes Email</label>
                    <input
                      type="email"
                      value={addEmail}
                      onChange={e => setAddEmail(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addUser()}
                      placeholder="friend@example.com"
                      className="w-full rounded-sm px-3 py-2 text-sm text-foreground bg-transparent outline-none"
                      style={{ border: "1px solid hsl(0 0% 22%)" }}
                      onFocus={e => (e.currentTarget.style.borderColor = "hsl(350 85% 45%)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "hsl(0 0% 22%)")}
                    />
                    <p className="text-[10px] text-muted-foreground/40 mt-1">The user must already have a NetherNodes account with this email.</p>
                  </div>

                  {/* Permissions */}
                  <div>
                    <label className="text-[9px] mono uppercase tracking-wider text-muted-foreground/50 block mb-2">Permissions</label>
                    <div className="space-y-3">
                      {PERMISSION_GROUPS.map(group => (
                        <div key={group.group}>
                          <p className="text-[9px] mono uppercase tracking-wider text-muted-foreground/40 mb-1.5">{group.group}</p>
                          <div className="flex flex-wrap gap-2">
                            {group.perms.map(p => (
                              <button
                                key={p.key}
                                onClick={() => setAddPerms(prev => togglePerm(prev, p.key))}
                                title={p.desc}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-medium transition-all"
                                style={{
                                  background: addPerms.includes(p.key) ? "hsl(142 60% 15%)" : "hsl(0 0% 10%)",
                                  color: addPerms.includes(p.key) ? "hsl(142 70% 55%)" : "hsl(0 0% 45%)",
                                  border: `1px solid ${addPerms.includes(p.key) ? "hsl(142 60% 25%)" : "hsl(0 0% 18%)"}`,
                                }}
                              >
                                {addPerms.includes(p.key) && <Check size={9} />}
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {addError && (
                    <p className="text-xs" style={{ color: "hsl(350 85% 65%)" }}>{addError}</p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button onClick={() => setShowAdd(false)}
                      className="h-9 px-4 rounded-sm text-xs text-muted-foreground hover:text-foreground transition-colors"
                      style={{ border: "1px solid hsl(0 0% 20%)" }}>
                      Cancel
                    </button>
                    <button onClick={addUser} disabled={adding || !addEmail.trim()}
                      className="flex-1 h-9 flex items-center justify-center gap-2 rounded-sm text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                      style={{ background: "hsl(350 85% 45%)", color: "white" }}>
                      {adding ? <><Loader2 size={12} className="animate-spin" /> Sending invite…</> : <><UserPlus size={12} /> Send Invite</>}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* User list */}
          <div className="rounded-sm overflow-hidden" style={{ border: "1px solid hsl(0 0% 14%)" }}>
            <div className="grid grid-cols-12 px-4 py-2 text-[9px] mono uppercase tracking-wider text-muted-foreground/40"
              style={{ background: "hsl(0 0% 6%)", borderBottom: "1px solid hsl(0 0% 12%)" }}>
              <span className="col-span-5">User</span>
              <span className="col-span-5">Permissions</span>
              <span className="col-span-2 text-right">Actions</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">Loading users…</span>
              </div>
            ) : subusers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">No subusers yet</p>
                <p className="text-xs text-muted-foreground/40 mt-1">Invite someone to help manage this server</p>
              </div>
            ) : (
              subusers.map((u, i) => (
                <motion.div
                  key={u.uuid}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="grid grid-cols-12 px-4 py-3 items-center"
                  style={{ borderBottom: i < subusers.length - 1 ? "1px solid hsl(0 0% 9%)" : "none" }}
                >
                  {/* User info */}
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                      style={{ background: "hsl(350 85% 20%)", color: "hsl(350 85% 65%)" }}>
                      {(u.nnAccount?.name || u.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {u.nnAccount?.name || u.username}
                        </p>
                        {u.nnAccount
                          ? <UserCheck size={10} className="text-green-400 shrink-0" />
                          : <UserX size={10} className="text-yellow-400 shrink-0" />
                        }
                      </div>
                      <p className="text-[10px] text-muted-foreground/50 truncate">{u.email}</p>
                      {u.nnAccount && (
                        <p className="text-[9px] text-muted-foreground/30 mono">@{u.nnAccount.username}</p>
                      )}
                    </div>
                  </div>

                  {/* Permissions summary */}
                  <div className="col-span-5 flex flex-wrap gap-1">
                    {u.permissions.slice(0, 4).map(perm => {
                      const label = PERMISSION_GROUPS.flatMap(g => g.perms).find(p => p.key === perm)?.label ?? perm.split(".")[1];
                      return (
                        <span key={perm} className="px-1.5 py-0.5 rounded-sm text-[9px] mono"
                          style={{ background: "hsl(0 0% 12%)", color: "hsl(0 0% 55%)", border: "1px solid hsl(0 0% 18%)" }}>
                          {label}
                        </span>
                      );
                    })}
                    {u.permissions.length > 4 && (
                      <span className="text-[9px] text-muted-foreground/40">+{u.permissions.length - 4} more</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => { setEditTarget(u); setEditPerms([...u.permissions]); setSaveError(""); }}
                      className="flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] font-medium transition-all hover:brightness-110"
                      style={{ background: "hsl(0 0% 12%)", color: "hsl(0 0% 55%)", border: "1px solid hsl(0 0% 20%)" }}>
                      <Shield size={9} /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(u)}
                      className="p-1.5 rounded-sm text-muted-foreground/40 hover:text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
      </div>

      {/* Edit permissions modal */}
      <AnimatePresence>
        {editTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
            onClick={() => setEditTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-sm w-full max-w-lg max-h-[85vh] overflow-y-auto"
              style={{ background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 20%)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="sticky top-0 flex items-center justify-between px-5 py-4"
                style={{ background: "hsl(0 0% 8%)", borderBottom: "1px solid hsl(0 0% 14%)" }}>
                <div>
                  <p className="text-sm font-semibold text-foreground">Edit Permissions</p>
                  <p className="text-[10px] text-muted-foreground/50 mono mt-0.5">{editTarget.email}</p>
                </div>
                <button onClick={() => setEditTarget(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="px-5 py-4 space-y-5">
                {PERMISSION_GROUPS.map(group => (
                  <div key={group.group}>
                    <p className="text-[9px] mono uppercase tracking-wider text-muted-foreground/40 mb-2">{group.group}</p>
                    <div className="space-y-1.5">
                      {group.perms.map(p => (
                        <button
                          key={p.key}
                          onClick={() => setEditPerms(prev => togglePerm(prev, p.key))}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-sm text-xs transition-all text-left"
                          style={{
                            background: editPerms.includes(p.key) ? "hsl(142 60% 8%)" : "hsl(0 0% 7%)",
                            border: `1px solid ${editPerms.includes(p.key) ? "hsl(142 60% 22%)" : "hsl(0 0% 14%)"}`,
                          }}
                        >
                          <div>
                            <span style={{ color: editPerms.includes(p.key) ? "hsl(142 70% 55%)" : "hsl(0 0% 65%)" }}>{p.label}</span>
                            <p className="text-[10px] text-muted-foreground/40 mt-0.5">{p.desc}</p>
                          </div>
                          <div className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                            style={{
                              background: editPerms.includes(p.key) ? "hsl(142 60% 30%)" : "hsl(0 0% 15%)",
                              border: `1px solid ${editPerms.includes(p.key) ? "hsl(142 60% 40%)" : "hsl(0 0% 25%)"}`,
                            }}>
                            {editPerms.includes(p.key) && <Check size={10} className="text-green-400" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {saveError && <p className="text-xs" style={{ color: "hsl(350 85% 65%)" }}>{saveError}</p>}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setEditTarget(null)}
                    className="h-10 px-4 rounded-sm text-xs text-muted-foreground hover:text-foreground transition-colors"
                    style={{ border: "1px solid hsl(0 0% 20%)" }}>
                    Cancel
                  </button>
                  <button onClick={savePermissions} disabled={saving}
                    className="flex-1 h-10 flex items-center justify-center gap-2 rounded-sm text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                    style={{ background: "hsl(350 85% 45%)", color: "white" }}>
                    {saving ? <><Loader2 size={12} className="animate-spin" /> Saving…</> : <><Check size={12} /> Save Permissions</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-sm p-6 max-w-sm w-full"
              style={{ background: "hsl(0 0% 8%)", border: "1px solid hsl(350 85% 30%)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle size={18} className="text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Remove user?</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5 truncate">{deleteTarget.email}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-5">This user will lose all access to the server immediately.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)}
                  className="flex-1 h-9 rounded-sm text-xs text-muted-foreground hover:text-foreground transition-colors"
                  style={{ border: "1px solid hsl(0 0% 20%)" }}>
                  Cancel
                </button>
                <button onClick={removeUser} disabled={deleting}
                  className="flex-1 h-9 rounded-sm text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                  style={{ background: "hsl(350 85% 45%)", color: "white" }}>
                  {deleting ? <Loader2 size={12} className="animate-spin mx-auto" /> : "Remove"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ServerUsers;
