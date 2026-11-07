import { useEffect, useState, useRef } from "react";
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
      style={{ width: 320, paddingBottom: "2rem" }}
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

// Card width + gap
const CARD_W = 336;
// Pixels per second scroll speed
const SPEED = 60;

const TestimonialsSection = () => {
  const [reviews, setReviews]   = useState<Review[]>([]);
  const [loaded, setLoaded]     = useState(false);
  const [offset, setOffset]     = useState(0);       // current translateX in px (starts at 0 = right edge)
  const [visible, setVisible]   = useState(true);    // true = scrolling, false = gap pause
  const rafRef    = useRef<number>(0);
  const lastRef   = useRef<number>(0);
  const pauseRef  = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/reviews`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Review[]) => { setReviews(data); setLoaded(true); })
      .catch(() => { setReviews([]); setLoaded(true); });
  }, []);

  useEffect(() => {
    if (!loaded || reviews.length === 0) return;

    const totalW = reviews.length * CARD_W; // full strip width
    const viewW  = wrapperRef.current?.offsetWidth ?? window.innerWidth;

    // Start centred — offset so the strip is centred in the viewport
    let pos = (viewW - totalW) / 2;
    setOffset(pos);
    setVisible(true);

    const tick = (ts: number) => {
      if (lastRef.current === 0) lastRef.current = ts;
      const dt = (ts - lastRef.current) / 1000; // seconds
      lastRef.current = ts;

      if (!pauseRef.current) {
        pos -= SPEED * dt;

        // All cards have gone fully off the left edge
        if (pos + totalW < 0) {
          // Hide track, wait 1s, then restart centred
          setVisible(false);
          setTimeout(() => {
            pos = (viewW - totalW) / 2;
            setOffset(pos);
            setVisible(true);
            lastRef.current = 0;
            rafRef.current = requestAnimationFrame(tick);
          }, 1000);
          return;
        }

        setOffset(pos);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loaded, reviews]);

  // Pause on hover
  const handleEnter = () => { pauseRef.current = true; };
  const handleLeave = () => { pauseRef.current = false; };

  if (loaded && reviews.length === 0) return null;

  return (
    <section className="py-24 relative overflow-hidden">
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

      {/* Marquee viewport */}
      <div
        ref={wrapperRef}
        className="relative w-full overflow-hidden"
        style={{ height: 220 }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
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

        {/* Single set of cards — no duplicates */}
        <div
          className="flex gap-4 absolute top-2"
          style={{
            transform: `translateX(${offset}px)`,
            opacity: visible ? 1 : 0,
            transition: "opacity 0.3s ease",
            willChange: "transform",
          }}
        >
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
