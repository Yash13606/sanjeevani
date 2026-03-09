import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import TrustedBySection from "@/components/landing/TrustedBySection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import LiveAlertsSection from "@/components/landing/LiveAlertsSection";
import DarkSection from "@/components/landing/DarkSection";
import TrustSection from "@/components/landing/TrustSection";
import ContactSection from "@/components/landing/ContactSection";
import CTABanner from "@/components/landing/CTABanner";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen scroll-smooth">
      <Navbar />
      <main>
        <HeroSection />
        <TrustedBySection />
        <HowItWorksSection />
        <LiveAlertsSection />
        <DarkSection />
        <TrustSection />
        <ContactSection />
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
