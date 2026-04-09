import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Ticket, Tag, Users, LogOut, ChevronRight, Lock, Star } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const ease = [0.16, 1, 0.3, 1] as const;

const Admin = () => {
  const { user, loading, logout, hasPermission, isOwner } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/admin/login");
  }, [loading, user, navigate]);

  if (loading || !user) return null;

  const panels = [
    {
      to: "/admin/tickets",
      icon: Ticket,
      title: "Support Tickets",
      desc: "View and manage customer support tickets, reply to users, and track ticket status.",
      color: "hsl(350 85% 45%)",
      border: "hsl(350 85% 30%)",
      glow: "hsl(350 85% 40% / 0.3)",
      allowed: hasPermission("tickets"),
    },
    {
      to: "/admin/sale",
      icon: Tag,
      title: "Sale Manager",
      desc: "Create public banners or secret promo codes, set discounts, and control sale dates.",
      color: "hsl(270 70% 55%)",
      border: "hsl(270 70% 35%)",
      glow: "hsl(270 70% 50% / 0.3)",
      allowed: hasPermission("banner_sale") || hasPermission("promo_codes"),
    },
    {
      to: isOwner ? "/admin/staff" : "#",
      icon: Users,
      title: "Staff Management",
      desc: isOwner ? "Add staff members, set permissions, and manage team access." : "Only the owner can manage staff.",
      color: isOwner ? "hsl(38 90% 55%)" : "hsl(0 0% 35%)",
      border: isOwner ? "hsl(38 90% 30%)" : "hsl(0 0% 20%)",
      glow: isOwner ? "hsl(38 90% 50% / 0.3)" : "transparent",
      allowed: true,
      ownerOnly: true,
    },
    {
      to: "/admin/feedback",
      icon: Star,
      title: "Customer Feedback",
      desc: "View star ratings and comments submitted after support tickets. Send follow-up questions.",
      color: "hsl(38 90% 55%)",
      border: "hsl(38 90% 30%)",
      glow: "hsl(38 90% 50% / 0.3)",
      allowed: hasPermission("tickets"),
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="relative flex items-center justify-center mb-10">
          <div className="text-center">
            <p className="text-xs mono text-muted-foreground uppercase tracking-widest mb-2">NetherNodes</p>
            <h1 className="text-3xl font-bold tracking-tighter text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Signed in as <span className="text-foreground font-medium">{user.username}</span>
              {isOwner && <span className="ml-2 px-1.5 py-0.5 rounded-sm text-[9px] mono uppercase" style={{ background: "hsl(350 85% 15%)", color: "hsl(350 85% 65%)", border: "1px solid hsl(350 85% 30%)" }}>Owner</span>}
            </p>
          </div>
          <button
            onClick={() => { logout(); navigate("/admin/login"); }}
            className="absolute right-0 flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs text-muted-foreground hover:text-white transition-colors"
            style={{ border: "1px solid hsl(0 0% 20%)" }}
          >
            <LogOut size={12} /> Sign Out
          </button>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {panels.map((panel, i) => {
            const isLocked = panel.ownerOnly && !isOwner;
            const isDisabled = !panel.allowed && !panel.ownerOnly;

            const card = (
              <motion.div
                key={panel.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4, ease }}
                className={`glass-surface rounded-sm p-6 group transition-all ${isDisabled ? "opacity-40 cursor-not-allowed" : isLocked ? "cursor-not-allowed" : "cursor-pointer"}`}
                style={{
                  border: `1px solid ${panel.border}`,
                }}
                onMouseEnter={e => { if (!isDisabled) (e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px ${panel.glow}`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-sm flex items-center justify-center"
                    style={{ background: `${panel.color}20`, border: `1px solid ${panel.border}` }}>
                    <panel.icon className="w-5 h-5" style={{ color: panel.color }} />
                  </div>
                  {isLocked
                    ? <Lock size={14} className="text-muted-foreground/30 mt-1" />
                    : <ChevronRight size={16} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors mt-1" />
                  }
                </div>
                <h2 className="text-base font-bold text-foreground mb-1">{panel.title}</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">{panel.desc}</p>
              </motion.div>
            );

            if (isDisabled || isLocked) return card;
            return <Link key={panel.title} to={panel.to}>{card}</Link>;
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default Admin;
