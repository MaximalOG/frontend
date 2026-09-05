import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Download, Trash2, Package, Loader2, AlertCircle,
  X, Check, RefreshCw, ChevronLeft, ChevronRight, Star,
  ExternalLink,
} from "lucide-react";
import ServerSidebar from "@/components/ServerSidebar";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

interface ServerData {
  id: string; name: string; status: string;
  plan: string; ram: string; cpu: string; ssd?: string;
  serverType?: string; mcVersion?: string;
}

interface Project {
  id: string; slug: string; title: string; description: string;
  author: string; iconUrl: string | null;
  downloads: number; follows: number;
  categories: string[]; loaders: string[];
  gameVersions: string[]; projectType: string;
  source: string;
}

interface SearchResult {
  hits: Project[]; totalHits: number; page: number; pages: number;
}

interface InstalledData {
  plugins: string[]; mods: string[];
  history: Array<{ projectName: string; filename: string; directory?: string; action: string; installedAt?: string; removedAt?: string }>;
}

function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const CATEGORY_COLORS: Record<string, string> = {
  utility:       "hsl(200 70% 55%)",
  optimization:  "hsl(142 65% 50%)",
  adventure:     "hsl(270 60% 60%)",
  decoration:    "hsl(38 90% 58%)",
  library:       "hsl(0 0% 55%)",
  magic:         "hsl(300 60% 60%)",
  technology:    "hsl(195 80% 55%)",
  food:          "hsl(38 80% 55%)",
  mobs:          "hsl(0 60% 55%)",
};

// Skeleton card
function SkeletonCard() {
  return (
    <div className="rounded-2xl p-4 animate-pulse"
      style={{ background: "hsl(270 20% 8%)", border: "1px solid hsl(270 30% 18%)" }}>
      <div className="flex gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl shrink-0" style={{ background: "hsl(270 20% 14%)" }} />
        <div className="flex-1 space-y-2">
          <div className="h-3 rounded" style={{ background: "hsl(270 20% 14%)", width: "60%" }} />
          <div className="h-2.5 rounded" style={{ background: "hsl(270 20% 14%)", width: "40%" }} />
        </div>
      </div>
      <div className="h-2.5 rounded mb-1.5" style={{ background: "hsl(270 20% 14%)" }} />
      <div className="h-2.5 rounded" style={{ background: "hsl(270 20% 14%)", width: "80%" }} />
    </div>
  );
}

// Project card
function ProjectCard({
  project, installing, installed, onInstall, onView,
}: {
  project: Project;
  installing: boolean;
  installed: boolean;
  onInstall: () => void;
  onView: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: "0 0 24px hsl(270 60% 40% / 0.25)" }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl p-4 cursor-pointer flex flex-col gap-3 group"
      style={{
        background: "linear-gradient(135deg, hsl(270 20% 8%) 0%, hsl(270 15% 6%) 100%)",
        border: "1px solid hsl(270 30% 18%)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
      }}
      onClick={onView}
    >
      {/* Header */}
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
          style={{ background: "hsl(270 20% 14%)", border: "1px solid hsl(270 30% 20%)" }}>
          {project.iconUrl
            ? <img src={project.iconUrl} alt={project.title} className="w-full h-full object-cover" />
            : <Package size={22} style={{ color: "hsl(270 60% 60%)" }} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate group-hover:text-purple-300 transition-colors">
            {project.title}
          </p>
          <p className="text-[10px] text-muted-foreground/50">by {project.author}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/40">
              <Download size={9} /> {formatDownloads(project.downloads)}
            </span>
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/40">
              <Star size={9} /> {formatDownloads(project.follows)}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-[11px] text-muted-foreground/60 leading-relaxed line-clamp-2 flex-1">
        {project.description}
      </p>

      {/* Category + loader badges */}
      <div className="flex flex-wrap gap-1">
        {project.loaders.slice(0, 2).map(l => (
          <span key={l} className="px-1.5 py-0.5 rounded text-[9px] font-semibold mono uppercase"
            style={{ background: "hsl(270 40% 15%)", color: "hsl(270 60% 65%)", border: "1px solid hsl(270 40% 25%)" }}>
            {l}
          </span>
        ))}
        {project.categories.slice(0, 2).map(c => (
          <span key={c} className="px-1.5 py-0.5 rounded text-[9px] mono capitalize"
            style={{
              background: `${CATEGORY_COLORS[c] ?? "hsl(0 0% 20%)"}22`,
              color: CATEGORY_COLORS[c] ?? "hsl(0 0% 55%)",
              border: `1px solid ${CATEGORY_COLORS[c] ?? "hsl(0 0% 25%)"}44`,
            }}>
            {c}
          </span>
        ))}
      </div>

      {/* Install button */}
      <button
        onClick={e => { e.stopPropagation(); onInstall(); }}
        disabled={installing || installed}
        className="w-full h-8 flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-50"
        style={{
          background: installed
            ? "hsl(142 60% 12%)"
            : "linear-gradient(135deg, hsl(270 60% 45%), hsl(270 50% 35%))",
          color: installed ? "hsl(142 65% 52%)" : "white",
          border: installed ? "1px solid hsl(142 60% 22%)" : "none",
          boxShadow: installed ? "none" : "0 0 12px hsl(270 60% 40% / 0.4)",
        }}
      >
        {installing
          ? <><Loader2 size={11} className="animate-spin" /> Installing…</>
          : installed
          ? <><Check size={11} /> Installed</>
          : <><Download size={11} /> Install</>
        }
      </button>
    </motion.div>
  );
}

