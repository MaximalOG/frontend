/**
 * useAdStatus — determines whether the current visitor should see ads.
 *
 * Rules (Option B):
 *  - Not logged in                     → show ads
 *  - Logged in, no active paid sub     → show ads
 *  - Logged in, has active/pending sub → hide ads
 *
 * Result is fetched once per session and cached so it doesn't
 * re-fire on every page navigation.
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

const SESSION_KEY = "nn_ad_status";

export function useAdStatus(): { showAds: boolean; loading: boolean } {
  const { user, loading: authLoading, token } = useAuth();

  const [showAds, setShowAds] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Wait for auth to settle
    if (authLoading) return;

    // Not logged in — definitely show ads
    if (!user) {
      setShowAds(true);
      setLoading(false);
      return;
    }

    // Check session cache so we don't hammer the API on every page
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached !== null) {
      setShowAds(cached === "true");
      setLoading(false);
      return;
    }

    // Logged in — check subscriptions
    (async () => {
      try {
        const res = await apiFetch("/api/subscriptions", {
          headers: { Authorization: `Bearer ${token()}` },
        });
        if (!res.ok) {
          // If the request fails, default to showing ads (safe fallback)
          setShowAds(true);
          setLoading(false);
          return;
        }
        const subs: { status: string }[] = await res.json();
        const hasPaidSub = subs.some(
          s => s.status === "active" || s.status === "pending_payment"
        );
        const result = !hasPaidSub;
        sessionStorage.setItem(SESSION_KEY, String(result));
        setShowAds(result);
      } catch {
        // Network error — default to showing ads
        setShowAds(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, token]);

  return { showAds, loading };
}
