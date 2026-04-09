import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type Currency = "INR" | "USD" | "EUR" | "GBP";

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£",
};
export const CURRENCY_FLAGS: Record<Currency, string> = {
  INR: "🇮🇳", USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧",
};

const FALLBACK: Record<Currency, number> = {
  INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0095,
};
const MARKUP_USD = 1;
const LS_KEY = "nn_currency";

async function detectCurrency(): Promise<Currency> {
  const saved = localStorage.getItem(LS_KEY) as Currency | null;
  if (saved && ["INR", "USD", "EUR", "GBP"].includes(saved)) return saved;
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/location`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    if (data.country === "IN") return "INR";
    const EUR = new Set(["DE","FR","ES","IT","NL","PT","BE","AT","FI","IE","GR","SK","SI","EE","LV","LT","LU","MT","CY"]);
    if (EUR.has(data.country)) return "EUR";
    if (data.country === "GB") return "GBP";
    return "USD";
  } catch {
    const locale = navigator.language || "en-US";
    if (locale.includes("IN") || locale === "en-IN") return "INR";
    if (locale.startsWith("en-GB")) return "GBP";
    if (["de","fr","es","it","nl","pt"].some(l => locale.startsWith(l))) return "EUR";
    return "USD";
  }
}

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatPrice: (inrPrice: number) => string;
  toInr: (inrPrice: number) => number;
  rates: Record<Currency, number>;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("INR");
  const [rates, setRates] = useState<Record<Currency, number>>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/rates`)
      .then(r => r.json())
      .then(data => { if (data.rates) setRates(data.rates); })
      .catch(() => {});
    detectCurrency().then(c => { setCurrencyState(c); setLoading(false); });
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem(LS_KEY, c);
  }, []);

  const formatPrice = useCallback((inrPrice: number): string => {
    const sym = CURRENCY_SYMBOLS[currency];
    if (currency === "INR") return `${sym}${inrPrice}`;
    const rate = rates[currency] ?? FALLBACK[currency];
    const usdRate = rates.USD ?? FALLBACK.USD;
    const markupInr = MARKUP_USD / usdRate;
    const total = (inrPrice + markupInr) * rate;
    let rounded: number;
    if (total < 5) rounded = Math.round(total * 100) / 100;
    else if (total < 20) rounded = Math.round(total * 10) / 10;
    else rounded = Math.round(total);
    return `${sym}${rounded}`;
  }, [currency, rates]);

  const toInr = useCallback((inrPrice: number) => inrPrice, []);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, toInr, rates, loading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
}
