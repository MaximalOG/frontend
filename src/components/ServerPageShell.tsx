/**
 * ServerPageShell
 * Shared layout wrapper for all server management pages.
 * Provides the desktop left-sidebar + mobile hamburger drawer pattern.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Trash2, X } from "lucide-react";
import ServerSidebar from "./ServerSidebar";

interface ServerData {
  id: string; name: string; status: string;
  plan: string; ram: string; cpu: string; ssd?: string;
  host?: string; customAddress?: string | null;
}

interface Props {
  server: ServerData | null;
  children: React.ReactNode;
  /** Page title shown in the mobile header */
  title?: string;
  /** Optional delete button handler — only shown if provided */
  onDelete?: () => void;
  /** Extra content to render below the nav in the sidebar */
  sidebarExtra?: React.ReactNode;
  /** Max width for the scrollable content area */
  maxWidth?: string;
}

export default function ServerPageShell({
  server, children, title, onDelete, sidebarExtra, maxWidth = "max-w-3xl",
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sidebarContent = (
    <>
      {server && (
        <ServerSidebar server={server} onPower={async () => {}} powerLoading={null} />
      )}
      {onDelete && (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={() => { setDrawerOpen(false); onDelete(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all hover:opacity-80"
            style={{ color: "#f87171", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)" }}>
            <Trash2 size={12} /> Delete Server
          </button>
        </div>
      )}
      {sidebarExtra}
    </>
  );

  return (
    <div className="flex overflow-hidden" style={{ height: "100vh", background: "#080810" }}>

      {/* ── Mobile drawer backdrop ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ x: -270 }} animate={{ x: 0 }} exit={{ x: -270 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed top-0 left-0 h-full z-50 flex flex-col md:hidden px-4 py-5 overflow-y-auto"
              style={{ width: 260, background: "#0b0b14", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
              {/* close button */}
              <button onClick={() => setDrawerOpen(false)}
                className="self-end mb-4 w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ background: "rgba(255,255,255,0.05)", color: "#64748b" }}>
                <X size={16} />
              </button>
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Desktop sidebar ── */}
      <div className="hidden md:flex flex-col h-full overflow-y-auto shrink-0 px-4 py-5"
        style={{ width: 236, background: "#0b0b14", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        {sidebarContent}
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Mobile header strip */}
        <div className="flex md:hidden items-center gap-3 px-4 py-3 shrink-0"
          style={{ background: "#0b0b14", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => setDrawerOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl shrink-0"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
            <Menu size={17} style={{ color: "#94a3b8" }} />
          </button>
          {title && (
            <p className="text-sm font-semibold truncate" style={{ color: "#f1f5f9" }}>{title}</p>
          )}
          {server && (
            <span className="ml-auto text-[10px] mono px-2 py-0.5 rounded-full shrink-0"
              style={{
                background: server.status === "running" ? "rgba(74,222,128,0.1)" : "rgba(100,116,139,0.1)",
                color: server.status === "running" ? "#4ade80" : "#64748b",
                border: `1px solid ${server.status === "running" ? "rgba(74,222,128,0.2)" : "rgba(100,116,139,0.2)"}`,
              }}>
              {server.status === "running" ? "● Online" : "● Offline"}
            </span>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className={`${maxWidth} mx-auto`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
