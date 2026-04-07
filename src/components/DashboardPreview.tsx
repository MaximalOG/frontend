import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, FolderOpen, Terminal, Activity } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

// ── Tab content components ────────────────────────────────────────────────────

const StartStopTab = () => (
  <div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {[
        { label: "CPU", value: "23%", color: "text-primary" },
        { label: "RAM", value: "1.8GB", color: "text-secondary" },
        { label: "Players", value: "12/30", color: "text-green-400" },
        { label: "TPS", value: "19.8", color: "text-foreground" },
      ].map(s => (
        <div key={s.label} className="bg-muted/30 rounded-sm p-3">
          <div className="text-xs text-muted-foreground mono uppercase tracking-wider mb-1">{s.label}</div>
          <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
        </div>
      ))}
    </div>
    <div className="bg-muted/20 rounded-sm p-4">
      <div className="text-xs text-muted-foreground mono mb-3">RESOURCE USAGE — LAST 24H</div>
      <div className="flex items-end gap-1 h-24">
        {[35,42,28,55,48,62,45,38,52,65,58,42,35,48,55,62,70,58,45,38,42,35,28,23].map((h,i) => (
          <div key={i} className="flex-1 rounded-t-sm bg-primary/60 transition-all hover:bg-primary" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  </div>
);

const ConsoleTab = () => {
  const lines = [
    { t: "17:42:01", c: "text-muted-foreground", m: "[Server thread/INFO]: Starting minecraft server version 1.21.1" },
    { t: "17:42:02", c: "text-muted-foreground", m: "[Server thread/INFO]: Loading properties" },
    { t: "17:42:02", c: "text-muted-foreground", m: "[Server thread/INFO]: Default game type: SURVIVAL" },
    { t: "17:42:03", c: "text-green-400",        m: "[Server thread/INFO]: Preparing level \"world\"" },
    { t: "17:42:04", c: "text-muted-foreground", m: "[Server thread/INFO]: Preparing start region for dimension minecraft:overworld" },
    { t: "17:42:05", c: "text-green-400",        m: "[Server thread/INFO]: Done (3.241s)! For help, type \"help\"" },
    { t: "17:43:11", c: "text-secondary",        m: "[Server thread/INFO]: Alex joined the game" },
    { t: "17:44:02", c: "text-secondary",        m: "[Server thread/INFO]: Steve joined the game" },
    { t: "17:46:30", c: "text-muted-foreground", m: "[Server thread/INFO]: Alex: hello everyone" },
    { t: "17:47:01", c: "text-green-400",        m: "[Server thread/INFO]: TPS: 19.8 | Memory: 1.8GB / 4GB" },
  ];
  return (
    <div className="bg-black/40 rounded-sm p-3 font-mono text-[11px] h-52 overflow-y-auto space-y-0.5">
      {lines.map((l, i) => (
        <div key={i} className="flex gap-2">
          <span className="text-muted-foreground/40 shrink-0">{l.t}</span>
          <span className={l.c}>{l.m}</span>
        </div>
      ))}
      <div className="flex gap-2 mt-1">
        <span className="text-primary">{">"}</span>
        <span className="animate-pulse text-primary">▊</span>
      </div>
    </div>
  );
};

const FileManagerTab = () => {
  const files = [
    { name: "world",           type: "dir",  size: "—",       modified: "Today 17:42" },
    { name: "world_nether",    type: "dir",  size: "—",       modified: "Today 17:42" },
    { name: "plugins",         type: "dir",  size: "—",       modified: "Today 17:40" },
    { name: "logs",            type: "dir",  size: "—",       modified: "Today 17:46" },
    { name: "server.jar",      type: "file", size: "47.2 MB", modified: "Yesterday" },
    { name: "server.properties",type:"file", size: "2.1 KB",  modified: "Today 17:40" },
    { name: "bukkit.yml",      type: "file", size: "1.4 KB",  modified: "Today 17:40" },
    { name: "spigot.yml",      type: "file", size: "3.8 KB",  modified: "Today 17:40" },
    { name: "eula.txt",        type: "file", size: "0.2 KB",  modified: "Yesterday" },
  ];
  return (
    <div className="bg-black/20 rounded-sm overflow-hidden">
      <div className="grid grid-cols-3 gap-2 px-3 py-1.5 border-b border-border/30 text-[10px] text-muted-foreground/50 mono uppercase tracking-wider">
        <span>Name</span><span>Size</span><span>Modified</span>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {files.map((f, i) => (
          <div key={i} className="grid grid-cols-3 gap-2 px-3 py-1.5 text-xs hover:bg-muted/20 transition-colors border-b border-border/10 last:border-0">
            <span className="flex items-center gap-1.5">
              <span className={f.type === "dir" ? "text-secondary" : "text-muted-foreground/60"}>
                {f.type === "dir" ? "📁" : "📄"}
              </span>
              <span className={f.type === "dir" ? "text-secondary" : "text-foreground/80"}>{f.name}</span>
            </span>
            <span className="text-muted-foreground/50 mono">{f.size}</span>
            <span className="text-muted-foreground/50">{f.modified}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ResourcesTab = () => {
  const bars = [
    { label: "CPU Usage",    value: 23, max: 100, unit: "%",  color: "hsl(350 85% 50%)" },
    { label: "Memory",       value: 1.8, max: 4,  unit: "GB", color: "hsl(270 70% 60%)" },
    { label: "Disk I/O",     value: 42,  max: 100, unit: "MB/s", color: "hsl(200 70% 55%)" },
    { label: "Network In",   value: 18,  max: 100, unit: "Mbps", color: "hsl(142 70% 50%)" },
    { label: "Network Out",  value: 7,   max: 100, unit: "Mbps", color: "hsl(38 90% 55%)" },
  ];
  return (
    <div className="space-y-3">
      {bars.map(b => (
        <div key={b.label}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">{b.label}</span>
            <span className="mono font-semibold text-foreground">{b.value} {b.unit}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${(b.value / b.max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease }}
              className="h-full rounded-full"
              style={{ background: b.color }}
            />
          </div>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3 mt-4">
        {[
          { label: "Uptime",   value: "3d 14h 22m" },
          { label: "Processes", value: "47" },
          { label: "Threads",  value: "128" },
          { label: "Java Heap", value: "1.8 / 4 GB" },
        ].map(s => (
          <div key={s.label} className="bg-muted/20 rounded-sm px-3 py-2">
            <div className="text-[10px] text-muted-foreground/50 mono uppercase tracking-wider mb-0.5">{s.label}</div>
            <div className="text-sm font-semibold text-foreground mono">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const TABS = [
  { id: "start",    icon: Play,       label: "Start / Stop" },
  { id: "console",  icon: Terminal,   label: "Console" },
  { id: "files",    icon: FolderOpen, label: "File Manager" },
  { id: "resources",icon: Activity,   label: "Resources" },
];

const DashboardPreview = () => {
  const [activeTab, setActiveTab] = useState("start");

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] gradient-nether opacity-30 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4">
            Your <span className="text-secondary glow-text-secondary">Command Center</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            A clean, powerful dashboard to manage everything about your server.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.8, ease }}
          className="max-w-4xl mx-auto glass-surface rounded-sm overflow-hidden cursor-default"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold">N</span>
              </div>
              <span className="text-sm font-semibold text-foreground">SurvivalCraft</span>
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs mono rounded-sm">ONLINE</span>
            </div>
            <span className="text-xs text-muted-foreground mono">play.NetherNodes.gg:25565</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4">
            {/* Sidebar */}
            <div className="border-r border-border/50 p-4 space-y-1">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-colors text-left ${
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                  }`}
                >
                  <tab.icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Main content */}
            <div className="col-span-3 p-5 min-h-[220px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease }}
                >
                  {activeTab === "start"     && <StartStopTab />}
                  {activeTab === "console"   && <ConsoleTab />}
                  {activeTab === "files"     && <FileManagerTab />}
                  {activeTab === "resources" && <ResourcesTab />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DashboardPreview;
