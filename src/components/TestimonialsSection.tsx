import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

interface Review {
  id: string;
  username: string;
  rating: number;
  text: string;
  avatarUrl?: string | null;
  createdAt?: string;
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div
      className="glass-surface rounded-sm p-6 flex flex-col gap-3 shrink-0"
      style={{ width: 280 }}
    >
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className="w-4 h-4"
            style={{
              fill:  i < review.rating ? "hsl(262 95% 76%)" : "transparent",
              color: i < review.rating ? "hsl(262 95% 76%)" : "hsl(0 0% 30%)",
            }}
          />
        ))}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed flex-1">
        &ldquo;{review.text}&rdquo;
      </p>

      <div className="flex items-center gap-2.5 mt-1">
        {review.avatarUrl ? (
          <img
            src={review.avatarUrl}
            alt={review.username}
            className="w-7 h-7 rounded-full object-cover shrink-0"
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: "hsl(262 95% 20%)", color: "hsl(262 95% 76%)" }}
          >
            {review.username.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <div className="font-semibold text-sm text-foreground">{review.username}</div>
          <div className="text-[10px] text-muted-foreground/50 mono">Discord</div>
        </div>
      </div>
    </div>
  );
}

const ease = [0.16, 1, 0.3, 1] as const;

const TestimonialsSection = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/reviews`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Review[]) => { setReviews(data); setLoaded(true); })
      .catch(() => { setReviews([]); setLoaded(true); });
  }, []);

  if (loaded && reviews.length === 0) return null;

  // Card width (280) + gap (16) = 296px per card
  // CSS animation translates exactly one full set width so the loop is seamless
  const cardW = 296;
  const totalW = reviews.length * cardW;

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Inject keyframes dynamically so totalW is known */}
      <style>{`
        @keyframes marquee-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-${totalW}px); }
        }
        .marquee-track {
          animation: marquee-scroll ${reviews.length * 4}s linear infinite;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4">
            Loved by <span className="text-primary glow-text-primary">Players</span>
          </h2>
          <p className="text-muted-foreground">
            Don't take our word for it. Here's what our community says.
          </p>
        </motion.div>
      </div>

      {/* Full-width marquee */}
      <div className="relative w-full overflow-hidden">
        {/* Left fade */}
        <div
          className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to right, hsl(252 24% 7%), transparent)" }}
        />
        {/* Right fade */}
        <div
          className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to left, hsl(252 24% 7%), transparent)" }}
        />

        {/*
          Two identical sets side by side.
          Animation moves exactly one set width to the left, then instantly
          resets to 0 — because set 2 is identical to set 1, the jump is invisible.
        */}
        <div
          className="marquee-track flex gap-4 w-max py-2 px-4"
          style={{ willChange: "transform" }}
        >
          {/* Set 1 */}
          {reviews.map((review) => (
            <ReviewCard key={`a-${review.id}`} review={review} />
          ))}
          {/* Set 2 — identical copy for seamless loop */}
          {reviews.map((review) => (
            <ReviewCard key={`b-${review.id}`} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
