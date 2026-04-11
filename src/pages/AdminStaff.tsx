import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Trash2, RefreshCw, Save, Eye, EyeOff } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ConfirmDialog from "@/components/ConfirmDialog";

const ease = [0.16, 1, 0.3, 1] as const;

const ALL_PERMISSIONS = [
  { key: "tickets",         label: "Support Tickets" },
  { key: "banner_sale",     label: "Banner Sale" },
  { key: "promo_codes",     label: "Promo Codes" },
  { key: "feedback",        label: "Customer Feedback" },
];

interface StaffMember {
  id: string;
  username: string;
  role: string;
  permissions: string[];
  createdAt: string;
}

const AdminStaff = () => {
  const { user, loading: authLoading, token, isOwner } = useAdminAuth();
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [newPerms, setNewPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isOwner)) navigate("/admin");
  }, [authLoading, user, isOwner, navigate]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/staff`, { headers: { "x-admin-token": token() } });
      if (res.ok) setStaff(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { if (isOwner) load(); }, [isOwner]);

  const togglePerm = (key: string) =>
    setNewPerms(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);

  const createStaff = async () => {
    if (!newUsername || !newPassword) { setError("Username and password required."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token() },
        body: JSON.stringify({ username: newUsername, password: newPassword, permissions: newPerms }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewUsername(""); setNewPassword(""); setNewPerms([]); setShowForm(false);
      load();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const deleteStaff = async (id: string) => {
    await fetch(`${import.meta.env.VITE_API_URL}/api/admin/staff/${id}`, { method: "DELETE", headers: { "x-admin-token": token() } });
    setDeleteTarget(null);
    load();
  };

  const updatePerms = async (id: string, permissions: string[]) => {
    await fetch(`${import.meta.env.VITE_API_URL}/api/admin/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token() },
      body: JSON.stringify({ permissions }),
    });
    load();
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove staff member"
        message={`Remove "${deleteTarget?.username}"? They will lose all access immediately.`}
        confirmLabel="Remove"
        onConfirm={() => deleteTarget && deleteStaff(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
      <div className="container mx-auto px-4 max-w-3xl pt-24">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>

          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" /> Staff Management
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Owner access only</p>
            </div>
            <div className="flex gap-2">
              <button onClick={load} className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs text-muted-foreground hover:text-white transition-colors"
                style={{ border: "1px solid hsl(0 0% 20%)" }}>
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
              </button>
              <button onClick={() => setShowForm(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-medium transition-all hover:brightness-110"
                style={{ background: "hsl(350 85% 45%)", color: "white" }}>
                <Plus size={12} /> Add Staff
              </button>
            </div>
          </div>

          {/* Add staff form */}
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="glass-surface rounded-sm p-5 mb-6 space-y-4"
              style={{ border: "1px solid hsl(350 85% 30%)" }}>
              <h3 className="text-sm font-bold text-foreground">New Staff Member</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider block mb-1">Username</label>
                  <input value={newUsername} onChange={e => setNewUsername(e.target.value)}
                    placeholder="staffname"
                    className="w-full rounded-sm px-3 py-2 text-sm text-foreground bg-transparent outline-none"
                    style={{ border: "1px solid hsl(0 0% 22%)" }} />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider block mb-1">Password</label>
                  <div className="relative">
                    <input type={showPw ? "text" : "password"} value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-sm px-3 py-2 text-sm text-foreground bg-transparent outline-none pr-8"
                      style={{ border: "1px solid hsl(0 0% 22%)" }} />
                    <button onClick={() => setShowPw(v => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground">
                      {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider block mb-2">Permissions</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PERMISSIONS.map(p => (
                    <button key={p.key} onClick={() => togglePerm(p.key)}
                      className="px-2.5 py-1 rounded-sm text-xs font-medium transition-all"
                      style={{
                        background: newPerms.includes(p.key) ? "hsl(350 85% 15%)" : "hsl(0 0% 10%)",
                        color: newPerms.includes(p.key) ? "hsl(350 85% 65%)" : "hsl(0 0% 45%)",
                        border: `1px solid ${newPerms.includes(p.key) ? "hsl(350 85% 30%)" : "hsl(0 0% 18%)"}`,
                      }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-xs" style={{ color: "hsl(350 85% 60%)" }}>{error}</p>}

              <button onClick={createStaff} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: "hsl(350 85% 45%)", color: "white" }}>
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? "Creating…" : "Create Staff Account"}
              </button>
            </motion.div>
          )}

          {/* Staff list */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading…</div>
          ) : staff.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No staff members yet.</div>
          ) : (
            <div className="space-y-3">
              {staff.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, ease }}
                  className="glass-surface rounded-sm p-4" style={{ border: "1px solid hsl(0 0% 16%)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-foreground">{s.username}</p>
                      <p className="text-[10px] text-muted-foreground/50 mono">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button onClick={() => setDeleteTarget(s)}
                      className="text-muted-foreground/40 hover:text-red-400 transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_PERMISSIONS.map(p => {
                      const has = s.permissions.includes(p.key);
                      return (
                        <button key={p.key}
                          onClick={() => updatePerms(s.id, has ? s.permissions.filter(x => x !== p.key) : [...s.permissions, p.key])}
                          className="px-2 py-0.5 rounded-sm text-[10px] font-medium transition-all"
                          style={{
                            background: has ? "hsl(142 60% 10%)" : "hsl(0 0% 8%)",
                            color: has ? "hsl(142 70% 55%)" : "hsl(0 0% 35%)",
                            border: `1px solid ${has ? "hsl(142 60% 20%)" : "hsl(0 0% 14%)"}`,
                          }}>
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminStaff;
