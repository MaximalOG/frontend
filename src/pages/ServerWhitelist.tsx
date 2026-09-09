import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  List, UserPlus, Trash2, ToggleLeft, ToggleRight,
  Loader2, AlertCircle, X, Check, Search, Shield,
} from "lucide-react";
import ServerPageShell from "@/components/ServerPageShell";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

interface ServerData {
  id: string; name: string; status: string;
  plan: string; ram: string; cpu: string; ssd?: string;
}

interface WhitelistPlayer {
  name: string; uuid?: string; addedAt?: string;
}

function PageShell({ server, children }: { server: ServerData | null; children: React.ReactNode }) {
  return (
    <ServerPageShell server={server} title="Whitelist" maxWidth="max-w-2xl">
      {children}
    </ServerPageShell>
  );
}

export default function ServerWhitelist() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, token, logout } = useAuth();

  const [server, setServer]           = useState<ServerData | null>(null);
  const [loadingServer, setLS]        = useState(true);
  const [players, setPlayers]         = useState<WhitelistPlayer[]>([]);
  const [whitelistOn, setWhitelistOn] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");
  const [newPlayer, setNewPlayer]     = useState("");
  const [adding, setAdding]           = useState(false);
  const [addError, setAddError]       = useState("");
  const [search, setSearch]           = useState("");
  const [deleteTarget, setDeleteTarget] = useState<WhitelistPlayer | null>(null);
  const [deleting, setDeleting]       = useState(false);
  const [toggling, setToggling]       = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { state: { from: `/server/${id}/whitelist` } });
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

  const loadWhitelist = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await apiFetch(`/api/servers/${id}/whitelist`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) {
        const e = await res.json();
        setError(e.error || "Failed to load whitelist.");
        return;
      }
      const data = await res.json();
      setPlayers(data.players ?? data ?? []);
      setWhitelistOn(data.enabled ?? false);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }, [id, token]);

  useEffect(() => {
    if (user && !loadingServer) loadWhitelist();
  }, [user, loadingServer, loadWhitelist]);

  const addPlayer = async () => {
    if (!newPlayer.trim()) { setAddError("Enter a player name."); return; }
    setAdding(true); setAddError("");
    try {
      const res = await apiFetch(`/api/servers/${id}/whitelist`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ username: newPlayer.trim() }),
      });
      if (!res.ok) { const e = await res.json(); setAddError(e.error || "Failed to add player."); return; }
      setNewPlayer("");
      setSuccess(`${newPlayer.trim()} added to whitelist.`);
      setTimeout(() => setSuccess(""), 3000);
      loadWhitelist();
    } catch { setAddError("Network error."); }
    finally { setAdding(false); }
  };

  const removePlayer = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/servers/${id}/whitelist/${encodeURIComponent(deleteTarget.name)}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) { const e = await res.json(); setError(e.error || "Failed to remove player."); }
      else {
        setSuccess(`${deleteTarget.name} removed.`);
        setTimeout(() => setSuccess(""), 3000);
        loadWhitelist();
      }
    } catch { setError("Network error."); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  const toggleWhitelist = async () => {
    setToggling(true);
    try {
      const res = await apiFetch(`/api/servers/${id}/whitelist/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ enabled: !whitelistOn }),
      });
      if (res.ok) setWhitelistOn(w => !w);
    } catch {}
    finally { setToggling(false); }
  };

  const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

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
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.22)" }}>
            <List size={16} style={{ color: "#f87171" }} />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: "#f1f5f9" }}>Whitelist</h1>
            <p className="text-[10px] mono mt-0.5" style={{ color: "#475569" }}>
              {players.length} player{players.length !== 1 ? "s" : ""} whitelisted
            </p>
          </div>
        </div>

        {/* Whitelist on/off toggle */}
        <button onClick={toggleWhitelist} disabled={toggling}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
          style={{
            background: whitelistOn ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.04)",
            color: whitelistOn ? "#4ade80" : "#64748b",
            border: `1px solid ${whitelistOn ? "rgba(74,222,128,0.22)" : "rgba(255,255,255,0.08)"}`,
          }}>
          {toggling ? <Loader2 size={12} className="animate-spin" /> :
            whitelistOn ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
          {whitelistOn ? "Whitelist On" : "Whitelist Off"}
        </button>
      </div>

      {/* Status messages */}
      <AnimatePresence>
        {(error || success) && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-xs"
            style={{
              background: error ? "rgba(239,68,68,0.08)" : "rgba(74,222,128,0.07)",
              border: `1px solid ${error ? "rgba(239,68,68,0.22)" : "rgba(74,222,128,0.2)"}`,
              color: error ? "#f87171" : "#4ade80",
            }}>
            {error ? <AlertCircle size={12} /> : <Check size={12} />}
            {error || success}
            <button onClick={() => { setError(""); setSuccess(""); }} className="ml-auto"><X size={11} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add player */}
      <div className="rounded-2xl p-4 mb-5"
        style={{ background: "linear-gradient(135deg,#0f0d1c,#0d0d18)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="text-[9px] mono uppercase tracking-widest mb-2" style={{ color: "#475569" }}>
          <UserPlus size={9} className="inline mr-1" />Add Player
        </p>
        <div className="flex gap-2">
          <input value={newPlayer} onChange={e => setNewPlayer(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addPlayer()}
            placeholder="Minecraft username…"
            className="flex-1 rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none"
            style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#f1f5f9" }} />
          <button onClick={addPlayer} disabled={adding || !newPlayer.trim()}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5"
            style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
            {adding ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
            Add
          </button>
        </div>
        {addError && <p className="text-xs mt-2" style={{ color: "#f87171" }}>{addError}</p>}
      </div>

      {/* Search */}
      {players.length > 5 && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <Search size={12} style={{ color: "#475569" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search players…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "#f1f5f9" }} />
          {search && <button onClick={() => setSearch("")} style={{ color: "#475569" }}><X size={12} /></button>}
        </div>
      )}

      {/* Player list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#475569" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-12 text-center"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Shield size={32} className="mx-auto mb-3" style={{ color: "#1e293b" }} />
          <p className="text-sm font-semibold" style={{ color: "#475569" }}>
            {search ? "No players match your search" : "Whitelist is empty"}
          </p>
          <p className="text-xs mt-1" style={{ color: "#334155" }}>
            {!search && "Add a player above to allow them to join"}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.07)", background: "#0b0b14" }}>
          {filtered.map((p, i) => (
            <motion.div key={p.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 px-4 py-3 transition-colors"
              style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>

              {/* Avatar */}
              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.18)" }}>
                <img src={`https://mc-heads.net/avatar/${p.name}/32`} alt={p.name}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>{p.name}</p>
                {p.uuid && <p className="text-[9px] mono mt-0.5 truncate" style={{ color: "#334155" }}>{p.uuid}</p>}
              </div>

              <button onClick={() => setDeleteTarget(p)}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:opacity-80 shrink-0"
                style={{ background: "rgba(239,68,68,0.07)", color: "#f87171", border: "1px solid rgba(239,68,68,0.18)" }}>
                <Trash2 size={12} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
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
                  <p className="text-sm font-bold" style={{ color: "#f1f5f9" }}>Remove from whitelist?</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#475569" }}>{deleteTarget.name}</p>
                </div>
              </div>
              <p className="text-xs mb-5" style={{ color: "#64748b" }}>
                {deleteTarget.name} will no longer be able to join the server.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                  className="flex-1 h-9 rounded-xl text-xs disabled:opacity-40"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>Cancel</button>
                <button onClick={removePlayer} disabled={deleting}
                  className="flex-1 h-9 flex items-center justify-center gap-2 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg,#991b1b,#dc2626)", color: "white" }}>
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : "Remove"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
