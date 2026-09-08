import { FileUp, Sparkles, SearchCheck } from "lucide-react";

export function WorkflowSection() {
  const steps = [
    {
      icon: <FileUp className="w-6 h-6 text-[#00f2fe]" />,
      title: "Upload Documents",
      description: "Securely ingest 10-Ks, earnings transcripts, and proprietary research in seconds.",
      bg: "bg-[#00f2fe]/10",
      shadow: "shadow-[0_0_20px_rgba(0,242,254,0.25)] border border-[#00f2fe]/40"
    },
    {
      icon: <Sparkles className="w-6 h-6 text-[#a855f7]" />,
      title: "Ask Complex Questions",
      description: "Interrogate your data with natural language. Multi-step reasoning handles intricate financial queries.",
      bg: "bg-[#a855f7]/10",
      shadow: "shadow-[0_0_20px_rgba(168,85,247,0.25)] border border-[#a855f7]/40"
    },
    {
      icon: <SearchCheck className="w-6 h-6 text-[#10b981]" />,
      title: "Trace Cited Answers",
      description: "Every claim is backed by a direct citation pill, linking you back to the exact source paragraph.",
      bg: "bg-[#10b981]/10",
      shadow: "shadow-[0_0_20px_rgba(16,185,129,0.25)] border border-[#10b981]/40"
    }
  ];

  return (
    <section id="workflow" className="relative py-24 bg-transparent transition-theme overflow-hidden">
      <div className="text-center mb-16 max-w-3xl mx-auto relative z-10 px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight transition-theme">
          The Workflow of Precision
        </h2>
        <p className="text-lg text-secondary-foreground transition-theme">
          Institutional-grade research requires a methodology, not just a chat box.
        </p>
      </div>
      
      <div className="w-full bg-background py-16 relative border-y border-border shadow-none transition-theme overflow-hidden">
        {/* Background Pattern and Aurora Glow */}
        <div className="bg-aurora absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 animate-bg-breathe rounded-[50%] blur-[80px] pointer-events-none z-0 transition-theme" />
        <div className="bg-grid-pattern absolute inset-0 z-0 pointer-events-none transition-theme" />
        
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 px-6 md:px-12">
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              className="bg-card/40 backdrop-blur-md p-8 rounded-2xl border border-border shadow-none hover:border-primary/30 transition-all hover:-translate-y-[2px] flex flex-col gap-4"
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-2 ${step.bg} ${step.shadow || ''} transition-theme`}>
                {step.icon}
              </div>
              <h3 className="text-xl font-semibold text-foreground transition-theme">
                {step.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed transition-theme">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
