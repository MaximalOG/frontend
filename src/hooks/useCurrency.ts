// Re-export everything from the shared context.
// All components that import from here automatically share the same currency state.
export {
  useCurrency,
  CurrencyProvider,
  CURRENCY_SYMBOLS,
  CURRENCY_FLAGS,
  type Currency,
} from "@/context/CurrencyContext";
