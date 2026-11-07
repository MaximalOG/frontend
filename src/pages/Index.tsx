import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import WhyChooseSection from "@/components/WhyChooseSection";
import HowItWorks from "@/components/HowItWorks";
import TrustSection from "@/components/TrustSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import DashboardPreview from "@/components/DashboardPreview";
import AISection from "@/components/AISection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import AIChatPreview from "@/components/AIChatPreview";
import AdBanner from "@/components/AdBanner";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <WhyChooseSection />
      <HowItWorks />
      <TrustSection />
      <TestimonialsSection />
      <DashboardPreview />
      <AISection />
      <AIChatPreview />
      {/* Ad — shown only to non-paid / not-logged-in visitors */}
      <AdBanner slot="6346414825" className="py-4 px-4" />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
