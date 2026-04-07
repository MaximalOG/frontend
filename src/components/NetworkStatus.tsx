import { motion } from "framer-motion";
import { Activity } from "lucide-react";

const nodes = [
  { name: "India-Node-1", status: "Online", cpu: "~45%", ram: "~55%" },
  { name: "India-Node-2", status: "Online", cpu: "~52%", ram: "~62%" },
  { name: "India-Node-3", status: "Online", cpu: "~38%", ram: "~48%" },
];

const ease = [0.16, 1, 0.3, 1] as const;

const NetworkStatus = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute left-0 top-1/3 w-[400px] h-[400px] gradient-nether opacity-20 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4">
            Network <span className="text-primary">Status</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Real-time overview of our infrastructure nodes.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          <div className="glass-surface rounded-sm overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-4 gap-4 px-6 py-3 border-b border-border/50 text-xs mono text-muted-foreground uppercase tracking-wider">
              <span>Node</span>
              <span>Status</span>
              <span>CPU</span>
              <span>RAM</span>
            </div>

            {nodes.map((node, i) => (
              <motion.div
                key={node.name}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4, ease }}
                className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-border/30 last:border-b-0 items-center"
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground mono">{node.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-green-400 mono">{node.status}</span>
                </div>
                <span className="text-sm text-muted-foreground mono">{node.cpu}</span>
                <span className="text-sm text-muted-foreground mono">{node.ram}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default NetworkStatus;
