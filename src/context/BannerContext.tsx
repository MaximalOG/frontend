import { createContext, useContext, useState, type ReactNode } from "react";

interface BannerContextValue {
  bannerHeight: number;
  setBannerHeight: (h: number) => void;
}

const BannerContext = createContext<BannerContextValue>({
  bannerHeight: 0,
  setBannerHeight: () => {},
});

export function BannerProvider({ children }: { children: ReactNode }) {
  const [bannerHeight, setBannerHeight] = useState(0);
  return (
    <BannerContext.Provider value={{ bannerHeight, setBannerHeight }}>
      {children}
    </BannerContext.Provider>
  );
}

export function useBanner() {
  return useContext(BannerContext);
}
