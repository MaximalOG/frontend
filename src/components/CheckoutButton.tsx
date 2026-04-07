import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { type Currency } from "@/hooks/useCurrency";

interface Props {
  planName: string;
  planPriceInr?: number;
  discountedPriceInr?: number;
  currency?: Currency;
  label: string;
  isPopular?: boolean;
  className?: string;
}

// Navigates to /checkout?plan=Name
// Checkout page fetches fresh plan data from the API itself — no data passed in URL.
const CheckoutButton = ({ planName, label, isPopular, className }: Props) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/checkout?plan=${encodeURIComponent(planName)}`);
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full h-9 flex items-center justify-center gap-1.5 rounded-sm font-medium text-xs transition-all ${
        isPopular
          ? "bg-primary text-primary-foreground nether-glow hover:brightness-110"
          : "bg-muted text-foreground hover:bg-muted/80"
      } ${className ?? ""}`}
    >
      <Lock size={11} />
      {label}
    </button>
  );
};

export default CheckoutButton;
