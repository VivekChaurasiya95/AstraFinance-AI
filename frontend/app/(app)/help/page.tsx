"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  BookOpen,
  Wrench,
  LifeBuoy,
  Activity,
  ChevronRight,
  ChevronDown,
  Command,
  FileText,
  AlertCircle,
  MessageCircle,
  Shield,
  Settings,
  Bell,
  Database,
  ArrowRight,
  Send,
  CheckCircle2,
  XCircle,
  X,
  ScanText,
  ShieldAlert,
  GitCompare,
  FileBarChart
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// DATA STRUCTURES
// ─────────────────────────────────────────────────────────────────────────────

const helpCategories = [
  { id: "getting-started", title: "Getting Started", desc: "Learn the basics of AstraFinance AI.", icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
  { id: "workspaces", title: "Workspaces", desc: "Upload documents, organize analyses and manage workspace data.", icon: Database, color: "text-primary", bg: "bg-primary/10" },
  { id: "agents", title: "AI Agents", desc: "Understand Document, Extraction, Red Flag, Comparison, Research and Report agents.", icon: Activity, color: "text-destructive", bg: "bg-destructive/10" },
  { id: "analysis", title: "Financial Analysis", desc: "Learn how financial analysis and metrics work.", icon: FileText, color: "text-success", bg: "bg-success/10" },
  { id: "reports", title: "Reports", desc: "Generate, view and download AI-generated financial reports.", icon: FileText, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-500/10" },
  { id: "orchestration", title: "Agent Orchestration", desc: "Understand the execution pipeline and agent activity.", icon: Activity, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-500/10" },
  { id: "security", title: "Account & Security", desc: "Profile, sessions, authentication and security.", icon: Shield, color: "text-muted-foreground", bg: "bg-surface" },
  { id: "ai-config", title: "AI Configuration", desc: "Configure Groq, Gemini fallback, reasoning and guardrails.", icon: Settings, color: "text-fuchsia-600 dark:text-fuchsia-400", bg: "bg-fuchsia-50 dark:bg-fuchsia-500/10" },
  { id: "notifications", title: "Notifications", desc: "Configure notification preferences and alerts.", icon: Bell, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
  { id: "troubleshooting", title: "Troubleshooting", desc: "Fix common frontend, backend and AI issues.", icon: Wrench, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-500/10" },
];

const faqs = [
  { q: "How do I create a new analysis?", a: "Navigate to the Workspaces tab and click 'New Workspace'. Give it a name and upload your financial documents (PDFs) to begin the automated analysis." },
  { q: "How do I upload a financial document?", a: "Inside a workspace, click the 'Upload Documents' button or drag and drop your PDFs into the designated area. The Document Agent will automatically start processing them." },
  { q: "What does each AI agent do?", a: "Our pipeline consists of 6 agents: Document (parsing), Extraction (metrics), Red Flag (risks), Comparison (benchmarking), Research (answering queries), and Report (synthesis)." },
  { q: "How does the agent orchestration pipeline work?", a: "When a document is uploaded, it automatically triggers a sequential pipeline. Each agent completes its specialized task and passes the structured context to the next agent in line." },
  { q: "How are financial reports generated?", a: "The Report Agent aggregates all the findings from the Extraction, Red Flag, and Comparison agents, and uses a structured LLM prompt to generate a cohesive, professional markdown/PDF report." },
  { q: "What happens if the primary AI provider fails?", a: "AstraFinance employs an automatic fallback mechanism. If Groq (primary) experiences downtime or rate limits, the request seamlessly routes to Gemini to ensure uninterrupted analysis." },
  { q: "Where can I download generated reports?", a: "Open any workspace, navigate to the 'Reports' tab, select a generated report, and click the 'Download PDF' button in the top right corner." },
  { q: "Why is my document still processing?", a: "Large documents (100+ pages) require extensive OCR and embedding generation. If it seems stuck, check the 'Troubleshooting' section or view the detailed agent logs in your workspace." }
];

const troubleshooting = [
  {
    title: "Report generation is stuck",
    causes: "The LLM provider may be experiencing high latency, or the document context is too large for the context window.",
    steps: "1. Refresh the workspace page. 2. Check the Agent Logs tab to see which specific agent is hanging. 3. Try generating the report again."
  },
  {
    title: "Document upload is not processing",
    causes: "The file might be corrupted, password-protected, or not a valid PDF.",
    steps: "1. Ensure the file is a standard PDF. 2. Remove any password protection. 3. Ensure the file size is under 50MB."
  },
  {
    title: "Primary AI provider is unavailable",
    causes: "Groq API rate limits exceeded or service downtime.",
    steps: "The system should automatically fallback to Gemini. If it doesn't, navigate to Settings > AI Configuration and manually set Gemini as the primary provider."
  }
];

const searchIndex = [
  ...helpCategories.map(c => ({ title: c.title, text: c.desc, type: "Category" })),
  ...faqs.map(f => ({ title: f.q, text: f.a, type: "FAQ" })),
  ...troubleshooting.map(t => ({ title: t.title, text: t.causes + " " + t.steps, type: "Troubleshooting" }))
];

const pipelineAgents = [
  { 
    id: "document", 
    name: "Document", 
    shortDesc: "Parse & prepare documents",
    icon: FileText,
    color: "blue",
    borderColor: "border-primary",
    bgColor: "bg-primary/10",
    glowColor: "rgba(59,130,246,0.15)",
    textColor: "text-primary",
    purpose: "Parses uploaded financial documents and prepares them for downstream analysis.",
    input: "PDF, financial documents",
    output: "Cleaned and structured document context",
    next: "Extraction Agent"
  },
  { 
    id: "extraction", 
    name: "Extraction", 
    shortDesc: "Extract financial data",
    icon: ScanText,
    color: "cyan",
    borderColor: "border-cyan-500",
    bgColor: "bg-cyan-50 dark:bg-cyan-500/10",
    glowColor: "rgba(6,182,212,0.15)",
    textColor: "text-cyan-500",
    purpose: "Extracts key financial metrics, tables, and numerical data from the parsed document.",
    input: "Structured document context",
    output: "JSON financial metrics",
    next: "Red Flag Agent"
  },
  { 
    id: "redflag", 
    name: "Red Flag", 
    shortDesc: "Detect financial risks",
    icon: ShieldAlert,
    color: "rose",
    borderColor: "border-rose-500",
    bgColor: "bg-destructive/10",
    glowColor: "rgba(244,63,94,0.15)", 
    textColor: "text-destructive",
    purpose: "Identifies anomalies, risks, and negative sentiment within the financial data.",
    input: "Document context & metrics",
    output: "Risk assessment & flags",
    next: "Comparison Agent"
  },
  { 
    id: "comparison", 
    name: "Comparison", 
    shortDesc: "Compare companies & periods",
    icon: GitCompare,
    color: "violet",
    borderColor: "border-violet-500",
    bgColor: "bg-violet-50 dark:bg-violet-500/10",
    glowColor: "rgba(139,92,246,0.15)",
    textColor: "text-violet-500",
    purpose: "Benchmarks the extracted data against historical periods or competitors.",
    input: "Current metrics & historical data",
    output: "Comparative analysis",
    next: "Research Agent"
  },
  { 
    id: "research", 
    name: "Research", 
    shortDesc: "Answer financial questions",
    icon: Search,
    color: "amber",
    borderColor: "border-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-500/10",
    glowColor: "rgba(245,158,11,0.15)",
    textColor: "text-amber-500",
    purpose: "Conducts deep-dive research into specific user queries based on the document.",
    input: "User queries & document context",
    output: "Detailed research answers",
    next: "Report Agent"
  },
  { 
    id: "report", 
    name: "Report", 
    shortDesc: "Generate final reports",
    icon: FileBarChart,
    color: "fuchsia",
    borderColor: "border-fuchsia-500",
    bgColor: "bg-fuchsia-50 dark:bg-fuchsia-500/10",
    glowColor: "rgba(217,70,239,0.15)",
    textColor: "text-fuchsia-500",
    purpose: "Synthesizes all findings from previous agents into a cohesive, professional markdown/PDF report.",
    input: "Aggregated agent outputs",
    output: "Final generated report",
    next: "None (End of pipeline)"
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function HelpSupportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [openTrouble, setOpenTrouble] = useState<number | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [activeAgent, setActiveAgent] = useState<number | null>(null);
  
  const [supportForm, setSupportForm] = useState({ category: "general", subject: "", description: "" });
  const [supportStatus, setSupportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  
  // Handle Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSupportStatus("loading");
    // Mock network request
    setTimeout(() => {
      setSupportStatus("success");
      setTimeout(() => setSupportStatus("idle"), 3000);
      setSupportForm({ category: "general", subject: "", description: "" });
    }, 1500);
  };

  const filteredResults = searchQuery.trim() === "" ? [] : searchIndex.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-surface text-foreground pb-20 selection:bg-primary/50">
      
      {/* ── HEADER ── */}
      <div className="bg-card border-b border-border sticky top-0 z-10 hidden md:block">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Help & Support</h1>
            <p className="text-xs text-muted-foreground font-medium">Find answers, learn how AstraFinance works, or get help.</p>
          </div>
          <div className="flex items-center gap-4">

            <div className="flex items-center gap-2 px-3 py-1 bg-success/10 text-success border border-emerald-100 dark:border-emerald-500/20 rounded-full text-xs font-semibold shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              All Systems Operational
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-16">
        
        {/* ── HERO SEARCH ── */}
        <section className="text-center max-w-2xl mx-auto space-y-6 mt-4 md:mt-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-3">How can we help?</h2>
            <p className="text-muted-foreground text-base md:text-lg">Search guides, features, troubleshooting steps, and answers.</p>
          </motion.div>
          
        </section>

        {/* ── QUICK ACTIONS ── */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Documentation", desc: "Learn how AstraFinance works.", icon: BookOpen, color: "text-primary", border: "hover:border-primary/50", shadow: "hover:shadow-blue-500/5", href: "#categories" },
              { title: "Troubleshooting", desc: "Fix common issues quickly.", icon: AlertCircle, color: "text-amber-600", border: "hover:border-amber-200", shadow: "hover:shadow-amber-500/5", href: "#troubleshooting" },
              { title: "Contact Support", desc: "Get help from the team.", icon: MessageCircle, color: "text-purple-600", border: "hover:border-purple-200", shadow: "hover:shadow-purple-500/5", href: "#support" },
              { title: "System Status", desc: "Check service availability.", icon: Activity, color: "text-success", border: "hover:border-success/50", shadow: "hover:shadow-emerald-500/5", href: "#status" },
            ].map((action, i) => (
              <motion.a
                href={action.href}
                key={i}
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 + (i * 0.05) }}
                className={cn(
                  "group bg-card p-5 rounded-xl border border-border shadow-sm transition-all duration-300",
                  "hover:-translate-y-1 hover:shadow-md cursor-pointer flex flex-col",
                  action.border, action.shadow
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("p-2 rounded-lg bg-surface group-hover:bg-opacity-50 transition-colors", action.color)}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-muted-foreground group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="font-semibold text-sm text-foreground">{action.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{action.desc}</p>
              </motion.a>
            ))}
          </div>
        </section>

        {/* ── BROWSE HELP TOPICS ── */}
        <section id="categories" className="space-y-6">
          <h3 className="text-xl font-bold tracking-tight border-b pb-2 border-border">Browse Help Topics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {helpCategories.map((cat, i) => (
              <div key={cat.id} className="group bg-card border border-border p-4 rounded-xl hover:border-border hover:shadow-sm transition-all cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg shrink-0", cat.bg, cat.color)}>
                    <cat.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{cat.title}</h4>
                    <p className="text-[13px] text-muted-foreground mt-1 leading-snug">{cat.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── AGENT HELP PIPELINE ── */}
        <section id="agents" className="w-full max-w-5xl mx-auto bg-gradient-to-b from-white to-slate-50 dark:from-card dark:to-background border border-border rounded-[20px] p-7 md:p-9 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03),0_10px_20px_-2px_rgba(0,0,0,0.02)] dark:shadow-none">
          
          <div className="text-center mb-8">
            <h3 className="text-[22px] md:text-[24px] font-bold text-foreground tracking-tight">Understanding AstraFinance Agents</h3>
            <p className="text-[14px] md:text-[15px] leading-[1.6] text-muted-foreground max-w-[680px] mx-auto mt-2">
              Your financial analysis flows through six specialized AI agents, each handling a specific stage of the analysis pipeline.
            </p>
          </div>

          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/70 opacity-75 motion-reduce:hidden"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Analysis Pipeline
            </div>
          </div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-3 lg:gap-5 relative"
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
            initial="hidden" animate="show"
          >
            {pipelineAgents.map((agent, i) => (
              <motion.div 
                key={agent.name}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.4 }}
                className="relative flex flex-col items-center group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xl"
                onClick={() => setActiveAgent(activeAgent === i ? null : i)}
                role="button"
                aria-label={`View details for ${agent.name} agent`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveAgent(activeAgent === i ? null : i);
                  }
                }}
              >
                {/* Node */}
                <div 
                  className={cn(
                    "w-[58px] h-[58px] md:w-[60px] md:h-[60px] rounded-2xl border-[1.5px] flex flex-col items-center justify-center transition-all duration-250 ease-out bg-card z-10",
                    agent.borderColor
                  )}
                  style={{
                    boxShadow: activeAgent === i ? `0 0 0 3px ${agent.glowColor}, 0 8px 25px ${agent.glowColor}` : 'none',
                    transform: activeAgent === i ? 'scale(1.04)' : 'scale(1)'
                  }}
                  onMouseEnter={(e) => {
                    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${agent.glowColor}, 0 8px 25px ${agent.glowColor}`;
                    e.currentTarget.style.transform = 'scale(1.04)';
                  }}
                  onMouseLeave={(e) => {
                    if (activeAgent !== i) {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}
                >
                  <span className={cn("text-[10px] font-bold leading-none mb-1 opacity-80", agent.textColor)}>0{i+1}</span>
                  <agent.icon className={cn("w-[18px] h-[18px] transition-transform duration-250 motion-safe:group-hover:-translate-y-0.5", agent.textColor)} />
                </div>
                
                {/* Connector Line (Desktop) */}
                {i < pipelineAgents.length - 1 && (
                  <div className="hidden md:block absolute top-[29px] left-[55%] w-[90%] h-[1px] bg-muted z-0 overflow-hidden pointer-events-none">
                    <motion.div 
                      className={cn("h-full w-1/3 bg-gradient-to-r from-transparent to-current opacity-60 motion-reduce:hidden", agent.textColor)}
                      animate={{ x: ["-100%", "300%"] }}
                      transition={{ repeat: Infinity, duration: 3, delay: i * 0.4, ease: "linear" }}
                      style={{ filter: "blur(2px)" }}
                    />
                  </div>
                )}
                {/* Vertical Connector (Mobile) */}
                {i < pipelineAgents.length - 1 && (
                  <div className="md:hidden w-[1px] h-4 bg-muted my-2" />
                )}

                {/* Info */}
                <div className="text-center mt-3 flex flex-col items-center flex-1">
                  <span className="text-[12px] font-bold tracking-[0.04em] text-foreground uppercase transition-colors group-hover:text-foreground">{agent.name}</span>
                  <span className="text-[11px] leading-[1.4] text-muted-foreground mt-1 max-w-[100px] transition-colors group-hover:text-foreground">{agent.shortDesc}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Active Detail Panel */}
          <AnimatePresence>
            {activeAgent !== null && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden mt-8 md:mt-10"
              >
                <div className={cn(
                  "p-5 md:p-6 rounded-xl border bg-card flex flex-col md:flex-row gap-6 md:gap-10",
                  pipelineAgents[activeAgent].borderColor,
                  pipelineAgents[activeAgent].bgColor
                )}>
                  <div className="flex-1">
                    <h4 className={cn("font-bold text-[14px] md:text-[15px] mb-2 uppercase tracking-wide flex items-center gap-2", pipelineAgents[activeAgent].textColor)}>
                      {React.createElement(pipelineAgents[activeAgent].icon, { className: "w-4 h-4" })}
                      {pipelineAgents[activeAgent].name} Agent
                    </h4>
                    <p className="text-[13px] md:text-sm text-muted-foreground leading-relaxed">
                      {pipelineAgents[activeAgent].purpose}
                    </p>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Input</span>
                      <span className="text-foreground font-medium text-[13px]">{pipelineAgents[activeAgent].input}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Output</span>
                      <span className="text-foreground font-medium text-[13px]">{pipelineAgents[activeAgent].output}</span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-border-subtle">
                      <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Next Stage</span>
                      <span className="text-foreground font-medium text-[13px]">{pipelineAgents[activeAgent].next}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* ── LEFT COL: FAQ & Troubleshooting ── */}
          <div className="lg:col-span-2 space-y-10">
            
            <section id="faq" className="space-y-6">
              <h3 className="text-xl font-bold tracking-tight border-b pb-2 border-border">Frequently Asked Questions</h3>
              <div className="space-y-3">
                {faqs.map((faq, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl overflow-hidden transition-all hover:border-border">
                    <button 
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between p-4 text-left focus:outline-none focus-visible:bg-surface"
                      aria-expanded={openFaq === i}
                    >
                      <span className="font-semibold text-sm text-foreground">{faq.q}</span>
                      <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0", openFaq === i ? "rotate-180" : "")} />
                    </button>
                    <AnimatePresence initial={false}>
                      {openFaq === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden bg-surface/50"
                        >
                          <div className="p-4 pt-1 text-[13px] text-muted-foreground leading-relaxed border-t border-border-subtle">
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </section>

            <section id="troubleshooting" className="space-y-6">
              <h3 className="text-xl font-bold tracking-tight border-b pb-2 border-border flex items-center gap-2">
                <Wrench className="w-5 h-5 text-muted-foreground" /> Troubleshooting
              </h3>
              <div className="space-y-3">
                {troubleshooting.map((t, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl overflow-hidden transition-all hover:border-amber-200 focus-within:border-amber-300 shadow-sm">
                    <button 
                      onClick={() => setOpenTrouble(openTrouble === i ? null : i)}
                      className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="font-semibold text-sm text-foreground">{t.title}</span>
                      </div>
                      <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", openTrouble === i ? "rotate-180" : "")} />
                    </button>
                    <AnimatePresence initial={false}>
                      {openTrouble === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden bg-amber-50/30 dark:bg-amber-500/10"
                        >
                          <div className="p-4 pt-0 text-[13px] border-t border-amber-100/50 dark:border-amber-500/20 mt-2 space-y-3">
                            <div>
                              <span className="font-semibold text-foreground block mb-1">Possible Causes:</span>
                              <span className="text-muted-foreground">{t.causes}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-foreground block mb-1">Steps to resolve:</span>
                              <span className="text-muted-foreground">{t.steps}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </section>

          </div>

          {/* ── RIGHT COL: Support, Status, Shortcuts ── */}
          <div className="space-y-6">
            
            {/* Contact Support */}
            <section id="support" className="bg-card border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" /> Still need help?
              </h3>
              <p className="text-[13px] text-muted-foreground mt-2 mb-5">
                Can't find what you're looking for? Send us a message and we'll help you troubleshoot the issue.
              </p>
              
              <form onSubmit={handleSupportSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Category</label>
                  <select 
                    value={supportForm.category}
                    onChange={e => setSupportForm({...supportForm, category: e.target.value})}
                    className="w-full bg-surface border border-border rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-primary transition-all"
                  >
                    <option value="general">General Support</option>
                    <option value="bug">Report a Bug</option>
                    <option value="feedback">Send Feedback</option>
                    <option value="billing">Account & Billing</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Subject</label>
                  <input 
                    required
                    value={supportForm.subject}
                    onChange={e => setSupportForm({...supportForm, subject: e.target.value})}
                    placeholder="Brief description"
                    className="w-full bg-surface border border-border rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Description</label>
                  <textarea 
                    required
                    value={supportForm.description}
                    onChange={e => setSupportForm({...supportForm, description: e.target.value})}
                    placeholder="How can we help?"
                    rows={3}
                    className="w-full bg-surface border border-border rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-primary transition-all resize-none"
                  />
                </div>
                <button 
                  disabled={supportStatus === "loading" || supportStatus === "success"}
                  type="submit" 
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold text-white transition-all",
                    supportStatus === "idle" || supportStatus === "error" ? "bg-primary hover:bg-primary/90 shadow-sm" : 
                    supportStatus === "loading" ? "bg-primary/70 cursor-wait" : "bg-success"
                  )}
                >
                  {supportStatus === "idle" && <><Send className="w-4 h-4" /> Send Message</>}
                  {supportStatus === "loading" && <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</span>}
                  {supportStatus === "success" && <><CheckCircle2 className="w-4 h-4" /> Submitted ✓</>}
                  {supportStatus === "error" && <><XCircle className="w-4 h-4" /> Failed — Try Again</>}
                </button>
              </form>
            </section>

            {/* System Status */}
            <section id="status" className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-bold text-foreground">AstraFinance Systems</h3>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-success/10 text-success border border-emerald-100 dark:border-emerald-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Operational
                </div>
              </div>
              <div className="space-y-3">
                {[
                  "Frontend Application", 
                  "Backend API", 
                  "AI Orchestration", 
                  "Document Processing", 
                  "Report Generation"
                ].map(service => (
                  <div key={service} className="flex items-center justify-between text-sm border-b border-slate-50 last:border-0 pb-2 last:pb-0">
                    <span className="text-muted-foreground font-medium text-[13px]">{service}</span>
                    <span className="text-success"><CheckCircle2 className="w-4 h-4" /></span>
                  </div>
                ))}
              </div>
            </section>


          </div>
        </div>
      </div>

      {/* ── COMMAND PALETTE OVERLAY ── */}
      <AnimatePresence>
        {showCommandPalette && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
              onClick={() => setShowCommandPalette(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20, x: "-50%" }} 
              animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }} 
              exit={{ opacity: 0, scale: 0.95, y: -20, x: "-50%" }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="fixed top-[15%] left-1/2 w-full max-w-2xl bg-card rounded-xl shadow-2xl border border-border z-50 overflow-hidden flex flex-col max-h-[70vh]"
            >
              <div className="flex items-center px-4 py-3 border-b border-border-subtle">
                <Search className="w-5 h-5 text-primary shrink-0" />
                <input 
                  autoFocus
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search help topics, FAQs..."
                  className="flex-1 bg-transparent border-none outline-none px-3 text-[15px] font-medium text-foreground placeholder:text-muted-foreground"
                />
                <button 
                  onClick={() => setShowCommandPalette(false)}
                  className="p-1 hover:bg-surface rounded-md text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-2 flex-1 custom-scrollbar">
                {searchQuery.trim() === "" ? (
                  <div className="py-12 text-center">
                    <Command className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-muted-foreground">Start typing to search</p>
                    <p className="text-xs text-muted-foreground mt-1">Search for reports, agents, workspaces, or settings.</p>
                  </div>
                ) : filteredResults.length > 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Results</div>
                    {filteredResults.map((res, i) => (
                      <button 
                        key={i}
                        className="w-full text-left flex flex-col gap-1 px-3 py-2.5 rounded-lg hover:bg-primary/10 focus:bg-primary/10 focus:outline-none transition-colors group"
                        onClick={() => setShowCommandPalette(false)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground group-hover:text-primary">{res.title}</span>
                          <span className="text-[10px] font-bold bg-surface text-muted-foreground px-1.5 py-0.5 rounded">{res.type}</span>
                        </div>
                        <span className="text-[12px] text-muted-foreground truncate">{res.text}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-sm font-semibold text-foreground">No results found</p>
                    <p className="text-xs text-muted-foreground mt-1">We couldn't find anything matching "{searchQuery}"</p>
                  </div>
                )}
              </div>
              <div className="bg-surface px-4 py-2 border-t border-border-subtle text-[11px] text-muted-foreground font-medium flex items-center gap-3">
                <span className="flex items-center gap-1"><kbd className="bg-card border rounded px-1 shadow-sm">↑</kbd><kbd className="bg-card border rounded px-1 shadow-sm">↓</kbd> to navigate</span>
                <span className="flex items-center gap-1"><kbd className="bg-card border rounded px-1 shadow-sm">Enter</kbd> to select</span>
                <span className="flex items-center gap-1"><kbd className="bg-card border rounded px-1 shadow-sm">Esc</kbd> to close</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
