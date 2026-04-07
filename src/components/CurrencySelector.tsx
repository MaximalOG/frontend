import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { type Currency, CURRENCY_SYMBOLS, CURRENCY_FLAGS, useCurrency } from "@/hooks/useCurrency";

const CURRENCIES: Currency[] = ["INR", "USD", "EUR", "GBP"];

interface Props {
  currency: Currency;
  onChange: (c: Currency) => void;
}

const CurrencySelector = ({ currency, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all hover:brightness-110"
        style={{
          background: "hsl(0 0% 10%)",
          border: "1px solid hsl(0 0% 22%)",
          color: "hsl(0 0% 80%)",
        }}
      >
        <span>{CURRENCY_FLAGS[currency]}</span>
        <span className="mono">{CURRENCY_SYMBOLS[currency]} {currency}</span>
        <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 rounded-sm overflow-hidden z-50"
          style={{
            background: "hsl(0 0% 8%)",
            border: "1px solid hsl(0 0% 20%)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            minWidth: 130,
          }}
        >
          {CURRENCIES.map(c => (
            <button
              key={c}
              onClick={() => { onChange(c); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-all text-left"
              style={{
                background: c === currency ? "hsl(350 85% 15%)" : "transparent",
                color: c === currency ? "hsl(350 85% 65%)" : "hsl(0 0% 70%)",
              }}
              onMouseEnter={e => { if (c !== currency) (e.currentTarget as HTMLElement).style.background = "hsl(0 0% 12%)"; }}
              onMouseLeave={e => { if (c !== currency) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <span>{CURRENCY_FLAGS[c]}</span>
              <span className="mono">{CURRENCY_SYMBOLS[c]}</span>
              <span>{c}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CurrencySelector;
