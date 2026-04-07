import { motion } from "framer-motion";

const ease = [0.16, 1, 0.3, 1] as const;

const AIChatPreview = () => {
  return (
    <section className="py-16 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
          >
            <h2 className="text-2xl md:text-3xl font-bold tracking-tighter mb-8">
              Not sure what <span className="text-primary">to choose?</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5, ease }}
            className="glass-surface rounded-sm overflow-hidden mb-6"
            style={{ border: "1px solid hsl(350 85% 30% / 0.4)" }}
          >
            {/* Chat header */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50" style={{ background: "hsl(0 0% 8%)" }}>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold text-white">NetherNodes AI</span>
            </div>

            {/* Messages */}
            <div className="p-4 space-y-3">
              <div className="flex justify-end">
                <div className="px-3 py-2 rounded-sm text-xs text-white max-w-[75%]" style={{ background: "hsl(350 85% 45%)" }}>
                  I want a server for 10 players
                </div>
              </div>
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-sm text-xs max-w-[75%]" style={{ background: "hsl(0 0% 12%)", color: "hsl(0 0% 85%)", border: "1px solid hsl(0 0% 18%)" }}>
                  That setup will run smoothly on our 4GB plan. Want me to set it up for you?
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25, duration: 0.4, ease }}
          >
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-chatbot"))}
              className="h-10 px-6 bg-primary text-primary-foreground font-medium text-sm rounded-sm nether-glow hover:brightness-110 transition-all"
            >
              Try NetherNodes AI
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AIChatPreview;
