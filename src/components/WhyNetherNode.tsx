import { motion } from "framer-motion";
import { Zap, Clock, Bot, Shield, Globe, Package, LayoutDashboard, TrendingUp, Headphones, Star } from "lucide-react";
import { Link } from "react-router-dom";

const cards = [
  {
    icon: Zap,
    title: "Built for Performance",
    desc: "Your server runs on optimized hardware designed for smooth gameplay. Expect stable TPS and minimal lag whether you're with friends or running a growing community.",
  },
  {
    icon: Globe,
    title: "Low Ping for Indian Players",
    desc: "Our nodes are located in India, giving you consistently low latency and faster response times. No delays, no rubberbanding — just smooth gameplay.",
  },
  {
    icon: Clock,
    title: "Instant Setup, No Waiting",
    desc: "Deploy your server in seconds. No complicated setup, no delays — just pick a plan and start playing immediately.",
  },
  {
    icon: Star,
    title: "Your Server, Your Identity",
    desc: "Get a free custom subdomain with every plan. Launch your server as yourserver.nethernodes.in — no setup required.",
  },
  {
    icon: Bot,
    title: "Smart Plan Recommendations",
    desc: "Not sure what you need? Our built-in system helps you choose the perfect plan based on players, plugins, and activity — so you don't overpay or underpower.",
  },
  {
    icon: Package,
    title: "Built for Plugins & Modpacks",
    desc: "From simple survival worlds to heavy modpacks, NetherNodes handles it all. One-click installers and powerful configs make setup effortless.",
  },
  {
    icon: LayoutDashboard,
    title: "Powerful Panel, Full Control",
    desc: "Manage everything from a clean, easy-to-use panel. Start, stop, install plugins, manage files — all in one place.",
  },
  {
    icon: Shield,
    title: "DDoS Protection Included",
    desc: "Every server is protected from attacks, keeping your world online and secure at all times.",
  },
  {
    icon: TrendingUp,
    title: "Scale When You Grow",
    desc: "Start small and upgrade anytime. As your server grows, NetherNodes grows with you — no migration headaches.",
  },
  {
    icon: Headphones,
    title: "Real Support, When You Need It",
    desc: "Whether you're stuck on setup or optimizing performance, help is always available — fast, simple, and actually useful.",
  },
];

const ease = [0.16, 1, 0.3, 1] as const;

const WhyNetherNodes = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] gradient-portal opacity-15 blur-3xl pointer-events-none" />
      <div className="container mx-auto px-4 relative z-10">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-3">
            Why Choose <span className="text-primary">NetherNodes</span>
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Built for Performance, Not Just Hosting
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto mb-14">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 3) * 0.07, duration: 0.5, ease }}
              className="glass-surface rounded-sm p-5 group nether-border-hover"
            >
              <div className="flex items-start gap-3">
                <card.icon className="w-5 h-5 text-primary mt-0.5 shrink-0 group-hover:drop-shadow-[0_0_8px_hsla(350,85%,50%,0.5)] transition-all" />
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-1">{card.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease, delay: 0.2 }}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground mb-4">
            Ready to Start? Launch your Minecraft server in seconds.
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center h-11 px-8 bg-primary text-primary-foreground font-semibold text-sm rounded-sm nether-glow hover:brightness-110 transition-all"
          >
            Start Your Server
          </Link>
        </motion.div>

      </div>
    </section>
  );
};

export default WhyNetherNodes;
