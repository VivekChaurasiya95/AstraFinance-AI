"use client";

import { Button } from "@/components/ui/button";
import { ThreeDScene } from "@/components/features/ThreeDScene";
import { ArrowRight, CheckCircle2, Cpu, Loader2 } from "lucide-react";
import Link from "next/link";

export function HeroSection() {
  return (
    // Full-width section — the animation is the background
    <section className="relative min-h-[100vh] w-full overflow-hidden flex items-center">

      {/* ── Background Animation (full-bleed, z-0) ── */}
      <div className="absolute inset-0 z-0 w-full h-full">
        <ThreeDScene />
      </div>

      {/* ── Soft gradient overlay so left-side text stays readable ── */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, rgba(248,250,252,0.98) 0%, rgba(248,250,252,0.96) 38%, rgba(248,250,252,0.60) 58%, transparent 78%)",
        }}
      />

      {/* ── Foreground content ── */}
      <div className="relative z-20 w-full max-w-[1600px] mx-auto px-6 md:px-12 lg:px-24 pt-32 pb-24">

        {/* Text stack — fixed width so it never wraps awkwardly */}
        <div className="w-full md:w-[520px] lg:w-[560px] flex flex-col gap-8">

          {/* Badge */}
          <div className="flex items-center gap-2 w-fit px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-semibold tracking-widest text-indigo-700 dark:text-indigo-300 uppercase">
              Zero hallucinated figures
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-slate-900 dark:text-white">
            Ask your financial reports{" "}
            <span className="text-blue-600 dark:text-blue-400">anything</span>
          </h1>

          {/* Sub-copy */}
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-[480px]">
            Expert analysis with verifiable citations. Zero hallucinations, total
            transparency. Experience Bloomberg-level precision powered by advanced AI.
          </p>

          {/* CTAs */}
          <div className="flex flex-row items-center gap-4 flex-wrap">
            <Link href="/register">
              <Button className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all text-base flex items-center gap-2">
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Button
              variant="outline"
              className="border-2 border-slate-300 dark:border-slate-600 hover:bg-white/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold px-8 py-6 rounded-xl transition-all text-base backdrop-blur-sm bg-white/60"
            >
              Watch Demo
            </Button>
          </div>

        </div>
      </div>

      {/* ── Status badge — bottom-right, outside the text area ── */}
      <div className="absolute bottom-8 right-8 z-30 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
          <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Status
          </span>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Generating Financial Report...
          </span>
        </div>
      </div>
    </section>
  );
}
