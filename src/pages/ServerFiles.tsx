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

// ── Syntax highlighting ───────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Shared color palette
const C = {
  comment:   "color:#4ade80;opacity:0.55;font-style:italic",
  key:       "color:#c084fc",
  eq:        "color:#475569",
  valTrue:   "color:#4ade80;font-weight:600",
  valFalse:  "color:#f87171;font-weight:600",
  valNum:    "color:#60a5fa",
  valStr:    "color:#e2e8f0",
  valEmpty:  "color:#334155",
  string:    "color:#fbbf24",          // quoted strings
  keyword:   "color:#f472b6;font-weight:600",
  number:    "color:#60a5fa",
  boolean:   "color:#4ade80;font-weight:600",
  boolFalse: "color:#f87171;font-weight:600",
  null_:     "color:#f87171;opacity:0.8",
  punct:     "color:#64748b",
  tag:       "color:#38bdf8",
  attr:      "color:#c084fc",
  heading:   "color:#f472b6;font-weight:700",
  bold:      "font-weight:700;color:#e2e8f0",
  italic_:   "font-style:italic;color:#e2e8f0",
  url:       "color:#60a5fa;text-decoration:underline",
  section:   "color:#fbbf24;font-weight:600",
  operator:  "color:#94a3b8",
  plain:     "color:#e2e8f0",
};

function sp(style: string, text: string) { return `<span style="${style}">${text}</span>`; }

// ── Shared helpers ────────────────────────────────────────────────────────────

function colorKVValue(raw: string): string {
  const v = raw.trim();
  if (v === "true")  return sp(C.valTrue,  escHtml(raw));
  if (v === "false") return sp(C.valFalse, escHtml(raw));
  if (/^-?\d+(\.\d+)?$/.test(v)) return sp(C.valNum, escHtml(raw));
  if (v === "")      return sp(C.valEmpty, "&#8203;");
  return sp(C.valStr, escHtml(raw));
}

// ── properties / cfg / ini / env / conf ──────────────────────────────────────

