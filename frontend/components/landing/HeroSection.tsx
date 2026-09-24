"use client";

import { Button } from "@/components/ui/button";
import { ThreeDScene } from "@/components/features/ThreeDScene";
import { ArrowRight, CheckCircle2, Cpu, Loader2, Layers } from "lucide-react";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative min-h-[100vh] w-full overflow-hidden flex items-center justify-center transition-theme pt-32 pb-24">

      <div className="absolute inset-0 bg-background/50 pointer-events-none z-0"></div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 flex flex-col items-center justify-center text-center pt-24 pb-16">
        {/* Eyebrow Badge */}
        <div className="inline-flex items-center gap-2.5 px-5 py-1.5 rounded-full bg-white dark:bg-card/80 border border-blue-200 dark:border-primary/20 shadow-sm text-[10px] sm:text-xs font-mono mb-8 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-primary animate-pulse" />
          <span className="font-bold tracking-wider text-slate-700 dark:text-foreground uppercase">
            MULTI-AGENT FINANCIAL RESEARCH
          </span>
        </div>
        
        {/* Main Headline */}
        <h1 className="text-5xl sm:text-7xl lg:text-[84px] font-serif text-slate-900 dark:text-white tracking-tight leading-[1.1] max-w-5xl mb-6">
          Turn Financial Documents Into {" "}
          <span className="italic font-serif font-normal text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500">
            Actionable Intelligence.
          </span>
        </h1>
        
        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-slate-600 dark:text-muted-foreground font-sans leading-relaxed max-w-3xl mb-12 text-center font-normal">
          Upload financial and business documents, extract meaningful metrics, identify red flags, compare companies, ask research questions, and generate structured reports using specialized AI agents.
        </p>
        
        {/* Primary CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center sm:w-auto">
          <Link href="/register" className="w-full sm:w-auto px-8 py-4 rounded-full bg-blue-600 dark:bg-primary text-white dark:text-primary-foreground font-medium text-[15px] hover:bg-blue-700 dark:hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 dark:shadow-primary/25 group">
            <span>Start Researching</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="#product" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white dark:bg-card text-slate-700 dark:text-foreground font-medium text-[15px] border border-slate-200 dark:border-border hover:bg-slate-50 dark:hover:bg-accent transition-all flex items-center justify-center gap-2 shadow-sm">
            <Layers className="w-5 h-5 text-blue-500" />
            <span>Explore How It Works</span>
          </Link>
        </div>
      </div>
      
    </section>
  );
}
