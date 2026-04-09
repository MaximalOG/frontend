import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogOut, Server, ChevronDown, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Pricing", to: "/pricing" },
  { label: "Support", to: "/support" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e: MouseEvent) => {
      if (!profileRef.current?.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    navigate("/");
  };

  return (
    <>
      {/* ── DESKTOP NAV — floating pill ── */}
      <div className="fixed top-0 left-0 right-0 z-50 hidden md:flex justify-center pt-4 px-4 pointer-events-none">
        <motion.nav
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-auto flex items-center gap-1 px-2 py-2 rounded-full"
          style={{
            background: scrolled
              ? "hsl(0 0% 7% / 0.95)"
              : "hsl(0 0% 7% / 0.75)",
            backdropFilter: "blur(16px)",
            border: "1px solid hsl(0 0% 18%)",
            boxShadow: scrolled
              ? "0 0 0 1px hsl(350 85% 40% / 0.15), 0 8px 32px rgba(0,0,0,0.5)"
              : "0 0 0 1px hsl(0 0% 22% / 0.4), 0 4px 16px rgba(0,0,0,0.3)",
            transition: "background 0.3s, box-shadow 0.3s",
          }}
        >
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full mr-1 transition-all hover:bg-white/5"
          >
            <div className="w-6 h-6 rounded-md overflow-hidden" style={{ boxShadow: "0 0 8px hsl(350 85% 50% / 0.5)" }}>
              <img src="/NetherNodes.jpg" alt="NetherNodes" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-sm text-white tracking-tight">NetherNodes</span>
          </Link>

          {/* Divider */}
          <div className="w-px h-5 mx-1" style={{ background: "hsl(0 0% 22%)" }} />

          {/* Nav links */}
          {navLinks.map((link) => {
            const active = pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="relative px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                style={{
                  color: active ? "white" : "hsl(0 0% 55%)",
                  background: active ? "hsl(0 0% 14%)" : "transparent",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "white"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "hsl(0 0% 55%)"; }}
              >
                {link.label}
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full"
                    style={{ background: "hsl(0 0% 14%)", zIndex: -1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}

          {/* Divider */}
          <div className="w-px h-5 mx-1" style={{ background: "hsl(0 0% 22%)" }} />

          {/* Auth */}
          {user ? (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all hover:bg-white/5"
                style={{ color: "hsl(0 0% 70%)" }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: "hsl(350 85% 45%)", color: "white" }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs max-w-[80px] truncate text-white">{user.name}</span>
                <ChevronDown
                  size={12}
                  style={{
                    transform: profileOpen ? "rotate(180deg)" : undefined,
                    transition: "transform 0.2s",
                    color: "hsl(0 0% 45%)",
                  }}
                />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-44 rounded-sm overflow-hidden"
                    style={{ background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 18%)", zIndex: 100 }}
                  >
                    <div className="px-3 py-2 border-b" style={{ borderColor: "hsl(0 0% 14%)" }}>
                      <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
                      <p className="text-[10px] text-muted-foreground/50 truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/dashboard"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                    >
                      <Server size={12} /> My Servers
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground hover:text-red-400 hover:bg-white/5 transition-colors"
                    >
                      <LogOut size={12} /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-1 ml-1">
              <Link
                to="/login"
                className="px-4 py-1.5 rounded-full text-sm transition-all hover:bg-white/5"
                style={{ color: "hsl(0 0% 55%)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "white")}
                onMouseLeave={e => (e.currentTarget.style.color = "hsl(0 0% 55%)")}
              >
                Sign In
              </Link>
              <Link
                to="/pricing"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all hover:brightness-110"
                style={{
                  background: "hsl(350 85% 45%)",
                  color: "white",
                  boxShadow: "0 0 16px hsl(350 85% 45% / 0.4)",
                }}
              >
                <Zap size={13} />
                Get Started
              </Link>
            </div>
          )}
        </motion.nav>
      </div>

      {/* ── MOBILE NAV — unchanged flat bar ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 md:hidden glass-surface transition-all duration-300"
        style={{
          boxShadow: scrolled ? "0 4px 32px hsl(350 85% 30% / 0.25)" : undefined,
          borderBottom: scrolled ? "1px solid hsl(350 85% 30% / 0.2)" : undefined,
        }}
      >
        <div className="flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-sm overflow-hidden nether-glow">
              <img src="/NetherNodes.jpg" alt="NetherNodes logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-lg text-foreground tracking-tight">NetherNodes</span>
          </Link>
          <button
            className="text-foreground"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-surface border-t border-border/50"
            >
              <div className="flex flex-col p-4 gap-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm py-2"
                  >
                    {link.label}
                  </Link>
                ))}
                {user ? (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                    >
                      <Server size={14} /> My Servers
                    </Link>
                    <button
                      onClick={() => { handleLogout(); setOpen(false); }}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-red-400 transition-colors py-2 text-left"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setOpen(false)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/pricing"
                      onClick={() => setOpen(false)}
                      className="h-10 px-6 bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center rounded-sm nether-glow"
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
};

export default Navbar;
