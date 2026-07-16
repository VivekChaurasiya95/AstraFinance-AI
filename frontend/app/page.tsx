import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { AgentsSection } from "@/components/landing/AgentsSection";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="flex-grow">
        <HeroSection />
        <WorkflowSection />
        <AgentsSection />
      </main>
      <Footer />
    </>
  );
}
