"use client";

import React from "react";
import { ArrowRight, Sparkles, LayoutPanelLeft } from "lucide-react";

export function PeerBenchmarkingSection() {
  return (
    <section className="py-24 sm:py-32 bg-transparent relative z-10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Robust Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Storytelling */}
          <div className="lg:col-span-5 flex flex-col gap-6 sm:gap-8 relative z-20">
            
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 w-fit">
              <LayoutPanelLeft className="w-4 h-4 text-primary" />
              <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
                Comparison Agent
              </span>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-5xl md:text-6xl font-semibold font-cursive tracking-tight text-foreground mb-4">
                Compare Financial Performance <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-500">Side by Side</span>
              </h2>
              
              <p className="text-muted-foreground text-lg leading-relaxed">
                Bring extracted financial metrics from multiple documents into one view and quickly identify meaningful differences across companies.
              </p>
            </div>
            
            <div className="pt-2 sm:pt-4">
              <a href="#" className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-foreground text-background text-sm font-semibold hover:scale-105 transition-transform duration-300 shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] group w-fit">
                Explore Company Comparison 
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>

          {/* Right Column: Visualization */}
          <div className="lg:col-span-7 relative w-full">
            
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-primary/10 via-transparent to-cyan-500/10 rounded-full blur-3xl -z-10 opacity-70 pointer-events-none" />

            <div className="flex flex-col gap-6 relative z-10 w-full">
              
              {/* Tag */}
              <div className="flex justify-start sm:justify-end">
                <span className="px-4 py-1.5 rounded-full text-[10px] font-mono font-bold border border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-xl text-foreground shadow-sm uppercase tracking-widest">
                  From Extracted Document Data
                </span>
              </div>

              {/* Cards Container - Using Flex to prevent horizontal overflow */}
              <div className="flex flex-col sm:flex-row gap-5 relative w-full items-stretch">
                
                {/* Company A Card (Hero) */}
                <div className="flex-1 relative p-6 sm:p-7 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all hover:-translate-y-2 duration-500 z-20 min-w-0">
                  <div className="mb-6 sm:mb-8">
                    <h3 className="text-xl sm:text-2xl font-bold font-serif text-foreground mb-1.5 truncate">Company A</h3>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground font-mono uppercase tracking-[0.2em] truncate">Financial Overview</p>
                  </div>
                  
                  <div className="space-y-5 sm:space-y-6">
                    <MetricRow label="Revenue" value="$12.4B" highlight barWidth="w-full" colorTheme="blue" />
                    <MetricRow label="Net Profit" value="$1.8B" highlight barWidth="w-[85%]" colorTheme="blue" />
                    <MetricRow label="EBITDA" value="$3.1B" highlight barWidth="w-[90%]" colorTheme="blue" />
                    <MetricRow label="ROE" value="18.2%" highlight barWidth="w-full" colorTheme="blue" />
                  </div>
                </div>
                
                {/* Company B Card */}
                <div className="flex-1 relative p-6 sm:p-7 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all hover:-translate-y-2 duration-500 z-10 min-w-0">
                  <div className="mb-6 sm:mb-8">
                    <h3 className="text-xl sm:text-2xl font-bold font-serif text-foreground mb-1.5 truncate">Company B</h3>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground font-mono uppercase tracking-[0.2em] truncate">Financial Overview</p>
                  </div>
                  
                  <div className="space-y-5 sm:space-y-6">
                    <MetricRow label="Revenue" value="$10.8B" highlight barWidth="w-[85%]" colorTheme="purple" />
                    <MetricRow label="Net Profit" value="$1.4B" highlight barWidth="w-[65%]" colorTheme="purple" />
                    <MetricRow label="EBITDA" value="$2.6B" highlight barWidth="w-[75%]" colorTheme="purple" />
                    <MetricRow label="ROE" value="15.7%" highlight barWidth="w-[85%]" colorTheme="purple" />
                  </div>
                </div>

              </div>

              {/* Insight Panel */}
              <div className="p-5 sm:p-6 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex items-start gap-4 sm:gap-5 relative overflow-hidden group hover:border-primary/30 transition-all hover:-translate-y-1 duration-500 w-full">
                {/* Subtle highlight sweep */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent -translate-x-[100%] group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
                
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-white/50 dark:border-white/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
                    <span className="text-sm sm:text-base font-bold text-foreground font-serif truncate">Comparison Insight</span>
                    <span className="text-[8px] sm:text-[9px] font-mono text-muted-foreground uppercase tracking-[0.2em] border border-black/5 dark:border-white/10 px-2 py-1 rounded-full bg-black/5 dark:bg-white/5 backdrop-blur-sm whitespace-nowrap self-start sm:self-auto">
                      Sample Insight
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-secondary-foreground leading-relaxed">
                    Company A shows stronger profitability and return metrics, while Company B has comparatively higher debt.
                  </p>
                </div>
              </div>

              {/* Bottom Microcopy */}
              <div className="mt-1 sm:mt-2 text-center sm:text-right px-2 sm:px-4">
                <span className="text-[9px] sm:text-[10px] font-mono text-muted-foreground/50 uppercase tracking-[0.25em]">
                  Compare → Understand → Investigate
                </span>
              </div>

            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}

function MetricRow({ label, value, highlight = false, barWidth, colorTheme = 'blue' }: { label: string, value: string, highlight?: boolean, barWidth: string, colorTheme?: 'blue' | 'purple' }) {
  const gradient = colorTheme === 'purple' ? 'from-purple-500 to-fuchsia-400' : 'from-primary to-cyan-400';
  
  return (
    <div className="group/row w-full">
      <div className="flex justify-between items-end mb-1.5 sm:mb-2 gap-2">
        <span className="text-xs sm:text-[13px] font-medium text-muted-foreground truncate">{label}</span>
        <span className={`text-xs sm:text-[15px] font-bold font-mono shrink-0 ${highlight ? 'text-foreground' : 'text-muted-foreground'}`}>
          {value}
        </span>
      </div>
      <div className="w-full h-1.5 sm:h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ease-out ${barWidth} ${
            highlight 
              ? `bg-gradient-to-r ${gradient}` 
              : 'bg-black/15 dark:bg-white/20 group-hover/row:bg-black/25 dark:group-hover/row:bg-white/30'
          }`} 
        />
      </div>
    </div>
  );
}
