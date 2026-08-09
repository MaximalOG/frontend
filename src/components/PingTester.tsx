import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

type PingStatus = "idle" | "testing" | "done" | "error";

function getPingColor(ms: number): string {
  if (ms < 60)  return "hsl(142 70% 55%)";  // green — excellent
  if (ms < 120) return "hsl(38 90% 55%)";   // yellow — good
  if (ms < 200) return "hsl(38 70% 50%)";   // orange — fair
  return "hsl(350 85% 55%)";                // red — high
}

function getPingLabel(ms: number): string {
  if (ms < 60)  return "Excellent";
  if (ms < 120) return "Good";
  if (ms < 200) return "Fair";
  return "High Latency";
}

const PingTester = () => {
  const [status, setStatus] = useState<PingStatus>("idle");
  const [ping, setPing] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<number[]>([]);

  const runTest = useCallback(async () => {
    setStatus("testing");
    setPing(null);
    setAttempts([]);

    const results: number[] = [];

    // Fire 5 requests to the backend health endpoint and measure RTT
    for (let i = 0; i < 5; i++) {
      try {
        const start = performance.now();
        await fetch(`${import.meta.env.VITE_API_URL}/api/health`, { cache: "no-store" });
        const ms = Math.round(performance.now() - start);
        results.push(ms);
        setAttempts([...results]);
        // Small gap between pings
        if (i < 4) await new Promise(r => setTimeout(r, 100));
      } catch {
        setStatus("error");
        return;
      }
    }

    // Drop highest outlier, average the rest
    const sorted = [...results].sort((a, b) => a - b);
    const trimmed = sorted.slice(0, 4);
    const avg = Math.round(trimmed.reduce((s, v) => s + v, 0) / trimmed.length);
    setPing(avg);
    setStatus("done");
  }, []);

  const pingColor = ping !== null ? getPingColor(ping) : "hsl(0 0% 55%)";
  const pingLabel = ping !== null ? getPingLabel(ping) : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.6, ease }}
      className="flex flex-col items-center gap-3 mt-8"
    >
      <p className="text-[11px] text-muted-foreground/50 mono uppercase tracking-widest">
        Test your ping to our India servers
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={runTest}
          disabled={status === "testing"}
          className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-60"
          style={{
            background: "hsl(0 0% 10%)",
            border: "1px solid hsl(0 0% 22%)",
            color: "hsl(0 0% 70%)",
          }}
        >
          {status === "testing"
            ? <RefreshCw size={13} className="animate-spin" />
            : <Wifi size={13} />
          }
          {status === "testing" ? "Testing…" : status === "done" ? "Test Again" : "Test My Ping"}
        </button>

        <AnimatePresence mode="wait">
          {status === "done" && ping !== null && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9, x: -8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, ease }}
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: "hsl(0 0% 8%)", border: `1px solid ${pingColor}40` }}
            >
              <span className="text-lg font-black" style={{ color: pingColor }}>{ping}</span>
              <div>
                <p className="text-[10px] font-semibold leading-none" style={{ color: pingColor }}>{pingLabel}</p>
                <p className="text-[9px] text-muted-foreground/40 mono">ms</p>
              </div>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 text-xs"
              style={{ color: "hsl(350 85% 55%)" }}
            >
              <WifiOff size={13} />
              Could not reach server
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mini ping bars */}
      {attempts.length > 0 && status === "testing" && (
        <div className="flex items-end gap-1 h-6">
          {attempts.map((ms, i) => (
            <motion.div
              key={i}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              style={{
                width: 6,
                height: Math.min(24, Math.max(4, 24 - ms / 12)),
                borderRadius: 2,
                background: getPingColor(ms),
                originY: 1,
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default PingTester;
