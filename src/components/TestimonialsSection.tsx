import { useEffect, useRef, useState } from "react";
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
      {/* Stars */}
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className="w-4 h-4"
            style={{
              fill: i < review.rating ? "hsl(262 95% 76%)" : "transparent",
              color: i < review.rating ? "hsl(262 95% 76%)" : "hsl(0 0% 30%)",
            }}
          />
        ))}
      </div>

      {/* Text */}
      <p className="text-sm text-muted-foreground leading-relaxed flex-1">
        &ldquo;{review.text}&rdquo;
      </p>

      {/* Author */}
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
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef   = useRef<number>(0);
  const posRef   = useRef(0);

  // Fetch live reviews from backend — no fallback, only real reviews
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/reviews`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Review[]) => {
        setReviews(data);
        setLoaded(true);
      })
      .catch(() => { setReviews([]); setLoaded(true); });
  }, []);

  // Infinite right-to-left scroll via requestAnimationFrame
  useEffect(() => {
    if (!loaded) return;
    const track = trackRef.current;
    if (!track) return;

    const speed = 0.4; // px per frame — adjust for faster/slower
    let paused = false;

    const onEnter = () => { paused = true; };
    const onLeave = () => { paused = false; };
    track.addEventListener("mouseenter", onEnter);
    track.addEventListener("mouseleave", onLeave);

    const tick = () => {
      if (!paused) {
        posRef.current -= speed;
        // When we've scrolled one full "half" width, reset to 0 for seamless loop
        const halfWidth = track.scrollWidth / 2;
        if (Math.abs(posRef.current) >= halfWidth) {
          posRef.current = 0;
        }
        track.style.transform = `translateX(${posRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      track.removeEventListener("mouseenter", onEnter);
      track.removeEventListener("mouseleave", onLeave);
    };
  }, [loaded]);

  // Duplicate cards for seamless loop — need at least 1 review
  const displayReviews = reviews.length > 0 ? [...reviews, ...reviews] : [];

  if (loaded && reviews.length === 0) return null; // hide section entirely if no reviews yet

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

      {/* Marquee — full width, clips at edges */}
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

        {/* Scrolling track */}
        <div
          ref={trackRef}
          className="flex gap-4 w-max py-2 px-4"
          style={{ willChange: "transform" }}
        >
          {displayReviews.map((review, i) => (
            <ReviewCard key={`${review.id}-${i}`} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
