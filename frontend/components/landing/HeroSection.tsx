"use client";

import { Button } from "@/components/ui/button";
import { ThreeDScene } from "@/components/features/ThreeDScene";
import { ArrowRight, CheckCircle2, Cpu, Loader2 } from "lucide-react";
import Link from "next/link";

export function HeroSection() {
  return (
    // Full-width section — the animation is the background
    <section className="relative min-h-[100vh] w-full overflow-hidden flex items-center transition-theme">

      {/* ── Background Grid Pattern ── */}
      <div className="bg-grid-pattern absolute inset-0 z-0 pointer-events-none transition-theme opacity-70" />

      {/* ── Background Animation (full-bleed, z-0) ── */}
      <div className="absolute inset-0 z-0 w-full h-full bg-[radial-gradient(circle_at_75%_45%,rgba(67,198,188,0.15),transparent_45%)]">
        <ThreeDScene />
      </div>

      {/* ── Soft gradient overlay so left-side text stays readable ── */}
      <div
        className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-r from-background via-background/80 to-transparent"
      />

      {/* ── Foreground content ── */}
      <div className="relative z-20 w-full max-w-[1600px] mx-auto px-6 md:px-12 lg:px-24 pt-32 pb-24">

        {/* Text stack — fixed width so it never wraps awkwardly */}
        <div className="w-full md:w-[520px] lg:w-[560px] flex flex-col gap-8">

          {/* Badge */}
          <div className="group flex items-center gap-2 w-fit px-4 py-2 rounded-full bg-primary/10 border border-primary/20 shadow-sm transition-all duration-300 hover:bg-primary/15 cursor-default hover:shadow-md hover:border-primary/30">
            <CheckCircle2 className="w-4 h-4 text-primary group-hover:scale-110 transition-transform duration-300" />
            <span className="text-xs font-bold tracking-widest text-primary uppercase">
              Zero hallucinated figures
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight text-foreground transition-theme">
            Ask your financial reports{" "}
            <span className="bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(67,198,188,0.2)]">anything</span>
          </h1>

          {/* Sub-copy */}
          <p className="text-lg md:text-xl text-muted-foreground leading-[1.65] max-w-[560px] transition-theme font-medium">
            <span className="text-foreground font-semibold">Expert analysis with verifiable citations.</span> Zero hallucinations, total
            transparency. Experience Bloomberg-level precision powered by advanced AI.
          </p>

          {/* CTAs */}
          <div className="flex flex-row items-center gap-4 flex-wrap pt-4">
            <Link href="/register">
              <Button className="group bg-primary hover:bg-primary-hover text-primary-foreground font-bold px-8 py-6 rounded-xl border border-primary/35 shadow-[0_8px_20px_rgba(67,198,188,0.2)] hover:shadow-[0_12px_30px_rgba(67,198,188,0.4)] transition-all duration-300 text-base flex items-center gap-2 hover:-translate-y-1">
                Get Started
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button
              variant="outline"
              className="bg-background/50 border border-border-strong text-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary-hover font-bold px-8 py-6 rounded-xl transition-all duration-300 text-base backdrop-blur-md shadow-sm hover:shadow-md hover:-translate-y-1"
            >
              Watch Demo
            </Button>
          </div>

        </div>
      </div>

      {/* ── Status badge — bottom-right, outside the text area ── */}
      <div className="absolute bottom-8 right-8 z-30 bg-card/90 backdrop-blur-md border border-border px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 transition-theme">
        <div className="p-2 bg-primary/10 rounded-xl transition-theme">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-theme">
            Status
          </span>
          <span className="text-sm font-semibold text-foreground transition-theme">
            Generating Financial Report...
          </span>
        </div>
      </div>
    </section>
  );
}
