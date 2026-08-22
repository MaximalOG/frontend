import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder, FileText, RefreshCw, Upload, Trash2, Edit3,
  Save, X, ChevronRight, Home, Loader2, AlertCircle, FolderOpen,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import ServerSidebar from "@/components/ServerSidebar";
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
  if (b < 1024*1024) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1024/1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}); } catch { return "—"; }
}

const TEXT_EXTS = new Set(["txt","json","yml","yaml","properties","cfg","conf","config","toml","sh","bash","log","md","xml","html","css","js","ts","java","py","ini","env"]);
const isEditable = (name: string) => TEXT_EXTS.has(name.split(".").pop()?.toLowerCase() ?? "");

const ServerFiles = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, token, logout } = useAuth();

  const [server, setServer]           = useState<ServerData | null>(null);
  const [loadingServer, setLoadingServer] = useState(true);

  const [directory, setDirectory]     = useState("/");
  const [files, setFiles]             = useState<FileEntry[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving]   = useState(false);
  const [editError, setEditError]     = useState("");

  const [deleteTarget, setDeleteTarget] = useState<FileEntry | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading]     = useState(false);

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
      const res = await apiFetch(`/api/servers/${id}/files?directory=${encodeURIComponent(dir)}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) { const e = await res.json(); setError(e.error || "Failed to load files."); return; }
      setFiles(await res.json()); setDirectory(dir);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }, [id, token]);

  useEffect(() => { if (user && !loadingServer) loadFiles("/"); }, [user, loadingServer, loadFiles]);

  const breadcrumbs = directory.split("/").filter(Boolean);
  const navigateTo = (dir: string) => { setEditingFile(null); loadFiles(dir); };
  const enterFolder = (name: string) => navigateTo(directory === "/" ? `/${name}` : `${directory}/${name}`);
  const goUp = () => { const p = directory.split("/").filter(Boolean); p.pop(); navigateTo(p.length===0?"/":`/${p.join("/")}`); };

  const openFile = async (name: string) => {
    const path = directory === "/" ? `/${name}` : `${directory}/${name}`;
    setEditingFile(path); setEditContent(""); setEditError(""); setEditLoading(true);
    try {
      const res = await apiFetch(`/api/servers/${id}/files/contents?file=${encodeURIComponent(path)}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) { const e = await res.json(); setEditError(e.error||"Could not read file."); return; }
      const data = await res.json(); setEditContent(data.content ?? "");
    } catch { setEditError("Network error."); }
    finally { setEditLoading(false); }
  };

  const saveFile = async () => {
    if (!editingFile) return;
    setEditSaving(true); setEditError("");
    try {
      const res = await apiFetch(`/api/servers/${id}/files/write?file=${encodeURIComponent(editingFile)}`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) { const e = await res.json(); setEditError(e.error||"Save failed."); return; }
      setEditingFile(null); loadFiles(directory);
    } catch { setEditError("Network error."); }
    finally { setEditSaving(false); }
  };

  const deleteFile = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const path = directory==="/"?`/${deleteTarget.attributes.name}`:`${directory}/${deleteTarget.attributes.name}`;
    try {
      const res = await apiFetch(`/api/servers/${id}/files`, {
        method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ files: [{ name: path, isFile: deleteTarget.attributes.is_file }] }),
      });
      if (!res.ok) { const e = await res.json(); setError(e.error||"Delete failed."); }
      else loadFiles(directory);
    } catch { setError("Network error."); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  if (authLoading || loadingServer) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  const sorted = [...files].sort((a,b) => {
    if (a.attributes.is_file !== b.attributes.is_file) return a.attributes.is_file?1:-1;
    return a.attributes.name.localeCompare(b.attributes.name);
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={async e => {
        const list = e.target.files; if (!list||list.length===0) return;
        setUploading(true);
        try {
          for (const file of Array.from(list)) {
            const path = directory==="/"?`/${file.name}`:`${directory}/${file.name}`;
            const text = await file.text();
            await apiFetch(`/api/servers/${id}/files/write?file=${encodeURIComponent(path)}`, {
              method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${token()}`},
              body: JSON.stringify({ content: text }),
            });
          }
          loadFiles(directory);
        } catch { setError("Upload failed."); }
        finally { setUploading(false); e.target.value=""; }
      }} />

      <div className="flex flex-1 overflow-hidden" style={{ paddingTop: 64 }}>

        {/* Sidebar */}
        <div className="hidden md:flex flex-col h-[calc(100vh-64px)] sticky top-16 px-4 py-5 overflow-y-auto"
          style={{ width: 236, borderRight: "1px solid hsl(0 0% 12%)", background: "hsl(0 0% 4.5%)" }}>
          {server && <ServerSidebar server={server} onPower={async () => {}} powerLoading={null} />}
        </div>

        {/* Main — blurred background panel */}
        <div className="flex-1 flex flex-col overflow-hidden relative">

          {/* Blurred NetherNodes-branded background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Dark gradient base */}
            <div className="absolute inset-0" style={{ background: "hsl(0 0% 4%)" }} />
            {/* Red glow orbs — NetherNodes brand */}
            <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full"
              style={{ background: "radial-gradient(circle, hsl(350 85% 30% / 0.15) 0%, transparent 70%)", filter: "blur(40px)" }} />
            <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full"
              style={{ background: "radial-gradient(circle, hsl(350 85% 25% / 0.12) 0%, transparent 70%)", filter: "blur(60px)" }} />
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-64 rounded-full"
              style={{ background: "radial-gradient(ellipse, hsl(350 70% 20% / 0.08) 0%, transparent 70%)", filter: "blur(30px)" }} />
          </div>

          {/* Content over the background */}
          <div className="relative flex flex-col flex-1 overflow-hidden p-4">

            {/* Toolbar */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {/* Breadcrumbs */}
              <div className="flex items-center gap-1 flex-1 min-w-0 text-xs px-3 py-2 rounded-sm"
                style={{ background: "hsl(0 0% 8% / 0.8)", backdropFilter: "blur(12px)", border: "1px solid hsl(0 0% 16%)" }}>
                <button onClick={() => navigateTo("/")} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Home size={11} />
                </button>
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <ChevronRight size={10} className="text-muted-foreground/30" />
                    <button onClick={() => navigateTo("/"+breadcrumbs.slice(0,i+1).join("/"))}
                      className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px]">
                      {crumb}
                    </button>
                  </span>
                ))}
              </div>

              <button onClick={() => loadFiles(directory)} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-sm text-xs transition-all hover:brightness-110"
                style={{ background: "hsl(0 0% 8% / 0.8)", backdropFilter: "blur(12px)", border: "1px solid hsl(0 0% 16%)", color: "hsl(0 0% 60%)" }}>
                <RefreshCw size={11} className={loading?"animate-spin":""} />
              </button>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-sm text-xs font-medium transition-all hover:brightness-110"
                style={{ background: "hsl(350 85% 45%)", color: "white" }}>
                {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                Upload
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-sm px-4 py-2 mb-3 text-xs flex items-center gap-2"
                style={{ background: "hsl(350 85% 8% / 0.9)", backdropFilter: "blur(8px)", border: "1px solid hsl(350 85% 25%)", color: "hsl(350 85% 65%)" }}>
                <AlertCircle size={12} /> {error}
                <button onClick={() => setError("")} className="ml-auto"><X size={11} /></button>
              </div>
            )}

            {/* Editor */}
            <AnimatePresence>
              {editingFile && (
                <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                  className="rounded-sm overflow-hidden mb-3 flex flex-col"
                  style={{ border: "1px solid hsl(350 85% 28%)", background: "hsl(0 0% 5% / 0.95)", backdropFilter: "blur(12px)", maxHeight: "45vh" }}>
                  <div className="flex items-center justify-between px-4 py-2.5 shrink-0"
                    style={{ background: "hsl(350 85% 8%)", borderBottom: "1px solid hsl(350 85% 18%)" }}>
                    <div className="flex items-center gap-2">
                      <FileText size={12} className="text-primary" />
                      <span className="text-xs mono text-foreground/80 truncate max-w-xs">{editingFile}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {editError && <span className="text-[10px] text-red-400">{editError}</span>}
                      <button onClick={saveFile} disabled={editSaving||editLoading}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-sm text-[11px] font-medium hover:brightness-110 disabled:opacity-50"
                        style={{ background: "hsl(142 60% 15%)", color: "hsl(142 70% 55%)", border: "1px solid hsl(142 60% 25%)" }}>
                        {editSaving?<Loader2 size={11} className="animate-spin"/>:<Save size={11}/>} Save
                      </button>
                      <button onClick={() => setEditingFile(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  {editLoading
                    ? <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary"/></div>
                    : <textarea value={editContent} onChange={e=>setEditContent(e.target.value)}
                        spellCheck={false}
                        className="flex-1 font-mono text-xs text-foreground/90 bg-transparent outline-none resize-none p-4 leading-relaxed overflow-y-auto"
                        style={{ minHeight: 200 }}
                      />
                  }
                </motion.div>
              )}
            </AnimatePresence>

            {/* File table — glassmorphism panel */}
            <div className="rounded-sm overflow-hidden flex-1 flex flex-col"
              style={{ background: "hsl(0 0% 6% / 0.85)", backdropFilter: "blur(16px)", border: "1px solid hsl(0 0% 16%)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>

              {/* Header */}
              <div className="grid grid-cols-12 px-4 py-2.5 text-[9px] mono uppercase tracking-wider text-muted-foreground/40 shrink-0"
                style={{ background: "hsl(0 0% 7% / 0.9)", borderBottom: "1px solid hsl(0 0% 13%)" }}>
                <span className="col-span-6">Name</span>
                <span className="col-span-2 text-right">Size</span>
                <span className="col-span-3 text-right">Modified</span>
                <span className="col-span-1" />
              </div>

              {/* Go up */}
              {directory !== "/" && (
                <button onClick={goUp}
                  className="w-full grid grid-cols-12 px-4 py-2.5 text-xs text-muted-foreground hover:bg-white/5 transition-colors text-left"
                  style={{ borderBottom: "1px solid hsl(0 0% 10%)" }}>
                  <span className="col-span-12 flex items-center gap-2">
                    <Folder size={13} className="text-yellow-500/70 shrink-0" /> ..
                  </span>
                </button>
              )}

              {/* Files */}
              <div className="overflow-y-auto flex-1">
                {loading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /><span className="text-sm">Loading…</span>
                  </div>
                ) : sorted.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground/50">Empty directory</p>
                  </div>
                ) : sorted.map((f, i) => {
                  const attr = f.attributes;
                  const canEdit = attr.is_file && isEditable(attr.name);
                  return (
                    <motion.div key={attr.name}
                      initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.015}}
                      className="group grid grid-cols-12 px-4 py-2.5 text-xs items-center hover:bg-white/[0.04] transition-colors"
                      style={{ borderBottom: i<sorted.length-1 ? "1px solid hsl(0 0% 9%)" : "none" }}>
                      <div className="col-span-6 flex items-center gap-2.5 min-w-0">
                        {attr.is_file
                          ? <FileText size={13} className="text-muted-foreground/35 shrink-0" />
                          : <Folder size={13} className="text-yellow-500/70 shrink-0" />}
                        <button
                          onClick={() => attr.is_file ? (canEdit ? openFile(attr.name) : undefined) : enterFolder(attr.name)}
                          className="truncate text-left transition-colors"
                          style={{ color: attr.is_file ? (canEdit?"hsl(0 0% 85%)":"hsl(0 0% 50%)") : "hsl(38 90% 70%)" }}>
                          {attr.name}
                        </button>
                      </div>
                      <span className="col-span-2 text-right text-muted-foreground/40 mono">{attr.is_file?formatSize(attr.size):"—"}</span>
                      <span className="col-span-3 text-right text-muted-foreground/30">{formatDate(attr.modified_at)}</span>
                      <div className="col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEdit && <button onClick={()=>openFile(attr.name)} className="p-1 text-muted-foreground/40 hover:text-foreground"><Edit3 size={11}/></button>}
                        <button onClick={()=>setDeleteTarget(f)} className="p-1 text-muted-foreground/40 hover:text-red-400"><Trash2 size={11}/></button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{background:"rgba(0,0,0,0.75)",backdropFilter:"blur(4px)"}}
            onClick={()=>setDeleteTarget(null)}>
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.95,opacity:0}}
              className="rounded-sm p-6 max-w-sm w-full"
              style={{background:"hsl(0 0% 8%)",border:"1px solid hsl(350 85% 30%)"}}
              onClick={e=>e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle size={18} className="text-primary shrink-0"/>
                <div>
                  <p className="text-sm font-semibold text-foreground">Delete {deleteTarget.attributes.is_file?"file":"folder"}?</p>
                  <p className="text-[10px] text-muted-foreground/50 font-mono mt-0.5 truncate">{deleteTarget.attributes.name}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-5">This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={()=>setDeleteTarget(null)} className="flex-1 h-9 rounded-sm text-xs text-muted-foreground hover:text-foreground" style={{border:"1px solid hsl(0 0% 20%)"}}>Cancel</button>
                <button onClick={deleteFile} disabled={deleting}
                  className="flex-1 h-9 rounded-sm text-xs font-semibold hover:brightness-110 disabled:opacity-50"
                  style={{background:"hsl(350 85% 45%)",color:"white"}}>
                  {deleting?<Loader2 size={12} className="animate-spin mx-auto"/>:"Delete"}
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
