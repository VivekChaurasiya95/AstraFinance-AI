// Hot reload test
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { AgentsSection } from "@/components/landing/AgentsSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="flex-grow bg-zinc-50">
        <HeroSection />
        <WorkflowSection />
        <AgentsSection />
        <TestimonialsSection />
      </main>
      <Footer />
    </>
  );
}
