import Navbar from "@/components/Navbar";
import SupportSection from "@/components/SupportSection";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";

const Support = () => {
  return (
    <div className="min-h-screen bg-background pt-16 flex flex-col">
      <Navbar />
      <SupportSection />
      <AdBanner slot="REPLACE_WITH_SLOT_ID" className="py-6 px-4" />
      <div className="flex-1" />
      <Footer />
    </div>
  );
};

export default Support;
