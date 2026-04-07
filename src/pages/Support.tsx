import Navbar from "@/components/Navbar";
import SupportSection from "@/components/SupportSection";
import Footer from "@/components/Footer";

const Support = () => {
  return (
    <div className="min-h-screen bg-background pt-16 flex flex-col">
      <Navbar />
      <SupportSection />
      <div className="flex-1" />
      <Footer />
    </div>
  );
};

export default Support;
