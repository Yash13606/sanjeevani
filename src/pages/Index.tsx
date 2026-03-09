import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import TrustedBySection from "@/components/landing/TrustedBySection";
import FeatureShowcase from "@/components/landing/FeatureShowcase";
import AICopilotSection from "@/components/landing/AICopilotSection";
import DarkSection from "@/components/landing/DarkSection";
import TrustSection from "@/components/landing/TrustSection";
import CTABanner from "@/components/landing/CTABanner";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <HeroSection />
        <TrustedBySection />
        <FeatureShowcase />
        <AICopilotSection />
        <DarkSection />
        <TrustSection />
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
