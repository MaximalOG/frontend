import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Alex_MC",
    role: "Server Owner",
    text: "Switched from another host and the difference is night and day. My server boots in seconds and my players noticed the lag was gone instantly.",
    rating: 5,
  },
  {
    name: "CraftQueen",
    role: "Community Admin",
    text: "The control panel is so easy to use. I set up plugins and mods without touching a single config file. Perfect for beginners!",
    rating: 5,
  },
  {
    name: "BlockMaster99",
    role: "Modpack Creator",
    text: "Running a 50-player modded server with zero issues. The hardware is genuinely powerful and support on Discord is always fast.",
    rating: 5,
  },
];

const ease = [0.16, 1, 0.3, 1] as const;

const TestimonialsSection = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4">
            Loved by <span className="text-primary">Players</span>
          </h2>
          <p className="text-muted-foreground">Don't take our word for it. Here's what our community says.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5, ease }}
              className="glass-surface rounded-sm p-6"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">"{t.text}"</p>
              <div>
                <div className="font-semibold text-sm text-foreground">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
