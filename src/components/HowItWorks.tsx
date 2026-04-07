import { motion } from "framer-motion";
import { CreditCard, Rocket, Gamepad2 } from "lucide-react";

const steps = [
  { icon: CreditCard, step: "01", title: "Choose Your Plan", desc: "Pick the plan that fits your needs — from free to pro." },
  { icon: Rocket,     step: "02", title: "Deploy Instantly",  desc: "Your server spins up in seconds. No waiting, no setup hassle." },
  { icon: Gamepad2,   step: "03", title: "Start Playing",     desc: "Connect with your friends and start your adventure right away." },
];

const ease = [0.16, 1, 0.3, 1] as const;

const HowItWorks = () => (
  <section className="py-24 relative overflow-hidden">
    <div className="absolute right-1/4 top-0 w-[400px] h-[400px] gradient-portal opacity-20 blur-3xl pointer-events-none" />

    <div className="container mx-auto px-4 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4">
          Start Your Server in <span className="text-primary">3 Steps</span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">From signup to gameplay in under a minute.</p>
      </motion.div>

      <div className="relative max-w-4xl mx-auto">
        {/* Connecting line — desktop only */}
        <div className="hidden md:block absolute top-[52px] left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px pointer-events-none" style={{ zIndex: 0 }}>
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3, ease }}
            style={{ transformOrigin: "left", height: "1px", background: "linear-gradient(90deg, hsl(350 85% 40% / 0.6), hsl(270 70% 55% / 0.6))" }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ position: "relative", zIndex: 1 }}>
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5, ease }}
              whileHover={{ y: -4 }}
              className="glass-surface rounded-sm p-8 text-center relative group nether-border-hover"
            >
              {/* Step number */}
              <div className="text-5xl font-bold text-primary/10 absolute top-4 right-4 mono select-none">{s.step}</div>

              {/* Icon circle */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: "hsl(350 85% 10%)", border: "1px solid hsl(350 85% 25%)" }}
              >
                <s.icon className="w-6 h-6 text-primary group-hover:drop-shadow-[0_0_8px_hsla(350,85%,50%,0.6)] transition-all" />
              </div>

              <h3 className="text-lg font-bold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default HowItWorks;
