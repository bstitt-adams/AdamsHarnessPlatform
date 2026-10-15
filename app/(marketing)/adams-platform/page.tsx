import { AdamsHeroCarousel } from "@/components/marketing/adams-hero-carousel";
import { AdamsServicesOverview } from "@/components/marketing/adams-services-overview";
import { AdamsStatsSection } from "@/components/marketing/adams-stats-section";
import { AdamsHowItWorks } from "@/components/marketing/adams-how-it-works";
import { AdamsTestimonials } from "@/components/marketing/adams-testimonials";
import { AdamsFAQSection } from "@/components/marketing/adams-faq-section";
import { AdamsCTASection } from "@/components/marketing/adams-cta-section";

export default function AdamsPlatformPage() {
  return (
    <>
      <AdamsHeroCarousel />
      <AdamsServicesOverview />
      <AdamsHowItWorks />
      <AdamsStatsSection />
      <AdamsTestimonials />
      <AdamsFAQSection />
      <AdamsCTASection />
    </>
  );
}
