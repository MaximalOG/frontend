import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder, FileText, RefreshCw, Upload, Trash2, Edit3,
  Save, X, ChevronRight, Home, Loader2, AlertCircle, FolderOpen,
} from "lucide-react";
import ServerPageShell from "@/components/ServerPageShell";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

interface ServerData {
  id: string; name: string; status: string;
  plan: string; ram: string; cpu: string; ssd?: string;
  host?: string; customAddress?: string | null;
}

interface FileEntry {
  attributes: {
    name: string; mode: string; size: number;
    is_file: boolean; is_symlink: boolean;
    mimetype: string; created_at: string; modified_at: string;
  };
}

function formatSize(b: number): string {
  if (b === 0) return "0 B";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
}

const TEXT_EXTS = new Set([
  "txt","json","yml","yaml","properties","cfg","conf","config",
  "toml","sh","bash","log","md","xml","html","css","js","ts",
  "java","py","ini","env",
]);
const isEditable = (name: string) =>
  TEXT_EXTS.has(name.split(".").pop()?.toLowerCase() ?? "");

const ServerFiles = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, token, logout } = useAuth();

  const [server, setServer]               = useState<ServerData | null>(null);
  const [loadingServer, setLoadingServer] = useState(true);
  const [directory, setDirectory]         = useState("/");
  const [files, setFiles]                 = useState<FileEntry[]>([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");

  const [editingFile, setEditingFile]     = useState<string | null>(null);
  const [editContent, setEditContent]     = useState("");
  const [editLoading, setEditLoading]     = useState(false);
  const [editSaving, setEditSaving]       = useState(false);
  const [editError, setEditError]         = useState("");

  const [deleteTarget, setDeleteTarget]   = useState<FileEntry | null>(null);
  const [deleting, setDeleting]           = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading]         = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { state: { from: `/server/${id}/files` } });
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
      finally { setLoadingServer(false); }
    })();
  }, [user, id, token, logout, navigate]);

  const loadFiles = useCallback(async (dir: string) => {
    setLoading(true); setError("");
    try {
      const res = await apiFetch(
        `/api/servers/${id}/files?directory=${encodeURIComponent(dir)}`,
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      if (!res.ok) { const e = await res.json(); setError(e.error || "Failed to load files."); return; }
      setFiles(await res.json());
      setDirectory(dir);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }, [id, token]);

  useEffect(() => {
    if (user && !loadingServer) loadFiles("/");
  }, [user, loadingServer, loadFiles]);

  const breadcrumbs = directory.split("/").filter(Boolean);
  const navigateTo = (dir: string) => { setEditingFile(null); loadFiles(dir); };
  const enterFolder = (name: string) =>
    navigateTo(directory === "/" ? `/${name}` : `${directory}/${name}`);
  const goUp = () => {
    const p = directory.split("/").filter(Boolean);
    p.pop();
    navigateTo(p.length === 0 ? "/" : `/${p.join("/")}`);
  };

  const openFile = async (name: string) => {
    const path = directory === "/" ? `/${name}` : `${directory}/${name}`;
    setEditingFile(path); setEditContent(""); setEditError(""); setEditLoading(true);
    try {
      const res = await apiFetch(
        `/api/servers/${id}/files/contents?file=${encodeURIComponent(path)}`,
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      if (!res.ok) { const e = await res.json(); setEditError(e.error || "Could not read file."); return; }
      const data = await res.json();
      setEditContent(data.content ?? "");
    } catch { setEditError("Network error."); }
    finally { setEditLoading(false); }
  };

  const saveFile = async () => {
    if (!editingFile) return;
    setEditSaving(true); setEditError("");
    try {
      const res = await apiFetch(
        `/api/servers/${id}/files/write?file=${encodeURIComponent(editingFile)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ content: editContent }),
        }
      );
      if (!res.ok) { const e = await res.json(); setEditError(e.error || "Save failed."); return; }
      setEditingFile(null);
      loadFiles(directory);
    } catch { setEditError("Network error."); }
    finally { setEditSaving(false); }
  };

  const deleteFile = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const path = directory === "/"
      ? `/${deleteTarget.attributes.name}`
      : `${directory}/${deleteTarget.attributes.name}`;
    try {
      const res = await apiFetch(`/api/servers/${id}/files`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ files: [{ name: path }] }),
      });
      if (!res.ok) { const e = await res.json(); setError(e.error || "Delete failed."); }
      else loadFiles(directory);
    } catch { setError("Network error."); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  if (authLoading || loadingServer) return (
    <div className="flex items-center justify-center h-screen" style={{ background: "#080810" }}>
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#a855f7" }} />
    </div>
  );

  const sorted = [...files].sort((a, b) => {
    if (a.attributes.is_file !== b.attributes.is_file) return a.attributes.is_file ? 1 : -1;
    return a.attributes.name.localeCompare(b.attributes.name);
  });

  /* ── The files page needs full-height flex layout inside the shell.
     ServerPageShell provides the sidebar + mobile drawer; the children
     slot gets the scrollable content area. We break out of the normal
     padding by using a negative-margin trick on the inner container.    */
  return (
    <ServerPageShell server={server} title="Files" maxWidth="max-w-none">

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" multiple className="hidden"
        accept=".jar,.yml,.yaml,.json,.txt,.properties,.cfg,.conf,.toml,.sh,.log,.xml,.sk,.zip"
        onChange={async e => {
          const list = e.target.files;
          if (!list || list.length === 0) return;
          const ALLOWED = new Set(["jar","yml","yaml","json","txt","properties","cfg","conf","toml","sh","log","xml","sk","zip","md","ini","env"]);
          const blocked = Array.from(list).filter(f => !ALLOWED.has(f.name.split(".").pop()?.toLowerCase() ?? ""));
          if (blocked.length > 0) {
            setError(`Cannot upload: ${blocked.map(f => f.name).join(", ")} — file type not allowed.`);
            e.target.value = ""; return;
          }
          setUploading(true);
          try {
            for (const file of Array.from(list)) {
              const path = directory === "/" ? `/${file.name}` : `${directory}/${file.name}`;
              await apiFetch(`/api/servers/${id}/files/write?file=${encodeURIComponent(path)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
                body: JSON.stringify({ content: await file.text() }),
              });
            }
            loadFiles(directory);
          } catch { setError("Upload failed."); }
          finally { setUploading(false); e.target.value = ""; }
        }}
      />

      {/* Full-height file browser — nether background */}
      <div className="flex flex-col overflow-hidden relative rounded-xl"
        style={{ height: "calc(100vh - 120px)", minHeight: 400 }}>

        {/* Background */}
        <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden">
          <img src="/nether.jpg" alt="" className="w-full h-full object-cover"
            style={{ filter: "brightness(0.3) saturate(0.5)" }} />
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
        </div>

        {/* Content */}
        <div className="relative flex flex-col h-full overflow-hidden p-3 gap-3">

          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 flex-1 min-w-0 text-xs px-3 py-2 rounded-xl overflow-x-auto"
              style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <button onClick={() => navigateTo("/")} style={{ color: "#475569" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#94a3b8"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#475569"}>
                <Home size={11} />
              </button>
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1 shrink-0">
                  <ChevronRight size={10} style={{ color: "#1e293b" }} />
                  <button onClick={() => navigateTo("/" + breadcrumbs.slice(0, i + 1).join("/"))}
                    className="transition-colors truncate max-w-[100px]" style={{ color: "#64748b" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#94a3b8"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#64748b"}>
                    {crumb}
                  </button>
                </span>
              ))}
            </div>
            <button onClick={() => loadFiles(directory)} disabled={loading}
              className="w-8 h-8 flex items-center justify-center rounded-xl shrink-0"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shrink-0"
              style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "white" }}>
              {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
              Upload
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl px-4 py-2 text-xs flex items-center gap-2 shrink-0"
              style={{ background: "rgba(239,68,68,0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
              <AlertCircle size={12} /> {error}
              <button onClick={() => setError("")} className="ml-auto"><X size={11} /></button>
            </div>
          )}

          {/* File table */}
          <div className="flex-1 rounded-xl overflow-hidden flex flex-col min-h-0"
            style={{ background: "rgba(6,6,8,0.75)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)" }}>

            {/* Column headers */}
            <div className="grid grid-cols-12 px-4 py-2.5 text-[9px] mono uppercase tracking-wider shrink-0"
              style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)", color: "#334155" }}>
              <span className="col-span-7 sm:col-span-6">Name</span>
              <span className="hidden sm:block col-span-2 text-right">Size</span>
              <span className="hidden sm:block col-span-3 text-right">Modified</span>
              <span className="col-span-5 sm:col-span-1" />
            </div>

            {/* Go up */}
            {directory !== "/" && (
              <button onClick={goUp}
                className="w-full grid grid-cols-12 px-4 py-2.5 text-xs text-left shrink-0 transition-colors hover:bg-white/[0.04]"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", color: "#64748b" }}>
                <span className="col-span-12 flex items-center gap-2">
                  <Folder size={13} className="text-yellow-500/70 shrink-0" /> ..
                </span>
              </button>
            )}

            {/* Rows */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-12" style={{ color: "#475569" }}>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-sm">Loading…</span>
                </div>
              ) : sorted.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-8 h-8 mx-auto mb-2" style={{ color: "#1e293b" }} />
                  <p className="text-sm" style={{ color: "#334155" }}>Empty directory</p>
                </div>
              ) : sorted.map((f, i) => {
                const attr = f.attributes;
                const canEdit = attr.is_file && isEditable(attr.name);
                return (
                  <motion.div key={attr.name}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                    className="group grid grid-cols-12 px-4 py-2.5 text-xs items-center transition-colors hover:bg-white/[0.04]"
                    style={{ borderBottom: i < sorted.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <div className="col-span-7 sm:col-span-6 flex items-center gap-2.5 min-w-0">
                      {attr.is_file
                        ? <FileText size={13} className="text-muted-foreground/35 shrink-0" />
                        : <Folder size={13} className="text-yellow-500/70 shrink-0" />}
                      <button
                        onClick={() => attr.is_file ? (canEdit ? openFile(attr.name) : undefined) : enterFolder(attr.name)}
                        className="truncate text-left hover:underline"
                        style={{ color: attr.is_file ? (canEdit ? "#e2e8f0" : "#475569") : "#fbbf24" }}>
                        {attr.name}
                      </button>
                    </div>
                    <span className="hidden sm:block col-span-2 text-right mono" style={{ color: "#334155" }}>
                      {attr.is_file ? formatSize(attr.size) : "—"}
                    </span>
                    <span className="hidden sm:block col-span-3 text-right" style={{ color: "#334155" }}>
                      {formatDate(attr.modified_at)}
                    </span>
                    <div className="col-span-5 sm:col-span-1 flex items-center justify-end gap-1">
                      {canEdit && (
                        <button onClick={() => openFile(attr.name)}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: "#64748b" }}>
                          <Edit3 size={11} />
                        </button>
                      )}
                      <button onClick={() => setDeleteTarget(f)}
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: "#64748b" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#f87171"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#64748b"}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── File editor modal ── */}
      <AnimatePresence>
        {editingFile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
            onClick={() => !editSaving && setEditingFile(null)}>
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="flex flex-col rounded-2xl overflow-hidden w-full max-w-3xl"
              style={{ maxHeight: "85vh", background: "#0a0a12", border: "1px solid rgba(139,92,246,0.3)", boxShadow: "0 24px 64px rgba(0,0,0,0.8)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3.5 shrink-0"
                style={{ background: "#0d0d1a", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText size={14} style={{ color: "#a78bfa", flexShrink: 0 }} />
                  <span className="text-sm font-medium mono truncate" style={{ color: "#f1f5f9" }}>{editingFile}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {editError && <span className="text-[10px]" style={{ color: "#f87171" }}>{editError}</span>}
                  <button onClick={saveFile} disabled={editSaving || editLoading}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-50 transition-all hover:opacity-90"
                    style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" }}>
                    {editSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                  </button>
                  <button onClick={() => setEditingFile(null)}
                    className="p-1.5 rounded-xl transition-colors" style={{ color: "#475569" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#94a3b8"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#475569"}>
                    <X size={16} />
                  </button>
                </div>
              </div>
              {editLoading
                ? <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#a855f7" }} />
                  </div>
                : <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                    spellCheck={false}
                    className="flex-1 font-mono text-[12px] bg-transparent outline-none resize-none leading-relaxed overflow-y-auto"
                    style={{ padding: "16px 20px", color: "#e2e8f0", minHeight: 300 }} />
              }
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete confirm modal ── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
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
                  <p className="text-sm font-bold" style={{ color: "#f1f5f9" }}>
                    Delete {deleteTarget.attributes.is_file ? "file" : "folder"}?
                  </p>
                  <p className="text-[10px] mono mt-0.5 truncate max-w-[200px]" style={{ color: "#475569" }}>
                    {deleteTarget.attributes.name}
                  </p>
                </div>
              </div>
              <p className="text-xs mb-5" style={{ color: "#64748b" }}>This cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteTarget(null)}
                  className="flex-1 h-9 rounded-xl text-xs"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>Cancel</button>
                <button onClick={deleteFile} disabled={deleting}
                  className="flex-1 h-9 flex items-center justify-center gap-2 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg,#991b1b,#dc2626)", color: "white" }}>
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ServerPageShell>
  );
};

export default ServerFiles;
