import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Folder, File, FileText, RefreshCw, Upload,
  Trash2, Edit3, Save, X, ChevronRight, Home, Loader2,
  AlertCircle, Download, FolderOpen, Terminal, Users,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

const ease = [0.16, 1, 0.3, 1] as const;

interface FileEntry {
  attributes: {
    name: string;
    mode: string;
    mode_bits: string;
    size: number;
    is_file: boolean;
    is_symlink: boolean;
    mimetype: string;
    created_at: string;
    modified_at: string;
  };
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
}

const TEXT_EXTS = new Set([
  "txt", "json", "yml", "yaml", "properties", "cfg", "conf", "config",
  "toml", "sh", "bash", "log", "md", "xml", "html", "css", "js", "ts",
  "java", "py", "ini", "env",
]);

function isEditable(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return TEXT_EXTS.has(ext);
}

const ServerFiles = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, token, logout } = useAuth();

  const [serverName, setServerName] = useState("Server");
  const [loadingServer, setLoadingServer] = useState(true);

  const [directory, setDirectory] = useState("/");
  const [files, setFiles]         = useState<FileEntry[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  // Editor state
  const [editingFile, setEditingFile]     = useState<string | null>(null);
  const [editContent, setEditContent]     = useState("");
  const [editLoading, setEditLoading]     = useState(false);
  const [editSaving, setEditSaving]       = useState(false);
  const [editError, setEditError]         = useState("");

  // Delete confirm
  const [deleteTarget, setDeleteTarget]   = useState<FileEntry | null>(null);
  const [deleting, setDeleting]           = useState(false);

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading]         = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { state: { from: `/server/${id}/files` } });
  }, [authLoading, user, navigate, id]);

  // Load server name
  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      try {
        const res = await apiFetch("/api/servers", { headers: { Authorization: `Bearer ${token()}` } });
        if (res.status === 401) { logout(); navigate("/login"); return; }
        const all = await res.json();
        const srv = all.find((s: any) => s.id === id);
        if (srv) setServerName(srv.name);
      } catch {}
      finally { setLoadingServer(false); }
    })();
  }, [user, id, token, logout, navigate]);

  const loadFiles = useCallback(async (dir: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(
        `/api/servers/${id}/files?directory=${encodeURIComponent(dir)}`,
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      if (!res.ok) { const e = await res.json(); setError(e.error || "Failed to load files."); return; }
      const data = await res.json();
      setFiles(data);
      setDirectory(dir);
    } catch {
      setError("Network error loading files.");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    if (user && !loadingServer) loadFiles("/");
  }, [user, loadingServer, loadFiles]);

  // Build breadcrumbs
  const breadcrumbs = directory.split("/").filter(Boolean);

  const navigateTo = (dir: string) => {
    setEditingFile(null);
    loadFiles(dir);
  };

  const enterFolder = (name: string) => {
    const next = directory === "/" ? `/${name}` : `${directory}/${name}`;
    navigateTo(next);
  };

  const goUp = () => {
    const parts = directory.split("/").filter(Boolean);
    parts.pop();
    navigateTo(parts.length === 0 ? "/" : "/" + parts.join("/"));
  };

  // Open file for editing
  const openFile = async (name: string) => {
    const path = directory === "/" ? `/${name}` : `${directory}/${name}`;
    setEditingFile(path);
    setEditContent("");
    setEditError("");
    setEditLoading(true);
    try {
      const res = await apiFetch(
        `/api/servers/${id}/files/contents?file=${encodeURIComponent(path)}`,
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      if (!res.ok) { const e = await res.json(); setEditError(e.error || "Could not read file."); return; }
      const data = await res.json();
      setEditContent(data.content ?? "");
    } catch {
      setEditError("Network error reading file.");
    } finally {
      setEditLoading(false);
    }
  };

  const saveFile = async () => {
    if (!editingFile) return;
    setEditSaving(true);
    setEditError("");
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
    } catch {
      setEditError("Network error saving file.");
    } finally {
      setEditSaving(false);
    }
  };

  const deleteFile = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const name = deleteTarget.attributes.name;
    const path = directory === "/" ? `/${name}` : `${directory}/${name}`;
    try {
      const res = await apiFetch(`/api/servers/${id}/files`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ files: [{ name: path, isFile: deleteTarget.attributes.is_file }] }),
      });
      if (!res.ok) { const e = await res.json(); setError(e.error || "Delete failed."); }
      else loadFiles(directory);
    } catch {
      setError("Network error deleting file.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (authLoading || loadingServer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const sorted = [...files].sort((a, b) => {
    // Folders first, then files, alphabetically
    if (a.attributes.is_file !== b.attributes.is_file)
      return a.attributes.is_file ? 1 : -1;
    return a.attributes.name.localeCompare(b.attributes.name);
  });

  return (
    <div className="min-h-screen bg-background pb-8">
      <Navbar />
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={async (e) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;
        setUploading(true);
        try {
          for (const file of Array.from(fileList)) {
            const path = directory === "/" ? `/${file.name}` : `${directory}/${file.name}`;
            const text = await file.text();
            await apiFetch(`/api/servers/${id}/files/write?file=${encodeURIComponent(path)}`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
              body: JSON.stringify({ content: text }),
            });
          }
          loadFiles(directory);
        } catch { setError("Upload failed."); }
        finally { setUploading(false); e.target.value = ""; }
      }} />

      <div className="container mx-auto px-4 max-w-5xl pt-20">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }}>

          {/* Header */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <Link to="/dashboard" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={13} /> Dashboard
            </Link>
            <span className="text-muted-foreground/30">/</span>
            <span className="text-xs text-foreground font-medium">{serverName}</span>

            {/* Tab switcher */}
            <div className="ml-auto flex items-center gap-1 rounded-sm p-0.5" style={{ background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 16%)" }}>
              <Link to={`/server/${id}/console`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                <Terminal size={11} /> Console
              </Link>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium"
                style={{ background: "hsl(350 85% 45%)", color: "white" }}>
                <FolderOpen size={11} /> Files
              </span>
              <Link to={`/server/${id}/users`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                <Users size={11} /> Users
              </Link>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1 flex-1 min-w-0 text-xs">
              <button onClick={() => navigateTo("/")}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <Home size={11} />
              </button>
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  <ChevronRight size={10} className="text-muted-foreground/30" />
                  <button
                    onClick={() => navigateTo("/" + breadcrumbs.slice(0, i + 1).join("/"))}
                    className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px]"
                  >
                    {crumb}
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => loadFiles(directory)} disabled={loading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs text-muted-foreground hover:text-white transition-colors"
                style={{ border: "1px solid hsl(0 0% 20%)" }}>
                <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              </button>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: "hsl(0 0% 12%)", color: "hsl(0 0% 70%)", border: "1px solid hsl(0 0% 22%)" }}>
                {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                Upload
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-sm px-4 py-3 mb-4 text-xs flex items-center gap-2"
              style={{ background: "hsl(350 85% 8%)", border: "1px solid hsl(350 85% 25%)", color: "hsl(350 85% 65%)" }}>
              <AlertCircle size={13} /> {error}
              <button onClick={() => setError("")} className="ml-auto"><X size={11} /></button>
            </div>
          )}

          {/* File editor */}
          <AnimatePresence>
            {editingFile && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-sm overflow-hidden mb-4"
                style={{ border: "1px solid hsl(350 85% 30%)" }}
              >
                {/* Editor header */}
                <div className="flex items-center justify-between px-4 py-2.5"
                  style={{ background: "hsl(350 85% 8%)", borderBottom: "1px solid hsl(350 85% 20%)" }}>
                  <div className="flex items-center gap-2">
                    <FileText size={12} className="text-primary" />
                    <span className="text-xs font-mono text-foreground/80 truncate max-w-[300px]">{editingFile}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {editError && <span className="text-[10px] text-red-400">{editError}</span>}
                    <button onClick={saveFile} disabled={editSaving || editLoading}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-medium transition-all hover:brightness-110 disabled:opacity-50"
                      style={{ background: "hsl(142 60% 15%)", color: "hsl(142 70% 55%)", border: "1px solid hsl(142 60% 25%)" }}>
                      {editSaving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                      Save
                    </button>
                    <button onClick={() => setEditingFile(null)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                </div>
                {/* Editor body */}
                {editLoading
                  ? <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                  : <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      spellCheck={false}
                      className="w-full font-mono text-xs text-foreground/90 bg-transparent outline-none resize-none p-4 leading-relaxed"
                      style={{ minHeight: "400px", background: "hsl(0 0% 4%)" }}
                    />
                }
              </motion.div>
            )}
          </AnimatePresence>

          {/* File table */}
          <div className="rounded-sm overflow-hidden" style={{ border: "1px solid hsl(0 0% 14%)" }}>
            {/* Table header */}
            <div className="grid grid-cols-12 px-4 py-2 text-[9px] mono uppercase tracking-wider text-muted-foreground/40"
              style={{ background: "hsl(0 0% 6%)", borderBottom: "1px solid hsl(0 0% 12%)" }}>
              <span className="col-span-6">Name</span>
              <span className="col-span-2 text-right">Size</span>
              <span className="col-span-3 text-right">Modified</span>
              <span className="col-span-1" />
            </div>

            {/* Go up row */}
            {directory !== "/" && (
              <button onClick={goUp} className="w-full grid grid-cols-12 px-4 py-2.5 text-xs text-muted-foreground hover:bg-white/5 transition-colors text-left"
                style={{ borderBottom: "1px solid hsl(0 0% 10%)" }}>
                <span className="col-span-12 flex items-center gap-2">
                  <Folder size={13} className="text-yellow-500/70 shrink-0" />
                  ..
                </span>
              </button>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">Loading files…</span>
              </div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Empty directory
              </div>
            ) : (
              sorted.map((f, i) => {
                const attr = f.attributes;
                const canEdit = attr.is_file && isEditable(attr.name);
                const isCurrentlyEditing = editingFile === (directory === "/" ? `/${attr.name}` : `${directory}/${attr.name}`);

                return (
                  <motion.div
                    key={attr.name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="group grid grid-cols-12 px-4 py-2.5 text-xs items-center hover:bg-white/[0.03] transition-colors"
                    style={{
                      borderBottom: i < sorted.length - 1 ? "1px solid hsl(0 0% 9%)" : "none",
                      background: isCurrentlyEditing ? "hsl(350 85% 5%)" : undefined,
                    }}
                  >
                    {/* Name */}
                    <div className="col-span-6 flex items-center gap-2 min-w-0">
                      {attr.is_file
                        ? <FileText size={13} className="text-muted-foreground/40 shrink-0" />
                        : <Folder size={13} className="text-yellow-500/70 shrink-0" />
                      }
                      <button
                        onClick={() => attr.is_file ? (canEdit ? openFile(attr.name) : undefined) : enterFolder(attr.name)}
                        className="truncate text-left transition-colors"
                        style={{ color: attr.is_file ? (canEdit ? "hsl(0 0% 85%)" : "hsl(0 0% 55%)") : "hsl(38 90% 70%)" }}
                      >
                        {attr.name}
                      </button>
                    </div>

                    {/* Size */}
                    <span className="col-span-2 text-right text-muted-foreground/50 mono">
                      {attr.is_file ? formatSize(attr.size) : "—"}
                    </span>

                    {/* Modified */}
                    <span className="col-span-3 text-right text-muted-foreground/40">
                      {formatDate(attr.modified_at)}
                    </span>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canEdit && (
                        <button onClick={() => openFile(attr.name)}
                          className="p-1 rounded text-muted-foreground/50 hover:text-foreground transition-colors">
                          <Edit3 size={11} />
                        </button>
                      )}
                      <button onClick={() => setDeleteTarget(f)}
                        className="p-1 rounded text-muted-foreground/50 hover:text-red-400 transition-colors">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-sm p-6 max-w-sm w-full mx-4"
              style={{ background: "hsl(0 0% 8%)", border: "1px solid hsl(350 85% 30%)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle size={18} className="text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Delete {deleteTarget.attributes.is_file ? "file" : "folder"}?</p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">{deleteTarget.attributes.name}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-5">This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)}
                  className="flex-1 h-9 rounded-sm text-xs text-muted-foreground hover:text-foreground transition-colors"
                  style={{ border: "1px solid hsl(0 0% 20%)" }}>
                  Cancel
                </button>
                <button onClick={deleteFile} disabled={deleting}
                  className="flex-1 h-9 rounded-sm text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                  style={{ background: "hsl(350 85% 45%)", color: "white" }}>
                  {deleting ? <Loader2 size={12} className="animate-spin mx-auto" /> : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ServerFiles;