function highlightProperties(text: string): string {
  return text.split("\n").map(line => {
    if (/^\s*[#;]/.test(line)) return sp(C.comment, escHtml(line));
    if (!line.trim()) return "";
    // [section] headers
    if (/^\s*\[.+\]/.test(line)) return sp(C.section, escHtml(line));
    const eq = line.indexOf("=");
    if (eq !== -1) {
      return sp(C.key, escHtml(line.slice(0, eq)))
           + sp(C.eq,  escHtml("="))
           + colorKVValue(line.slice(eq + 1));
    }
    return sp(C.plain, escHtml(line));
  }).join("\n");
}

// ── YAML / yml ────────────────────────────────────────────────────────────────

function highlightYaml(text: string): string {
  return text.split("\n").map(line => {
    if (/^\s*#/.test(line)) return sp(C.comment, escHtml(line));
    if (!line.trim()) return "";
    // key: value
    const m = line.match(/^(\s*)([\w.\-]+)(\s*:\s*)(.*)$/);
    if (m) {
      const [, indent, key, colon, val] = m;
      const valTrimmed = val.trim();
      let valHtml: string;
      if (valTrimmed === "true")  valHtml = sp(C.boolean,   escHtml(val));
      else if (valTrimmed === "false") valHtml = sp(C.boolFalse, escHtml(val));
      else if (valTrimmed === "null" || valTrimmed === "~") valHtml = sp(C.null_, escHtml(val));
      else if (/^-?\d+(\.\d+)?$/.test(valTrimmed)) valHtml = sp(C.number, escHtml(val));
      else if (/^['"]/.test(valTrimmed)) valHtml = sp(C.string, escHtml(val));
      else if (val === "") valHtml = "";
      else valHtml = sp(C.valStr, escHtml(val));
      return escHtml(indent) + sp(C.key, escHtml(key)) + sp(C.punct, escHtml(colon)) + valHtml;
    }
    // list item
    if (/^\s*-\s/.test(line)) {
      const dm = line.match(/^(\s*-\s*)(.*)$/);
      if (dm) return sp(C.punct, escHtml(dm[1])) + sp(C.valStr, escHtml(dm[2]));
    }
    return sp(C.plain, escHtml(line));
  }).join("\n");
}

// ── TOML ──────────────────────────────────────────────────────────────────────

function highlightToml(text: string): string {
  return text.split("\n").map(line => {
    if (/^\s*#/.test(line)) return sp(C.comment, escHtml(line));
    if (!line.trim()) return "";
    if (/^\s*\[/.test(line)) return sp(C.section, escHtml(line));
    const eq = line.indexOf("=");
    if (eq !== -1) {
      const key = line.slice(0, eq);
      const val = line.slice(eq + 1).trim();
      let valHtml: string;
      if (val === "true")  valHtml = sp(C.boolean,   escHtml(line.slice(eq + 1)));
      else if (val === "false") valHtml = sp(C.boolFalse, escHtml(line.slice(eq + 1)));
      else if (/^-?\d+(\.\d+)?$/.test(val)) valHtml = sp(C.number, escHtml(line.slice(eq + 1)));
      else if (/^["']/.test(val)) valHtml = sp(C.string, escHtml(line.slice(eq + 1)));
      else valHtml = sp(C.valStr, escHtml(line.slice(eq + 1)));
      return sp(C.key, escHtml(key)) + sp(C.eq, "=") + valHtml;
    }
    return sp(C.plain, escHtml(line));
  }).join("\n");
}

// ── JSON ──────────────────────────────────────────────────────────────────────

function highlightJson(text: string): string {
  // Token-by-token pass — simple but effective
  let out = "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    // String
    if (ch === '"') {
      let j = i + 1;
      while (j < text.length) {
        if (text[j] === "\\" ) { j += 2; continue; }
        if (text[j] === '"')  { j++; break; }
        j++;
      }
      const raw = escHtml(text.slice(i, j));
      // Key (string followed by optional whitespace then colon)
      const after = text.slice(j).trimStart();
      out += after.startsWith(":") ? sp(C.key, raw) : sp(C.string, raw);
      i = j; continue;
    }
    // Number
    if (/[\d\-]/.test(ch) && (i === 0 || /[^.\w]/.test(text[i-1]))) {
      let j = i + 1;
      while (j < text.length && /[\d.eE+\-]/.test(text[j])) j++;
      out += sp(C.number, escHtml(text.slice(i, j)));
      i = j; continue;
    }
    // true / false / null
    if (text.startsWith("true",  i)) { out += sp(C.boolean,   "true");  i += 4; continue; }
    if (text.startsWith("false", i)) { out += sp(C.boolFalse, "false"); i += 5; continue; }
    if (text.startsWith("null",  i)) { out += sp(C.null_,     "null");  i += 4; continue; }
    // Punctuation
    if ("{}[]:,".includes(ch)) { out += sp(C.punct, escHtml(ch)); i++; continue; }
    // Newline / whitespace — preserve as-is
    out += escHtml(ch); i++;
  }
  return out;
}

// ── XML / HTML ────────────────────────────────────────────────────────────────

function highlightXml(text: string): string {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "\x00LT\x00").replace(/>/g, "\x00GT\x00")
    // Restore so we can do regex on raw-ish text, then re-escape in spans
    .replace(/\x00LT\x00!--[\s\S]*?--\x00GT\x00/g, m =>
      sp(C.comment, m.replace(/\x00LT\x00/g, "&lt;").replace(/\x00GT\x00/g, "&gt;")))
    .replace(/\x00LT\x00\/?[\w:.-]+(?:\s[^]*?)?\x00GT\x00/g, m => {
      const inner = m.replace(/\x00LT\x00/g, "").replace(/\x00GT\x00/g, "");
      const withAttrs = inner
        .replace(/([\w:.-]+)(=)(".*?")/g,
          (_, a, e, v) => sp(C.attr, a) + sp(C.eq, e) + sp(C.string, escHtml(v)));
      // tag name is first word
      const named = withAttrs.replace(/^(\/?)([\w:.-]+)/, (_, sl, tag) =>
        escHtml(sl) + sp(C.tag, tag));
      return sp(C.punct, "&lt;") + named + sp(C.punct, "&gt;");
    })
    .replace(/\x00LT\x00/g, "&lt;").replace(/\x00GT\x00/g, "&gt;");
}

// ── Shell / bash ──────────────────────────────────────────────────────────────

const SH_KEYWORDS = new Set(["if","then","else","elif","fi","for","while","do","done",
  "case","esac","in","function","return","exit","echo","export","source","cd","set",
  "unset","local","readonly","shift","break","continue","true","false"]);

function highlightShell(text: string): string {
  return text.split("\n").map(line => {
    if (/^\s*#/.test(line)) return sp(C.comment, escHtml(line));
    if (!line.trim()) return "";
    let out = "";
    // Tokenise roughly
    const tokens = line.split(/(\s+|"[^"]*"|'[^']*'|[|&;()<>$])/);
    for (const tok of tokens) {
      if (!tok) continue;
      if (/^\s+$/.test(tok)) { out += tok; continue; }
      if (tok.startsWith("#")) { out += sp(C.comment, escHtml(tok)); continue; }
      if (/^["']/.test(tok))  { out += sp(C.string,  escHtml(tok)); continue; }
      if (SH_KEYWORDS.has(tok)) { out += sp(C.keyword, escHtml(tok)); continue; }
      if (/^\$[\w{]/.test(tok)) { out += sp(C.valNum, escHtml(tok)); continue; }
      if (/^[|&;()<>]$/.test(tok)) { out += sp(C.punct, escHtml(tok)); continue; }
      if (/^-?\d+$/.test(tok)) { out += sp(C.number, escHtml(tok)); continue; }
      out += sp(C.plain, escHtml(tok));
    }
    return out;
  }).join("\n");
}

// ── Plain text / log / md / txt ───────────────────────────────────────────────

function highlightLog(text: string): string {
  return text.split("\n").map(line => {
    if (!line.trim()) return "";
    // Timestamps / IPs
    const annotated = escHtml(line)
      .replace(/\b(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)/g,
        m => sp(C.number, m))
      .replace(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g, m => sp(C.valNum, m))
      .replace(/\b(ERROR|FATAL|CRITICAL)\b/g, m => sp(C.valFalse, m))
      .replace(/\b(WARN|WARNING)\b/g,         m => `<span style="color:#fbbf24;font-weight:600">${m}</span>`)
      .replace(/\b(INFO|DEBUG|TRACE)\b/g,     m => sp(C.boolean, m));
    return annotated;
  }).join("\n");
}

function highlightMarkdown(text: string): string {
  return text.split("\n").map(line => {
    if (!line.trim()) return "";
    // Headings
    if (/^#{1,6}\s/.test(line)) return sp(C.heading, escHtml(line));
    // Code fence
    if (/^```/.test(line)) return sp(C.punct, escHtml(line));
    // List items
    const esc = escHtml(line)
      // Inline code
      .replace(/`([^`]+)`/g, (_, c) => sp(C.string, "`" + c + "`"))
      // Bold **text**
      .replace(/\*\*(.+?)\*\*/g, (_, t) => `<strong style="${C.bold}">${t}</strong>`)
      // Italic *text*
      .replace(/\*(.+?)\*/g, (_, t) => `<em style="${C.italic_}">${t}</em>`)
      // [link](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) =>
        sp(C.plain, "[") + sp(C.valStr, label) + sp(C.plain, "](") + sp(C.url, href) + sp(C.plain, ")"));
    if (/^(\s*[-*+]|\d+\.)\s/.test(line)) return sp(C.punct, escHtml(line.match(/^(\s*[-*+]|\d+\.)\s/)?.[0] ?? "")) + esc.slice((line.match(/^(\s*[-*+]|\d+\.)\s/)?.[0] ?? "").length);
    return esc;
  }).join("\n");
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

function highlight(text: string, ext: string): string {
  switch (ext) {
    case "properties":
    case "cfg":
    case "conf":
    case "config":
    case "ini":
    case "env":
      return highlightProperties(text);
    case "yml":
    case "yaml":
      return highlightYaml(text);
    case "toml":
      return highlightToml(text);
    case "json":
      return highlightJson(text);
    case "xml":
    case "html":
    case "htm":
      return highlightXml(text);
    case "sh":
    case "bash":
      return highlightShell(text);
    case "log":
      return highlightLog(text);
    case "md":
    case "markdown":
      return highlightMarkdown(text);
    // txt / java / py / ts / js / css — plain with escaping
    default:
      return text.split("\n").map(l => escHtml(l) || "").join("\n");
  }
}

// ── Highlight editor — scroll-synced overlay ─────────────────────────────────
// The textarea is the scroll driver (it has the real scrollbar).
// The <pre> sits behind it and its scroll position is kept in sync via onScroll.
// This prevents the two layers drifting apart and eliminates the ghost-text glitch.
const HighlightEditor = ({
  content, ext, onChange,
}: { content: string; ext: string; onChange: (v: string) => void }) => {
  const preRef = useRef<HTMLPreElement>(null);

  const syncScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (preRef.current) {
      preRef.current.scrollTop  = e.currentTarget.scrollTop;
      preRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  return (
    <div className="flex-1 relative overflow-hidden" style={{ minHeight: 300 }}>
      {/* Highlighted backdrop — scroll is driven by the textarea below */}
      <pre
        ref={preRef}
        aria-hidden="true"
        className="absolute inset-0 font-mono text-[12px] leading-relaxed pointer-events-none select-none whitespace-pre"
        style={{
          padding: "16px 20px", margin: 0,
          overflow: "hidden", // pre never shows its own scrollbar
          zIndex: 1,
        }}
        dangerouslySetInnerHTML={{ __html: highlight(content, ext) + "\n" }}
      />
      {/* Textarea — the only scrollable element; text is transparent so the pre shows through */}
      <textarea
        value={content}
        onChange={e => onChange(e.target.value)}
        onScroll={syncScroll}
        spellCheck={false}
        className="absolute inset-0 w-full h-full font-mono text-[12px] bg-transparent outline-none resize-none leading-relaxed"
        style={{
          padding: "16px 20px",
          color: "transparent",
          caretColor: "#e2e8f0",
          zIndex: 2,
          overflowY: "auto",
          overflowX: "auto",
        }}
      />
    </div>
  );
};

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
        accept=".jar,.yml,.yaml,.json,.txt,.properties,.cfg,.conf,.toml,.sh,.log,.xml,.sk,.zip,.png,.gif,.webp,.ico,.jpg,.jpeg"
        onChange={async e => {
          const list = e.target.files;
          if (!list || list.length === 0) return;
          const ALLOWED = new Set(["jar","yml","yaml","json","txt","properties","cfg","conf","toml","sh","log","xml","sk","zip","md","ini","env","png","gif","webp","ico","jpg","jpeg"]);
          const BINARY  = new Set(["png","gif","webp","ico","jpg","jpeg","jar","zip"]);
          const blocked = Array.from(list).filter(f => !ALLOWED.has(f.name.split(".").pop()?.toLowerCase() ?? ""));
          if (blocked.length > 0) {
            setError(`Cannot upload: ${blocked.map(f => f.name).join(", ")} — file type not allowed.`);
            e.target.value = ""; return;
          }
          setUploading(true);
          try {
            for (const file of Array.from(list)) {
              const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
              const path = directory === "/" ? `/${file.name}` : `${directory}/${file.name}`;
              let body: string;
              if (BINARY.has(ext)) {
                // Read as binary and base64-encode so it survives JSON transport
                const buf = await file.arrayBuffer();
                const bytes = new Uint8Array(buf);
                let bin = "";
                for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
                body = JSON.stringify({ content: btoa(bin), encoding: "base64" });
              } else {
                body = JSON.stringify({ content: await file.text() });
              }
              await apiFetch(`/api/servers/${id}/files/write?file=${encodeURIComponent(path)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
                body,
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
                : (() => {
                    const ext = editingFile?.split(".").pop()?.toLowerCase() ?? "";
                    const useHighlight = TEXT_EXTS.has(ext);
                    if (useHighlight) {
                      return (
                        <HighlightEditor
                          content={editContent}
                          ext={ext}
                          onChange={setEditContent}
                        />
                      );
                    }
                    return (
                      <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                        spellCheck={false}
                        className="flex-1 font-mono text-[12px] bg-transparent outline-none resize-none leading-relaxed overflow-y-auto"
                        style={{ padding: "16px 20px", color: "#e2e8f0", minHeight: 300 }} />
                    );
                  })()
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
