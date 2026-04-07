import { useState, useEffect, useCallback } from "react";

export type Currency = "INR" | "USD" | "EUR" | "GBP";

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£",
};

export const CURRENCY_FLAGS: Record<Currency, string> = {
  INR: "🇮🇳", USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧",
};

// Fallback static rates (INR base)
const FALLBACK: Record<Currency, number> = {
  INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0095,
};

// $1 markup in USD added to non-INR prices
const MARKUP_USD = 1;

const LS_KEY = "nn_currency";

async function detectCurrency(): Promise<Currency> {
  // 1. Check localStorage override
  const saved = localStorage.getItem(LS_KEY) as Currency | null;
  if (saved && ["INR", "USD", "EUR", "GBP"].includes(saved)) return saved;

  // 2. Ask our own backend — no external dependency, no rate limits
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/location`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    if (data.country === "IN") return "INR";
    // Euro-zone countries
    const EUR_COUNTRIES = new Set([
      "DE","FR","ES","IT","NL","PT","BE","AT","FI","IE","GR","SK","SI",
      "EE","LV","LT","LU","MT","CY",
    ]);
    if (EUR_COUNTRIES.has(data.country)) return "EUR";
    if (data.country === "GB") return "GBP";
    return "USD";
  } catch {
    // 3. Fallback: browser locale
    const locale = navigator.language || "en-US";
    if (locale.includes("IN") || locale === "en-IN") return "INR";
    if (locale.startsWith("en-GB")) return "GBP";
    if (["de", "fr", "es", "it", "nl", "pt"].some(l => locale.startsWith(l))) return "EUR";
    return "USD";
  }
}

export function useCurrency() {
  const [currency, setCurrencyState] = useState<Currency>("INR");
  const [rates, setRates] = useState<Record<Currency, number>>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load rates from backend
    fetch(`${import.meta.env.VITE_API_URL}/api/rates`)
      .then(r => r.json())
      .then(data => { if (data.rates) setRates(data.rates); })
      .catch(() => {});

    // Detect currency
    detectCurrency().then(c => {
      setCurrencyState(c);
      setLoading(false);
    });
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem(LS_KEY, c);
  }, []);

  /**
   * Convert an INR price to the selected currency with +$1 markup.
   * Returns a clean formatted string like "$2" or "₹69".
   */
  const formatPrice = useCallback((inrPrice: number): string => {
    const sym = CURRENCY_SYMBOLS[currency];
    if (currency === "INR") return `${sym}${inrPrice}`;

    const rate = rates[currency] ?? FALLBACK[currency];
    const usdRate = rates.USD ?? FALLBACK.USD;
    const markupInr = MARKUP_USD / usdRate;
    const total = (inrPrice + markupInr) * rate;

    // Round cleanly
    let rounded: number;
    if (total < 5)  rounded = Math.round(total * 100) / 100;
    else if (total < 20) rounded = Math.round(total * 10) / 10;
    else rounded = Math.round(total);

    return `${sym}${rounded}`;
  }, [currency, rates]);

  /**
   * Get raw converted price in INR (for payment processing).
   */
  const toInr = useCallback((inrPrice: number): number => inrPrice, []);

  return { currency, setCurrency, formatPrice, toInr, loading, rates };
}
