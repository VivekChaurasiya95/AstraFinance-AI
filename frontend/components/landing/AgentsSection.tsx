import { 
  FileText, 
  ScanSearch, 
  AlertTriangle, 
  ArrowLeftRight, 
  Microscope, 
  FileBarChart 
} from "lucide-react";

export function AgentsSection() {
  const agents = [
    { name: "Document", icon: <FileText className="w-5 h-5" />, color: "text-blue-700", bg: "bg-blue-100" },
    { name: "Extraction", icon: <ScanSearch className="w-5 h-5" />, color: "text-indigo-700", bg: "bg-indigo-100" },
    { name: "Red Flag", icon: <AlertTriangle className="w-5 h-5" />, color: "text-orange-700", bg: "bg-orange-100" },
    { name: "Comparison", icon: <ArrowLeftRight className="w-5 h-5" />, color: "text-purple-700", bg: "bg-purple-100" },
    { name: "Research", icon: <Microscope className="w-5 h-5" />, color: "text-teal-700", bg: "bg-teal-100" },
    { name: "Report", icon: <FileBarChart className="w-5 h-5" />, color: "text-emerald-700", bg: "bg-emerald-100" }
  ];

  return (
    <section className="py-24 px-6 md:px-12 lg:px-24 max-w-[1600px] mx-auto">
      <div className="text-center mb-16 max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
          Specialized Agent Architecture
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Six specialized AI models collaborating to synthesize your research.
        </p>
      </div>
      
      <div className="flex flex-wrap justify-center gap-4">
        {agents.map((agent, idx) => (
          <div 
            key={idx}
            className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 pr-6 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow cursor-default"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${agent.bg} ${agent.color}`}>
              {agent.icon}
            </div>
            <span className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              {agent.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
