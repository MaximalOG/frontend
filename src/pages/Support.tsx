import Navbar from "@/components/Navbar";
import SupportSection from "@/components/SupportSection";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";

const Support = () => {
  return (
    <div className="min-h-screen bg-background pt-16 flex flex-col">
      <Navbar />

      {/* Main layout — vertical ad pinned to the left on desktop */}
      <div className="flex flex-1 relative">

        {/* Left vertical ad — sticky, centred vertically, hidden on mobile */}
        <div className="hidden lg:flex items-center justify-center sticky top-0 h-screen w-[160px] shrink-0 pl-2">
          <AdBanner slot="4976446656" format="auto" className="w-full" />
        </div>

        {/* Page content */}
        <div className="flex-1 flex flex-col min-w-0">
          <SupportSection />
          {/* Mobile-only horizontal ad — shown below content on small screens */}
          <div className="lg:hidden">
            <AdBanner slot="4976446656" className="py-4 px-4" />
          </div>
          <div className="flex-1" />
          <Footer />
        </div>

      </div>
    </div>
  );
};

export default Support;
