import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Check, X, Loader2 } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

type Status = "idle" | "checking" | "available" | "taken" | "error";

const SubdomainChecker = () => {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [checkedName, setCheckedName] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (v: string) => /^[a-z0-9-]{3,}$/.test(v);

  const check = async () => {
    const name = value.trim().toLowerCase();
    if (!validate(name)) {
      setStatus("error");
      setCheckedName(name);
      return;
    }
    setStatus("checking");
    setCheckedName(name);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/check-subdomain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) { setStatus("error"); return; }
      setSuggestions(data.suggestions ?? []);
      setStatus(data.available ? "available" : "taken");
    } catch {
      setStatus("error");
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") check();
  };

  const handleInput = (v: string) => {
    setValue(v.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    if (status !== "idle") setStatus("idle");
  };

  const useName = (name: string) => {
    setChosen(name);
    sessionStorage.setItem("nn_subdomain", name);
  };

  return (
    <section className="py-10 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
          className="max-w-xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-5">
            <p className="text-sm font-semibold text-foreground">
              Claim your server address
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Every plan includes a server address on nethernodes.in
            </p>
          </div>

          {/* Input row */}
          <div
            className="flex items-center rounded-sm overflow-hidden"
            style={{
              border: status === "available"
                ? "1px solid hsl(142 70% 45%)"
                : status === "taken" || status === "error"
                ? "1px solid hsl(350 85% 50%)"
                : "1px solid hsl(0 0% 22%)",
              boxShadow: status === "available"
                ? "0 0 14px hsl(142 70% 40% / 0.3)"
                : status === "taken" || status === "error"
                ? "0 0 14px hsl(350 85% 40% / 0.25)"
                : undefined,
              transition: "border-color 0.25s ease, box-shadow 0.25s ease",
              background: "hsl(0 0% 8%)",
            }}
          >
            <Search className="w-4 h-4 text-muted-foreground ml-3 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => handleInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="yourserver"
              maxLength={32}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none px-2 py-3"
              aria-label="Server subdomain"
            />
            <span className="text-xs text-muted-foreground/60 pr-2 shrink-0 hidden sm:block">
              .nethernodes.in
            </span>
            <button
              onClick={check}
              disabled={status === "checking" || !value.trim()}
              className="h-full px-4 py-3 text-xs font-semibold transition-all disabled:opacity-40 shrink-0"
              style={{
                background: "hsl(350 85% 45%)",
                color: "white",
                borderLeft: "1px solid hsl(350 85% 35%)",
              }}
            >
              {status === "checking"
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : "Check"
              }
            </button>
          </div>

          {/* .nethernodes.in label on mobile */}
          <p className="text-[10px] text-muted-foreground/50 text-center mt-1 sm:hidden">
            .nethernodes.in
          </p>

          {/* Result */}
          <AnimatePresence mode="wait">
            {status === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 flex items-center gap-2 text-xs"
                style={{ color: "hsl(350 85% 60%)" }}
              >
                <X className="w-3.5 h-3.5 shrink-0" />
                Use only letters, numbers, and hyphens (min 3 characters)
              </motion.div>
            )}

            {status === "available" && (
              <motion.div
                key="available"
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs" style={{ color: "hsl(142 70% 50%)" }}>
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      <span className="font-semibold">{checkedName}.nethernodes.in</span> is available
                    </span>
                  </div>
                  {chosen === checkedName ? (
                    <span className="text-[10px] text-green-400/70 mono">Reserved ✓</span>
                  ) : (
                    <button
                      onClick={() => useName(checkedName)}
                      className="px-3 py-1 rounded-sm text-[11px] font-semibold transition-all hover:brightness-110"
                      style={{ background: "hsl(142 70% 35%)", color: "white", border: "1px solid hsl(142 70% 45%)" }}
                    >
                      Use this name
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {status === "taken" && (
              <motion.div
                key="taken"
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3"
              >
                <div className="flex items-center gap-2 text-xs mb-2" style={{ color: "hsl(350 85% 60%)" }}>
                  <X className="w-3.5 h-3.5 shrink-0" />
                  That name is already taken. Try one of these:
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setValue(s); setStatus("idle"); inputRef.current?.focus(); }}
                      className="px-2.5 py-1 rounded-sm text-[11px] mono transition-all hover:brightness-110"
                      style={{ background: "hsl(0 0% 12%)", color: "hsl(0 0% 75%)", border: "1px solid hsl(0 0% 22%)" }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

export default SubdomainChecker;
