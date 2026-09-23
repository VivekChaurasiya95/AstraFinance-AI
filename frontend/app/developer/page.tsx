"use client";

import { motion, Variants } from "framer-motion";
import { CinematicFooter } from "@/components/ui/motion-footer";
import { ArrowLeft, ExternalLink, Code2, Rocket, Layers, Sparkles, ArrowRight } from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { FluidBackground } from "@/components/landing/FluidBackground";

export default function DeveloperPage() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0, filter: "blur(4px)" },
    visible: { 
      y: 0, 
      opacity: 1,
      filter: "blur(0px)",
      transition: { type: "spring", stiffness: 100, damping: 20 }
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-background overflow-x-hidden flex flex-col text-foreground selection:bg-primary/30 transition-theme">
      
      {/* Global Fluid Background */}
      <FluidBackground />

      {/* Global Background Grid and Aurora from Landing Page */}
      <div className="bg-aurora fixed left-1/2 top-1/2 h-full w-full min-h-screen -translate-x-1/2 -translate-y-1/2 animate-bg-breathe rounded-[50%] blur-[120px] pointer-events-none z-0 transition-theme opacity-0 dark:opacity-100" />
      <div className="bg-grid-pattern absolute inset-0 z-0 pointer-events-none transition-theme opacity-50" />

      {/* Minimal Navigation */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-50 w-full p-6 md:px-12 flex justify-between items-center max-w-[1400px] mx-auto"
      >
        <Link href="/">
          <Button variant="ghost" className="rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white gap-2 transition-all group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back</span>
          </Button>
        </Link>
        <Link href="/">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-black/30 backdrop-blur-md hover:shadow-md dark:hover:bg-white/5 transition-all shadow-sm">
            <img src="/logo.svg" alt="Logo" className="h-8 w-auto object-contain scale-110 brightness-0 dark:brightness-100 transition-all" />
          </div>
        </Link>
      </motion.div>

      {/* Main Content - Bento Grid Layout */}
      <main className="relative z-10 flex-grow flex items-center justify-center px-4 py-8 md:py-16 sm:px-6 md:px-12">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-6"
        >
          {/* Header Card */}
          <motion.div variants={itemVariants} className="md:col-span-8 p-8 md:p-12 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex flex-col justify-center relative overflow-hidden group">
            
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 w-fit mb-6 relative z-10">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
                Developer Profile
              </span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-semibold font-cursive tracking-tight text-foreground leading-[1.1] mb-6 relative z-10">
              Hi, I'm Vivek Chaurasiya.<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-500">I build digital experiences.</span>
            </h1>
            
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed mb-8 relative z-10">
              A passionate Full-Stack Developer specializing in crafting modern, performant, and user-centric web applications. Architect and lead builder behind AstraFinance AI.
            </p>
            
            <div className="flex flex-wrap items-center gap-4 relative z-10">
              <Link href="https://vivek-chaurasiya.vercel.app" target="_blank">
                <Button className="rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 gap-2 h-12 px-8 transition-all shadow-md font-medium">
                  View Portfolio <ExternalLink className="w-4 h-4 ml-1 opacity-70" />
                </Button>
              </Link>
              <Link href="mailto:contact@example.com">
                <Button variant="outline" className="rounded-full bg-transparent border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 gap-2 h-12 px-8 transition-all font-medium">
                  Get in touch
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Photo Card */}
          <motion.div variants={itemVariants} className="md:col-span-4 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden relative group aspect-square md:aspect-auto">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10"></div>
            <img 
              src="/developer.png" 
              alt="Vivek Chaurasiya" 
              className="absolute inset-0 w-full h-full object-cover object-center grayscale-[0.1] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
            />
            <div className="absolute bottom-6 left-6 z-20 flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-white/20 dark:bg-black/40 backdrop-blur-md border border-white/20 shadow-sm text-white">
                <Code2 className="w-5 h-5" />
              </div>
              <div className="font-medium text-white tracking-tight bg-white/20 dark:bg-black/40 px-4 py-2.5 rounded-xl backdrop-blur-md border border-white/20 shadow-sm">
                Lead Developer
              </div>
            </div>
          </motion.div>

          {/* Social Links Card */}
          <motion.div variants={itemVariants} className="md:col-span-4 p-8 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex flex-col">
            <h3 className="text-sm font-semibold tracking-widest uppercase text-zinc-400 dark:text-zinc-500 mb-6">Connect</h3>
            <div className="space-y-3">
              <Link href="https://github.com/VivekChaurasiya95" target="_blank" className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors group">
                <div className="flex items-center gap-3 font-medium text-zinc-700 dark:text-zinc-200">
                  <FaGithub className="w-5 h-5 text-zinc-900 dark:text-white" />
                  GitHub
                </div>
                <ArrowRight className="w-4 h-4 -rotate-45 group-hover:rotate-0 opacity-40 group-hover:opacity-100 text-zinc-500 dark:text-zinc-400 transition-transform duration-300" />
              </Link>
              <Link href="https://www.linkedin.com/in/vivek-chaurasiya-722037315" target="_blank" className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors group">
                <div className="flex items-center gap-3 font-medium text-zinc-700 dark:text-zinc-200">
                  <FaLinkedin className="w-5 h-5 text-[#0a66c2]" />
                  LinkedIn
                </div>
                <ArrowRight className="w-4 h-4 -rotate-45 group-hover:rotate-0 opacity-40 group-hover:opacity-100 text-zinc-500 dark:text-zinc-400 transition-transform duration-300" />
              </Link>
            </div>
          </motion.div>

          {/* Highlights/Skills Bento Box */}
          <motion.div variants={itemVariants} className="md:col-span-8 p-8 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex flex-col">
            <h3 className="text-sm font-semibold tracking-widest uppercase text-zinc-400 dark:text-zinc-500 mb-6">Core Principles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 h-full">
              <div className="flex flex-col p-6 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-blue-100/80 dark:bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Rocket className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-semibold text-zinc-900 dark:text-white tracking-tight">Performant</h4>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">Shipping highly optimized, fast code that scales effortlessly.</p>
              </div>
              <div className="flex flex-col p-6 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-purple-100/80 dark:bg-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h4 className="font-semibold text-zinc-900 dark:text-white tracking-tight">Scalable Arch</h4>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">Built on clean architecture with robust foundations.</p>
              </div>
              <div className="flex flex-col p-6 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-emerald-100/80 dark:bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h4 className="font-semibold text-zinc-900 dark:text-white tracking-tight">Pixel Perfect</h4>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">Designing beautiful, intuitive experiences for the modern web.</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>

      <div className="z-20 relative bg-background border-t border-border mt-12">
        <CinematicFooter />
      </div>
    </div>
  );
}
