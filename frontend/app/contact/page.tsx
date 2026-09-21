"use client";

import { motion, Variants } from "framer-motion";
import { CinematicFooter } from "@/components/ui/motion-footer";
import { Navbar } from "@/components/layout/Navbar";
import { Mail, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FluidBackground } from "@/components/landing/FluidBackground";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 }
  }
};

export default function ContactPage() {
  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-background">
      <Navbar />
      
      {/* Main Content Area matching Landing Page Theme */}
      <main className="relative z-10 flex-grow bg-transparent transition-theme overflow-hidden pb-24">
        
        {/* Global Fluid Background */}
        <FluidBackground />

        {/* Global Background Grid and Aurora from Landing Page */}
        <div className="bg-aurora fixed left-1/2 top-1/2 h-full w-full min-h-screen -translate-x-1/2 -translate-y-1/2 animate-bg-breathe rounded-[50%] blur-[120px] pointer-events-none z-0 transition-theme opacity-0 dark:opacity-100" />
        <div className="bg-grid-pattern absolute inset-0 z-0 pointer-events-none transition-theme opacity-50" />
        
        <div className="relative z-10 pt-48 pb-32 px-6 md:px-12 max-w-[1200px] mx-auto w-full">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-20 w-full"
          >
            {/* Left Column: Info */}
            <motion.div variants={itemVariants} className="flex-1 w-full max-w-[500px] min-w-[300px] flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 w-fit mb-6 relative z-10">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
                  Get In Touch
                </span>
              </div>
              
              <h1 className="text-6xl md:text-7xl font-semibold font-cursive tracking-tight text-foreground leading-[1.1] mb-6 whitespace-normal">
                Let's build <br className="hidden lg:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-500">the future.</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-10 w-full">
                Have a question, feedback, or want to explore partnership opportunities? We'd love to hear from you.
              </p>

              <div className="space-y-6 w-full">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-[1rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-sm flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Email Us</h4>
                    <a href="mailto:hello@astrafinance.ai" className="text-muted-foreground hover:text-primary transition-colors mt-1 block">hello@astrafinance.ai</a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-[1rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-sm flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Support</h4>
                    <a href="#" className="text-muted-foreground hover:text-primary transition-colors mt-1 block">Visit Support Center</a>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Form Card */}
            <motion.div variants={itemVariants} className="flex-1 w-full max-w-[650px]">
              <div className="p-8 md:p-12 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] relative overflow-hidden w-full">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>
                
                <form className="relative z-10 flex flex-col gap-6 w-full" onSubmit={(e) => e.preventDefault()}>
                  <div className="flex flex-col md:flex-row gap-6 w-full">
                    <div className="flex flex-col gap-2 w-full">
                      <label className="text-sm font-medium text-foreground">First Name</label>
                      <input 
                        type="text" 
                        placeholder="Aarav"
                        className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/50 dark:border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground text-foreground"
                      />
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      <label className="text-sm font-medium text-foreground">Last Name</label>
                      <input 
                        type="text" 
                        placeholder="Sharma"
                        className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/50 dark:border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground text-foreground"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 w-full">
                    <label className="text-sm font-medium text-foreground">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="aarav@company.com"
                      className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/50 dark:border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground text-foreground"
                    />
                  </div>

                  <div className="flex flex-col gap-2 w-full">
                    <label className="text-sm font-medium text-foreground">Message</label>
                    <textarea 
                      rows={4}
                      placeholder="How can we help you?"
                      className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/50 dark:border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground text-foreground resize-none"
                    />
                  </div>

                  <Button className="w-full h-12 mt-2 rounded-xl bg-foreground text-background hover:bg-foreground/90 gap-2 transition-all font-medium text-base group">
                    Send Message
                    <Send className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>

      <CinematicFooter />
    </div>
  );
}
