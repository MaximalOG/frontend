/**
 * AdBanner — renders a single Google AdSense unit.
 *
 * Returns null for paid users (no layout shift, no placeholder gap).
 * The parent is responsible for gating via useAdStatus before rendering,
 * but this component also guards internally as a safety net.
 *
 * Usage:
 *   <AdBanner slot="1234567890" />
 *
 * slot: the AdSense ad unit ID from your AdSense dashboard.
 *       Replace "REPLACE_WITH_SLOT_ID" with your real slot IDs.
 */

import { useEffect, useRef } from "react";
import { useAdStatus } from "@/hooks/useAdStatus";

interface Props {
  /** AdSense ad unit slot ID */
  slot: string;
  /** responsive (default) or fixed */
  format?: "auto" | "rectangle" | "horizontal";
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: { push: (opts: object) => void }[];
  }
}

export default function AdBanner({ slot, format = "auto", className }: Props) {
  const { showAds, loading } = useAdStatus();
  const pushed = useRef(false);

  useEffect(() => {
    if (!showAds || loading || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch { /* AdSense not loaded yet — safe to ignore */ }
  }, [showAds, loading]);

  // Don't render anything for paid users or while loading
  if (loading || !showAds) return null;

  return (
    <div className={`flex justify-center overflow-hidden ${className ?? ""}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-6938067180481184"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
