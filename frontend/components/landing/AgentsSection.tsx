"use client";

import { motion } from "framer-motion";
import { 
  FileText, 
  ScanSearch, 
  AlertTriangle, 
  ArrowLeftRight, 
  Microscope, 
  FileBarChart,
  CheckCircle2
} from "lucide-react";
import { CardSpread } from "@/components/ui/card-spread";

export function AgentsSection() {
  const agents = [
    { 
      name: "Document Agent", 
      shortName: "Document",
      icon: <FileText className="w-5 h-5" />, 
      largeIcon: <FileText className="w-8 h-8" />,
      color: "text-secondary-blue", 
      bg: "bg-secondary-blue/10",
      border: "border-secondary-blue/30",
      glow: "shadow-[0_0_20px_rgba(59,130,246,0.25)]",
      description: "Ingests and parses complex financial documents, including 10-Ks, 10-Qs, and earnings call transcripts.",
      capabilities: ["OCR & Table Extraction", "Semantic Chunking", "Metadata Tagging"]
    },
    { 
      name: "Extraction Agent", 
      shortName: "Extraction",
      icon: <ScanSearch className="w-5 h-5" />, 
      largeIcon: <ScanSearch className="w-8 h-8" />,
      color: "text-primary", 
      bg: "bg-primary/10",
      border: "border-primary/30",
      glow: "shadow-[0_0_20px_rgba(67,198,188,0.25)]",
      description: "Pinpoints exact data points, financial metrics, and executive statements across thousands of pages.",
      capabilities: ["Entity Recognition", "Financial Metric Parsing", "Contextual Searching"]
    },
    { 
      name: "Red Flag Agent", 
      shortName: "Red Flag",
      icon: <AlertTriangle className="w-5 h-5" />, 
      largeIcon: <AlertTriangle className="w-8 h-8" />,
      color: "text-destructive", 
      bg: "bg-destructive/10",
      border: "border-destructive/30",
      glow: "shadow-[0_0_20px_rgba(239,68,68,0.25)]",
      description: "Scans for anomalies, risk factors, accounting changes, and bearish sentiment shifts.",
      capabilities: ["Sentiment Analysis", "Risk Factor Identification", "Accounting Anomaly Detection"]
    },
    { 
      name: "Comparison Agent", 
      shortName: "Comparison",
      icon: <ArrowLeftRight className="w-5 h-5" />, 
      largeIcon: <ArrowLeftRight className="w-8 h-8" />,
      color: "text-purple-400", 
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      glow: "shadow-[0_0_20px_rgba(168,85,247,0.25)]",
      description: "Benchmarks financial performance against competitors and historical quarters.",
      capabilities: ["Peer Group Analysis", "YoY/QoQ Growth Tracking", "Margin Benchmarking"]
    },
    { 
      name: "Research Agent", 
      shortName: "Research",
      icon: <Microscope className="w-5 h-5" />, 
      largeIcon: <Microscope className="w-8 h-8" />,
      color: "text-success", 
      bg: "bg-success/10",
      border: "border-success/30",
      glow: "shadow-[0_0_20px_rgba(16,185,129,0.25)]",
      description: "Synthesizes macro-economic trends, market news, and industry reports into actionable insights.",
      capabilities: ["Web Scraping", "Macro Trend Analysis", "Thematic Research Synthesis"]
    },
    { 
      name: "Report Agent", 
      shortName: "Report",
      icon: <FileBarChart className="w-5 h-5" />, 
      largeIcon: <FileBarChart className="w-8 h-8" />,
      color: "text-cyan", 
      bg: "bg-cyan/10",
      border: "border-cyan/30",
      glow: "shadow-[0_0_20px_rgba(0,242,254,0.25)]",
      description: "Compiles all findings into a polished, institutional-grade financial report with verified citations.",
      capabilities: ["Narrative Generation", "Citation Linking", "Executive Summary Formatting"]
    }
  ];

  const cards = agents.map((agent, idx) => (
    <div key={idx} className={`w-[360px] h-[480px] bg-card/80 backdrop-blur-2xl border ${agent.border} ${agent.glow} p-8 rounded-3xl flex flex-col justify-between overflow-hidden shadow-2xl`}>
      <div className={`absolute top-0 right-0 w-32 h-32 ${agent.bg} rounded-full blur-[60px] opacity-70 pointer-events-none -translate-y-1/2 translate-x-1/2 animate-pulse`} />
      
      <div>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${agent.bg} ${agent.color}`}>
          {agent.largeIcon}
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-3">
          {agent.name}
        </h3>
        <p className="text-[15px] text-secondary-foreground leading-relaxed mb-6">
          {agent.description}
        </p>
      </div>
      
      <div className="bg-background/40 p-4 rounded-xl border border-border/50">
        <h4 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-3">
          Capabilities
        </h4>
        <div className="flex flex-col gap-2">
          {agent.capabilities.map((cap, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle2 className={`w-4 h-4 ${agent.color}`} />
              <span className="text-[13px] text-foreground font-medium">{cap}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  ));

  return (
    <section className="py-24 px-6 md:px-12 lg:px-24 max-w-[1400px] mx-auto transition-theme overflow-hidden">
      <div className="text-center mb-4 max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight transition-theme">
          Specialized Agent Architecture
        </h2>
        <p className="text-lg text-secondary-foreground transition-theme">
          Hover to spread the deck. Click any agent to bring it forward.
        </p>
      </div>
      
      <div className="mt-32 pt-12 mb-24">
        <CardSpread cards={cards} spreadOffset={45} hoverSpreadMultiplier={2.5} />
      </div>
    </section>
  );
}
