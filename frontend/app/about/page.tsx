"use client";

import { motion, Variants } from "framer-motion";
import { CinematicFooter } from "@/components/ui/motion-footer";
import { Navbar } from "@/components/layout/Navbar";
import { Shield, Zap, Brain, Target, Globe, BarChart3, LineChart, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FluidBackground } from "@/components/landing/FluidBackground";

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 100, damping: 20 } 
  }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    }
  }
};

export default function AboutPage() {
  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-background">
      <Navbar />
      
      <main className="relative z-10 flex-grow bg-transparent transition-theme overflow-hidden">
        
        {/* Global Fluid Background */}
        <FluidBackground />

        {/* Animated Backgrounds */}
        <div className="bg-aurora fixed left-1/2 top-1/2 h-full w-full min-h-screen -translate-x-1/2 -translate-y-1/2 animate-bg-breathe rounded-[50%] blur-[120px] pointer-events-none z-0 transition-theme opacity-0 dark:opacity-100" />
        <div className="bg-grid-pattern absolute inset-0 z-0 pointer-events-none transition-theme opacity-30" />
        
        {/* Content Container (Block layout, avoiding flex-center squishing bugs) */}
        <div className="relative z-10 pt-48 pb-32 px-6 md:px-12 max-w-[1200px] mx-auto w-full">
          
          {/* HERO SECTION */}
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={staggerContainer} 
            className="text-center max-w-4xl mx-auto mb-32"
          >
            <motion.div variants={fadeUpVariants} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 w-fit mb-8 relative z-10">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">About AstraFinance</span>
            </motion.div>
            
            <motion.div variants={fadeUpVariants}>
              <h1 className="text-6xl md:text-8xl font-semibold font-cursive tracking-tight text-foreground leading-[1.05] mb-8 relative z-10">
                Democratizing <br className="hidden md:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-primary animate-gradient-x">financial intelligence.</span>
              </h1>
            </motion.div>

            <motion.div variants={fadeUpVariants}>
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                We're on a mission to bridge the gap between institutional-grade financial data and everyday investors by harnessing the power of cutting-edge AI.
              </p>
            </motion.div>
          </motion.div>

          {/* MISSION SPLIT SECTION */}
          <motion.div 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center mb-40"
          >
            <motion.div variants={fadeUpVariants} className="space-y-8">
              <div className="w-14 h-14 rounded-[1rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-sm flex items-center justify-center">
                <Target className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-5xl md:text-6xl font-semibold font-cursive tracking-tight text-foreground mb-4">
                Our Vision
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                For decades, sophisticated financial models were locked behind the doors of Wall Street. AstraFinance AI was built to shatter those walls. We provide you with the exact same predictive capabilities, risk analysis, and market insights, instantly accessible through a beautiful interface.
              </p>
              <div className="flex items-center gap-4 pt-4">
                <div className="flex -space-x-4">
                  <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 border-2 border-background flex items-center justify-center font-bold text-xs text-muted-foreground">10k+</div>
                  <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center"><BarChart3 className="w-5 h-5 text-primary"/></div>
                </div>
                <span className="font-medium text-muted-foreground">Users making smarter decisions daily.</span>
              </div>
            </motion.div>
            
            <motion.div variants={fadeUpVariants} className="relative aspect-square md:aspect-[4/3] lg:aspect-square w-full rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-transparent opacity-50 z-0"></div>
              {/* Abstract decorative elements simulating dashboard intelligence */}
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 gap-6 opacity-80 group-hover:scale-105 transition-transform duration-700">
                <div className="w-full h-32 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-white/50 dark:border-white/10 backdrop-blur-md flex items-end px-6 pb-4 gap-4">
                  <div className="w-8 bg-primary/40 rounded-t-sm h-[40%]" />
                  <div className="w-8 bg-primary/60 rounded-t-sm h-[60%]" />
                  <div className="w-8 bg-primary/80 rounded-t-sm h-[80%]" />
                  <div className="w-8 bg-primary rounded-t-sm h-[100%]" />
                </div>
                <div className="w-full h-24 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-white/50 dark:border-white/10 backdrop-blur-md flex items-center justify-between px-8">
                  <LineChart className="w-8 h-8 text-muted-foreground" />
                  <TrendingUp className="w-8 h-8 text-emerald-500" />
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* VALUES SECTION (3-Column Layout) */}
          <motion.div 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="mb-32"
          >
            <motion.div variants={fadeUpVariants} className="text-center mb-16 relative z-10">
              <h2 className="text-5xl md:text-6xl font-semibold font-cursive tracking-tight text-foreground mb-6">Core Values</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">The foundational principles that drive every line of code we write.</p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
              {/* Value 1 */}
              <motion.div variants={fadeUpVariants} className="p-10 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:-translate-y-2 transition-all duration-300 group">
                <div className="w-16 h-16 rounded-[1rem] bg-blue-500/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <Brain className="w-8 h-8 text-blue-500" />
                </div>
                <h4 className="text-2xl font-bold text-foreground tracking-tight mb-4">True Intelligence</h4>
                <p className="text-muted-foreground leading-relaxed text-lg">We don't just display data; we synthesize it. Our models adapt to market volatility to give you clarity.</p>
              </motion.div>

              {/* Value 2 */}
              <motion.div variants={fadeUpVariants} className="p-10 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:-translate-y-2 transition-all duration-300 group">
                <div className="w-16 h-16 rounded-[1rem] bg-emerald-500/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <Shield className="w-8 h-8 text-emerald-500" />
                </div>
                <h4 className="text-2xl font-bold text-foreground tracking-tight mb-4">Bank-Grade Security</h4>
                <p className="text-muted-foreground leading-relaxed text-lg">Your financial footprint is sensitive. We employ military-grade encryption to ensure your data stays yours.</p>
              </motion.div>

              {/* Value 3 */}
              <motion.div variants={fadeUpVariants} className="p-10 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:-translate-y-2 transition-all duration-300 group">
                <div className="w-16 h-16 rounded-[1rem] bg-purple-500/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <Zap className="w-8 h-8 text-purple-500" />
                </div>
                <h4 className="text-2xl font-bold text-foreground tracking-tight mb-4">Relentless Speed</h4>
                <p className="text-muted-foreground leading-relaxed text-lg">Markets move in milliseconds. Our entire architecture is optimized to deliver real-time data without latency.</p>
              </motion.div>
            </div>
          </motion.div>

          {/* CTA SECTION */}
          <motion.div 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true }}
            variants={staggerContainer}
            className="w-full rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] p-12 md:p-20 text-center relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-transparent opacity-50 z-0"></div>
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8 text-foreground">Ready to revolutionize your wealth?</h2>
              <p className="text-xl text-muted-foreground mb-10">Join thousands of smart investors leveraging AstraFinance AI today.</p>
              <Link href="/register">
                <Button className="bg-foreground text-background hover:scale-105 transition-transform duration-300 text-lg font-bold px-10 py-7 rounded-full shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                  Get Started Now
                </Button>
              </Link>
            </div>
          </motion.div>

        </div>
      </main>

      <CinematicFooter />
    </div>
  );
}