const ServerInstaller = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, token, logout } = useAuth();

  const [server, setServer]         = useState<ServerData | null>(null);
  const [loadingServer, setLS]      = useState(true);

  // Search state
  const [query, setQuery]           = useState("");
  const [type, setType]             = useState<"all"|"plugin"|"mod">("all");
  const [results, setResults]       = useState<SearchResult | null>(null);
  const [searching, setSearching]   = useState(false);
  const [searchError, setSearchError] = useState("");
  const [page, setPage]             = useState(0);

  // Installed state
  const [installed, setInstalled]   = useState<InstalledData | null>(null);
  const [loadingInstalled, setLI]   = useState(false);
  const [tab, setTab]               = useState<"search"|"installed">("search");

  // Install state per project
  const [installing, setInstalling] = useState<Record<string, boolean>>({});
  const [installError, setInstallError] = useState("");
  const [installSuccess, setInstallSuccess] = useState("");

  // Remove state
  const [removing, setRemoving]     = useState<string | null>(null);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { state: { from: `/server/${id}/installer` } });
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

  const doSearch = useCallback(async (q: string, p: number, t: string) => {
    setSearching(true); setSearchError("");
    try {
      const params = new URLSearchParams({ q, page: String(p), type: t, serverId: id! });
      const res = await apiFetch(`/api/installer/search?${params}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) { const e = await res.json(); setSearchError(e.error); return; }
      setResults(await res.json());
    } catch { setSearchError("Search failed. Please try again."); }
    finally { setSearching(false); }
  }, [id, token]);

  // Initial search
  useEffect(() => {
    if (user && !loadingServer) doSearch("", 0, type);
  }, [user, loadingServer, doSearch, type]);

  const loadInstalled = useCallback(async () => {
    setLI(true);
    try {
      const res = await apiFetch(`/api/installer/installed/${id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setInstalled(await res.json());
    } catch {}
    finally { setLI(false); }
  }, [id, token]);

  useEffect(() => {
    if (tab === "installed") loadInstalled();
  }, [tab, loadInstalled]);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => { setPage(0); doSearch(q, 0, type); }, 400);
  };

  const handleInstall = async (project: Project) => {
    setInstalling(p => ({ ...p, [project.id]: true }));
    setInstallError(""); setInstallSuccess("");
    try {
      const res = await apiFetch("/api/installer/install", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ serverId: id, projectId: project.id }),
      });
      const data = await res.json();
      if (!res.ok) { setInstallError(data.error || "Install failed."); return; }
      setInstallSuccess(`✓ ${data.projectName} installed to /${data.directory}`);
      setTimeout(() => setInstallSuccess(""), 4000);
    } catch { setInstallError("Network error during install."); }
    finally { setInstalling(p => ({ ...p, [project.id]: false })); }
  };

  const handleRemove = async (filename: string, directory: string) => {
    setRemoving(filename);
    try {
      const res = await apiFetch("/api/installer/remove", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ serverId: id, filename, directory }),
      });
      if (res.ok) loadInstalled();
      else { const e = await res.json(); setInstallError(e.error); }
    } catch { setInstallError("Network error."); }
    finally { setRemoving(null); }
  };

  if (authLoading || loadingServer) return (
    <div className="h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  const installedFiles = [...(installed?.plugins ?? []).map(f => ({ f, d: "plugins" })), ...(installed?.mods ?? []).map(f => ({ f, d: "mods" }))];

  return (
    <div className="h-screen bg-background flex overflow-hidden">

      {/* Sidebar */}
      <div className="hidden md:flex flex-col h-screen px-4 py-5 overflow-y-auto shrink-0"
        style={{ width: 236, borderRight: "1px solid hsl(0 0% 12%)", background: "hsl(0 0% 4.5%)" }}>
        {server && <ServerSidebar server={server} onPower={async () => {}} powerLoading={null} />}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 shrink-0"
          style={{ borderBottom: "1px solid hsl(0 0% 12%)", background: "hsl(0 0% 5%)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "hsl(270 40% 15%)", border: "1px solid hsl(270 40% 28%)" }}>
              <Package size={18} style={{ color: "hsl(270 60% 65%)" }} />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">Plugin & Mod Installer</h1>
              <p className="text-[10px] text-muted-foreground/50">
                {server?.serverType ? `${server.serverType}` : "server"}
                {server?.mcVersion ? ` · ${server.mcVersion}` : ""} — Modrinth
              </p>
            </div>
            {/* Tabs */}
            <div className="ml-auto flex items-center gap-1 rounded-xl p-1"
              style={{ background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 15%)" }}>
              {(["search", "installed"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                  style={{
                    background: tab === t ? "hsl(270 50% 30%)" : "transparent",
                    color:      tab === t ? "white"              : "hsl(0 0% 50%)",
                  }}>
                  {t}
                  {t === "installed" && (installed?.plugins.length || installed?.mods.length)
                    ? <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px]"
                        style={{ background: "hsl(270 50% 45%)", color: "white" }}>
                        {(installed.plugins.length + installed.mods.length)}
                      </span>
                    : null
                  }
                </button>
              ))}
            </div>
          </div>

          {tab === "search" && (
            <div className="flex gap-2">
              {/* Search box */}
              <div className="flex-1 flex items-center gap-2 rounded-xl px-3"
                style={{ background: "hsl(270 20% 8%)", border: "1px solid hsl(270 30% 20%)" }}>
                <Search size={14} className="text-muted-foreground/40 shrink-0" />
                <input type="text" value={query}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search plugins and mods…"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/30 outline-none py-2.5"
                />
                {query && (
                  <button onClick={() => { setQuery(""); setPage(0); doSearch("", 0, type); }}
                    className="text-muted-foreground/30 hover:text-foreground transition-colors">
                    <X size={13} />
                  </button>
                )}
              </div>
              {/* Type filter */}
              <div className="flex gap-1 rounded-xl p-1"
                style={{ background: "hsl(270 20% 8%)", border: "1px solid hsl(270 30% 20%)" }}>
                {(["all","plugin","mod"] as const).map(t => (
                  <button key={t} onClick={() => { setType(t); setPage(0); doSearch(query, 0, t); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                    style={{
                      background: type === t ? "hsl(270 50% 30%)" : "transparent",
                      color:      type === t ? "white"              : "hsl(0 0% 50%)",
                    }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <AnimatePresence>
          {(installError || installSuccess) && (
            <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
              className="mx-6 mt-3 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2"
              style={{
                background: installError ? "hsl(350 85% 8%)" : "hsl(142 60% 8%)",
                border:     installError ? "1px solid hsl(350 85% 25%)" : "1px solid hsl(142 60% 22%)",
                color:      installError ? "hsl(350 85% 65%)" : "hsl(142 65% 52%)",
              }}>
              {installError ? <AlertCircle size={12} /> : <Check size={12} />}
              {installError || installSuccess}
              <button onClick={() => { setInstallError(""); setInstallSuccess(""); }} className="ml-auto"><X size={11} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {tab === "search" && (
            <>
              {/* Results info */}
              {results && !searching && (
                <p className="text-[10px] text-muted-foreground/40 mb-4 mono">
                  {results.totalHits.toLocaleString()} results
                  {server?.serverType ? ` for ${server.serverType}` : ""}
                  {server?.mcVersion ? ` ${server.mcVersion}` : ""}
                </p>
              )}

              {searchError && (
                <div className="text-center py-12">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">{searchError}</p>
                </div>
              )}

              {/* Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {searching
                  ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                  : results?.hits.map(p => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        installing={!!installing[p.id]}
                        installed={false}
                        onInstall={() => handleInstall(p)}
                        onView={() => window.open(`https://modrinth.com/project/${p.slug}`, "_blank")}
                      />
                    ))
                }
              </div>

              {/* Pagination */}
              {results && results.pages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-8">
                  <button onClick={() => { const p = page-1; setPage(p); doSearch(query, p, type); }}
                    disabled={page === 0}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all hover:brightness-110 disabled:opacity-30"
                    style={{ background: "hsl(270 20% 10%)", color: "hsl(0 0% 60%)", border: "1px solid hsl(270 30% 18%)" }}>
                    <ChevronLeft size={13} /> Prev
                  </button>
                  <span className="text-xs text-muted-foreground/50 mono">
                    {page + 1} / {results.pages}
                  </span>
                  <button onClick={() => { const p = page+1; setPage(p); doSearch(query, p, type); }}
                    disabled={page >= results.pages - 1}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all hover:brightness-110 disabled:opacity-30"
                    style={{ background: "hsl(270 20% 10%)", color: "hsl(0 0% 60%)", border: "1px solid hsl(270 30% 18%)" }}>
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </>
          )}

          {tab === "installed" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-foreground">
                  Installed ({installedFiles.length})
                </p>
                <button onClick={loadInstalled} disabled={loadingInstalled}
                  className="text-muted-foreground/40 hover:text-foreground transition-colors">
                  <RefreshCw size={13} className={loadingInstalled ? "animate-spin" : ""} />
                </button>
              </div>

              {loadingInstalled ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-xl animate-pulse"
                      style={{ background: "hsl(270 20% 8%)", border: "1px solid hsl(270 30% 18%)" }} />
                  ))}
                </div>
              ) : installedFiles.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground/50">No plugins or mods installed yet</p>
                  <button onClick={() => setTab("search")} className="mt-3 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                    Browse the installer →
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {installedFiles.map(({ f, d }) => (
                    <motion.div key={`${d}/${f}`}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ background: "hsl(270 20% 7%)", border: "1px solid hsl(270 30% 16%)" }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "hsl(270 30% 12%)" }}>
                        <Package size={14} style={{ color: "hsl(270 60% 60%)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{f}</p>
                        <p className="text-[10px] text-muted-foreground/40 mono">/{d}</p>
                      </div>
                      <button onClick={() => handleRemove(f, d)} disabled={removing === f}
                        className="p-1.5 rounded-lg text-muted-foreground/30 hover:text-red-400 hover:bg-red-400/10 transition-all">
                        {removing === f ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Install history */}
              {(installed?.history?.length ?? 0) > 0 && (
                <div className="mt-8">
                  <p className="text-[9px] mono uppercase tracking-wider text-muted-foreground/30 mb-3">Install History</p>
                  <div className="space-y-1.5">
                    {installed!.history.slice(-10).reverse().map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground/40 mono">
                        <span className={h.action === "install" ? "text-green-400/60" : "text-red-400/60"}>
                          {h.action === "install" ? "+" : "−"}
                        </span>
                        <span className="truncate">{h.projectName ?? h.filename}</span>
                        <span className="ml-auto shrink-0">
                          {new Date(h.installedAt ?? h.removedAt ?? "").toLocaleDateString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServerInstaller;
