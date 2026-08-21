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
    <section className="py-24 px-6 md:px-12 transition-theme">
      <div className="max-w-[1600px] mx-auto">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight transition-theme">
            The Workflow of Precision
          </h2>
          <p className="text-lg text-secondary-foreground transition-theme">
            Institutional-grade research requires a methodology, not just a chat box.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
