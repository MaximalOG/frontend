import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const ease = [0.16, 1, 0.3, 1] as const;

const CTASection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 gradient-nether opacity-40 blur-3xl pointer-events-none" />
      <div className="absolute inset-0 gradient-portal opacity-20 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="glass-surface rounded-sm p-12 md:p-16 text-center max-w-3xl mx-auto"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4">
            Start your server today in{" "}
            <span className="text-primary glow-text-primary">under 60 seconds</span>
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
          </p>
          <Link
            to="/pricing"
            className="inline-flex h-12 px-8 bg-primary text-primary-foreground font-semibold text-sm items-center rounded-sm nether-glow hover:brightness-110 transition-all hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)]"
          >
            Launch Your Server
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
