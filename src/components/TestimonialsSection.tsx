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
const CARD_W = 336; // 320px card + 16px gap
const SPEED  = 60;  // px/second

const TestimonialsSection = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded]   = useState(false);
  const [posA, setPosA]       = useState(0);
  const [posB, setPosB]       = useState(0);
  const [showB, setShowB]     = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const rafRef     = useRef<number>(0);
  const pauseRef   = useRef(false);

  // Mutable state that the RAF loop reads/writes directly (avoids stale closure)
  const s = useRef({
    posA:        0,
    posB:        0,
    showB:       false,
    totalW:      0,
    viewW:       0,
    triggeredB:  false,
    firstLoop:   true,   // true only for the very first pass
  });

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/reviews`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Review[]) => { setReviews(data); setLoaded(true); })
      .catch(() => { setReviews([]); setLoaded(true); });
  }, []);

  useEffect(() => {
    if (!loaded || reviews.length === 0) return;

    const totalW = reviews.length * CARD_W;
    const viewW  = wrapperRef.current?.offsetWidth ?? window.innerWidth;

    // First time: start centred
    const startPos = (viewW - totalW) / 2;

    s.current = {
      posA:       startPos,
      posB:       viewW,
      showB:      false,
      totalW,
      viewW,
      triggeredB: false,
      firstLoop:  true,
    };

    setPosA(startPos);
    setPosB(viewW);
    setShowB(false);

    let last = 0;

    const tick = (ts: number) => {
      if (last === 0) last = ts;
      const dt = Math.min((ts - last) / 1000, 0.05);
      last = ts;

      if (!pauseRef.current) {
        const st = s.current;

        // Scroll track A
        st.posA -= SPEED * dt;

        // Scroll track B if active
        if (st.showB) st.posB -= SPEED * dt;

        // When 3rd-last card of A is 50% past the left edge → spawn B from right
        // 3rd-last card's left edge = posA + totalW - 3*CARD_W
        // 50% gone means that edge + CARD_W/2 < 0
        if (!st.triggeredB && (st.posA + st.totalW - 3 * CARD_W + CARD_W / 2) < 0) {
          st.posB        = st.viewW; // always start B from right edge (never centred)
          st.showB       = true;
          st.triggeredB  = true;
          st.firstLoop   = false;
          setShowB(true);
        }

        // When A is fully off-screen, B becomes the new A
        if (st.posA + st.totalW < 0) {
          st.posA       = st.posB;
          st.posB       = st.viewW;
          st.showB      = false;
          st.triggeredB = false;
          setShowB(false);
        }

        setPosA(st.posA);
        if (st.showB) setPosB(st.posB);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loaded, reviews]);

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

      <div
        ref={wrapperRef}
        className="relative w-full overflow-hidden"
        style={{ height: 220 }}
        onMouseEnter={() => { pauseRef.current = true; }}
        onMouseLeave={() => { pauseRef.current = false; }}
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

        {/* Track A */}
        <div
          className="flex gap-4 absolute top-2"
          style={{ transform: `translateX(${posA}px)`, willChange: "transform" }}
        >
          {reviews.map((r) => <ReviewCard key={`a-${r.id}`} review={r} />)}
        </div>

        {/* Track B — only rendered when active */}
        {showB && (
          <div
            className="flex gap-4 absolute top-2"
            style={{ transform: `translateX(${posB}px)`, willChange: "transform" }}
          >
            {reviews.map((r) => <ReviewCard key={`b-${r.id}`} review={r} />)}
          </div>
        )}
      </div>
    </section>
  );
};

export default TestimonialsSection;
