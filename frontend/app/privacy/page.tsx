"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Shield, Lock, Eye, Database, Globe } from "lucide-react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  const sections = [
    {
      title: "1. Information We Collect",
      icon: <Database className="w-6 h-6 text-primary" />,
      content: "We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us. This information may include: name, email, phone number, financial documents for analysis, and other information you choose to provide."
    },
    {
      title: "2. How We Use Your Information",
      icon: <Globe className="w-6 h-6 text-primary" />,
      content: "We use the information we collect about you to provide, maintain, and improve our services, such as to facilitate payments, send receipts, provide products and services you request, develop new features, provide customer support, and send you updates and administrative messages."
    },
    {
      title: "3. Data Security",
      icon: <Lock className="w-6 h-6 text-primary" />,
      content: "AstraFinance-AI takes the security of your data seriously. We use advanced encryption and robust security measures to protect your personal and financial data against unauthorized access, alteration, disclosure, or destruction. All data processed by our AI models is strictly compartmentalized."
    },
    {
      title: "4. Sharing of Information",
      icon: <Eye className="w-6 h-6 text-primary" />,
      content: "We do not sell your personal information. We may share information with vendors, consultants, and other service providers who need access to such information to carry out work on our behalf, but always subject to strict confidentiality agreements."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/30">
      {/* Background ambient gradient */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute -top-[20%] w-[800px] h-[600px] bg-primary/10 blur-[120px] rounded-full opacity-50" />
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
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground text-lg font-medium max-w-2xl">
            We are committed to protecting your personal data and your right to privacy. 
            This policy outlines our data handling practices.
          </p>
        </motion.div>
        
        <div className="space-y-8">
          {sections.map((section, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              className="bg-card border border-border p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-150" />
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
          <p>By using AstraFinance-AI, you consent to our Privacy Policy.</p>
          <p className="mt-2">Last Updated: August 2026</p>
        </motion.div>
      </div>
    </div>
  );
}
