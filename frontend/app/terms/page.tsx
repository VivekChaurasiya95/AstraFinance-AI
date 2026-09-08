"use client";

import { motion } from "framer-motion";
import { ArrowLeft, FileText, Scale, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function TermsOfServicePage() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      icon: <CheckCircle2 className="w-6 h-6 text-primary" />,
      content: "By accessing or using AstraFinance-AI, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site."
    },
    {
      title: "2. Use License",
      icon: <FileText className="w-6 h-6 text-primary" />,
      content: "Permission is granted to temporarily download one copy of the materials (information or software) on AstraFinance-AI for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title."
    },
    {
      title: "3. Disclaimer",
      icon: <AlertCircle className="w-6 h-6 text-primary" />,
      content: "The materials on AstraFinance-AI are provided on an 'as is' basis. AstraFinance-AI makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights."
    },
    {
      title: "4. Limitations",
      icon: <Scale className="w-6 h-6 text-primary" />,
      content: "In no event shall AstraFinance-AI or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on AstraFinance-AI's website."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/30">
      {/* Background ambient gradient */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute top-[30%] -left-[10%] w-[600px] h-[600px] bg-primary/10 blur-[120px] rounded-full opacity-40" />
      </div>
      
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors mb-10 group px-3 py-1.5 rounded-full hover:bg-surface border border-transparent hover:border-border">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Return to Home
          </Link>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-16"
        >
          <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-2xl mb-6 shadow-inner shadow-primary/20 border border-primary/20">
            <Scale className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-4">Terms of Service</h1>
          <p className="text-muted-foreground text-lg font-medium max-w-2xl">
            Please read these terms carefully before using our platform and services.
          </p>
        </motion.div>
        
        <div className="space-y-6">
          {sections.map((section, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              className="bg-card border border-border p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
            >
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-primary/5 rounded-tl-full -mr-16 -mb-16 transition-transform group-hover:scale-125" />
              <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="p-2.5 bg-surface rounded-xl border border-border shadow-sm">
                  {section.icon}
                </div>
                <h2 className="text-2xl font-bold tracking-tight">{section.title}</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed relative z-10 text-[15px]">
                {section.content}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground"
        >
          <p>These terms and conditions are governed by and construed in accordance with the laws.</p>
          <p className="mt-2">Last Updated: August 2026</p>
        </motion.div>
      </div>
    </div>
  );
}
