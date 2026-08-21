// Hot reload test
import { Navbar } from "@/components/layout/Navbar";
import { CinematicFooter } from "@/components/ui/motion-footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { AgentsSection } from "@/components/landing/AgentsSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { BendingMarquee } from "@/components/ui/bending-marquee";

export default function LandingPage() {
  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-background">
      <Navbar />
      
      {/* 
        MAIN CONTENT AREA 
        We use z-10 and a solid background with a bottom radius to overlay the footer,
        allowing it to reveal itself naturally as the user scrolls.
      */}
      <main className="relative z-10 flex-grow bg-background rounded-b-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-theme">
        <HeroSection />
        
        <div className="relative z-10 -mt-12 mb-12">
          <BendingMarquee text="built in the open  ✳  shipped every week  ✳  built for the web  ✳  designed in the future" />
        </div>

        {/* Unified Cinematic Background for lower sections */}
        <div className="relative overflow-hidden bg-background">
          <div className="bg-aurora absolute left-1/2 top-1/2 h-[100%] w-[100%] -translate-x-1/2 -translate-y-1/2 animate-bg-breathe rounded-[50%] blur-[120px] pointer-events-none z-0 transition-theme" />
          <div className="bg-grid-pattern absolute inset-0 z-0 pointer-events-none transition-theme" />
          
          <div className="relative z-10">
            <WorkflowSection />
            <AgentsSection />
            <TestimonialsSection />
          </div>
        </div>
      </main>
      
      <CinematicFooter />
    </div>
  );
}
