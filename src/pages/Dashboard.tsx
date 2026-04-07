import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Server, Play, Square, RefreshCw, AlertCircle, Cpu, MemoryStick } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

const ease = [0.16, 1, 0.3, 1] as const;

interface ServerData {
  id: string;
  name: string;
  status: "running" | "stopped" | "starting" | "stopping";
  ram: string;
  cpu: string;
  plan: string;
  subdomain?: string;
}

const STATUS_COLOR: Record<string, string> = {
  running:  "hsl(142 70% 55%)",
  stopped:  "hsl(0 0% 45%)",
  starting: "hsl(38 90% 60%)",
  stopping: "hsl(38 90% 60%)",
};

const Dashboard = () => {
  const { user, loading: authLoading, token, logout } = useAuth();
  const navigate = useNavigate();
  const [servers, setServers] = useState<ServerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { state: { from: "/dashboard" } });
  }, [authLoading, user, navigate]);

  const loadServers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/servers", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.status === 401) { logout(); navigate("/login"); return; }
      if (!res.ok) throw new Error("Failed to load servers");
      setServers(await res.json());
    } catch {
      setError("Could not load your servers. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token, logout, navigate]);

  useEffect(() => {
    if (user) loadServers();
  }, [user, loadServers]);

  const serverAction = async (id: string, action: "start" | "stop") => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await apiFetch(`/api/servers/${id}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) await loadServers();
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      <div className="container mx-auto px-4 max-w-4xl pt-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
        >
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                <Server className="w-6 h-6 text-primary" /> My Servers
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Welcome back, <span className="text-foreground">{user?.name}</span>
              </p>
            </div>
            <button
              onClick={loadServers}
              className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs text-muted-foreground hover:text-white transition-colors"
              style={{ border: "1px solid hsl(0 0% 20%)" }}
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-3" />
              Loading your servers…
            </div>
          ) : error ? (
            <div
              className="rounded-sm p-6 text-center"
              style={{ background: "hsl(350 85% 8%)", border: "1px solid hsl(350 85% 25%)" }}
            >
              <AlertCircle className="w-8 h-8 text-primary mx-auto mb-3" />
              <p className="text-sm text-foreground mb-1">Service unavailable</p>
              <p className="text-xs text-muted-foreground mb-4">{error}</p>
              <button
                onClick={loadServers}
                className="px-4 py-2 rounded-sm text-xs font-semibold transition-all hover:brightness-110"
                style={{ background: "hsl(350 85% 45%)", color: "white" }}
              >
                Retry
              </button>
            </div>
          ) : servers.length === 0 ? (
            <div
              className="rounded-sm p-10 text-center"
              style={{ border: "1px solid hsl(0 0% 16%)" }}
            >
              <Server className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm text-foreground mb-1">No servers yet</p>
              <p className="text-xs text-muted-foreground mb-5">Purchase a plan to get your first server.</p>
              <a
                href="/pricing"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-sm text-sm font-semibold transition-all hover:brightness-110"
                style={{ background: "hsl(350 85% 45%)", color: "white" }}
              >
                View Plans
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {servers.map((srv, i) => (
                <motion.div
                  key={srv.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, ease }}
                  className="glass-surface rounded-sm p-5"
                  style={{ border: "1px solid hsl(0 0% 16%)" }}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            background: STATUS_COLOR[srv.status] ?? "hsl(0 0% 45%)",
                            boxShadow: srv.status === "running" ? `0 0 6px ${STATUS_COLOR.running}` : undefined,
                          }}
                        />
                        <h3 className="text-sm font-bold text-foreground truncate">{srv.name}</h3>
                        <span
                          className="px-1.5 py-0.5 rounded-sm text-[9px] mono uppercase font-semibold shrink-0"
                          style={{
                            background: "hsl(0 0% 10%)",
                            color: STATUS_COLOR[srv.status] ?? "hsl(0 0% 45%)",
                            border: `1px solid ${STATUS_COLOR[srv.status] ?? "hsl(0 0% 20%)"}`,
                          }}
                        >
                          {srv.status}
                        </span>
                      </div>
                      {srv.subdomain && (
                        <p className="text-[10px] text-muted-foreground/50 mono mb-2">{srv.subdomain}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MemoryStick size={11} className="text-primary" /> {srv.ram}
                        </span>
                        <span className="flex items-center gap-1">
                          <Cpu size={11} className="text-primary" /> {srv.cpu}
                        </span>
                        <span className="text-muted-foreground/50">{srv.plan} plan</span>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {srv.status === "stopped" && (
                        <button
                          onClick={() => serverAction(srv.id, "start")}
                          disabled={actionLoading[srv.id]}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all hover:brightness-110 disabled:opacity-50"
                          style={{ background: "hsl(142 60% 15%)", color: "hsl(142 70% 55%)", border: "1px solid hsl(142 60% 25%)" }}
                        >
                          {actionLoading[srv.id]
                            ? <RefreshCw size={11} className="animate-spin" />
                            : <Play size={11} />
                          }
                          Start
                        </button>
                      )}
                      {srv.status === "running" && (
                        <button
                          onClick={() => serverAction(srv.id, "stop")}
                          disabled={actionLoading[srv.id]}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all hover:brightness-110 disabled:opacity-50"
                          style={{ background: "hsl(350 85% 15%)", color: "hsl(350 85% 65%)", border: "1px solid hsl(350 85% 30%)" }}
                        >
                          {actionLoading[srv.id]
                            ? <RefreshCw size={11} className="animate-spin" />
                            : <Square size={11} />
                          }
                          Stop
                        </button>
                      )}
                      {(srv.status === "starting" || srv.status === "stopping") && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs text-muted-foreground"
                          style={{ border: "1px solid hsl(0 0% 20%)" }}>
                          <RefreshCw size={11} className="animate-spin" />
                          {srv.status === "starting" ? "Starting…" : "Stopping…"}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
