import { FileUp, Sparkles, SearchCheck } from "lucide-react";

export function WorkflowSection() {
  const steps = [
    {
      icon: <FileUp className="w-6 h-6 text-blue-600 " />,
      title: "Upload Documents",
      description: "Securely ingest 10-Ks, earnings transcripts, and proprietary research in seconds.",
      bg: "bg-blue-100 ",
    },
    {
      icon: <Sparkles className="w-6 h-6 text-indigo-600 " />,
      title: "Ask Complex Questions",
      description: "Interrogate your data with natural language. Multi-step reasoning handles intricate financial queries.",
      bg: "bg-indigo-100 ",
      shadow: "shadow-[0_0_20px_rgba(79,70,229,0.3)] (99,102,241,0.2)]"
    },
    {
      icon: <SearchCheck className="w-6 h-6 text-emerald-600 " />,
      title: "Trace Cited Answers",
      description: "Every claim is backed by a direct citation pill, linking you back to the exact source paragraph.",
      bg: "bg-emerald-100 ",
    }
  ];

  return (
    <section className="py-24 px-6 md:px-12 bg-transparent border-y border-zinc-200 ">
      <div className="max-w-[1600px] mx-auto">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4 tracking-tight">
            The Workflow of Precision
          </h2>
          <p className="text-lg text-zinc-600 ">
            Institutional-grade research requires a methodology, not just a chat box.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              className="bg-white p-8 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4"
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-2 ${step.bg} ${step.shadow || ''}`}>
                {step.icon}
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 ">
                {step.title}
              </h3>
              <p className="text-zinc-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
