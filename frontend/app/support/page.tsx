"use client";

import { motion } from "framer-motion";
import { ArrowLeft, LifeBuoy, Mail, MessageSquare, PhoneCall } from "lucide-react";
import Link from "next/link";

export default function SupportPage() {
  const supportChannels = [
    {
      title: "Email Support",
      description: "Send us an email and we'll get back to you within 24 hours.",
      icon: <Mail className="w-8 h-8 text-primary" />,
      action: "support@astrafinance.ai",
      link: "mailto:support@astrafinance.ai"
    },
    {
      title: "Live Chat",
      description: "Chat directly with our support team during business hours.",
      icon: <MessageSquare className="w-8 h-8 text-primary" />,
      action: "Start Chat",
      link: "#"
    },
    {
      title: "Phone Support",
      description: "Call us for urgent inquiries. Available Mon-Fri, 9am-5pm EST.",
      icon: <PhoneCall className="w-8 h-8 text-primary" />,
      action: "+1 (800) 123-4567",
      link: "tel:+18001234567"
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/30">
      {/* Background ambient gradient */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute top-[10%] right-[10%] w-[600px] h-[600px] bg-primary/10 blur-[120px] rounded-full opacity-40" />
      </div>
      
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 md:py-20">
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
        
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-6 shadow-inner shadow-primary/20 border border-primary/20"
          >
            <LifeBuoy className="w-10 h-10 text-primary" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl font-black tracking-tight text-foreground mb-4"
          >
            How can we help?
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-muted-foreground text-lg md:text-xl font-medium"
          >
            Our dedicated team is here to assist you with any questions or issues you may encounter with AstraFinance-AI.
          </motion.p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {supportChannels.map((channel, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            >
              <a 
                href={channel.link}
                className="flex flex-col h-full bg-card hover:bg-surface border border-border p-8 rounded-3xl shadow-sm hover:shadow-lg transition-all group relative overflow-hidden text-center cursor-pointer hover:border-primary/50"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="mx-auto p-4 bg-background rounded-2xl shadow-sm border border-border mb-6 group-hover:scale-110 transition-transform duration-300">
                  {channel.icon}
                </div>
                
                <h2 className="text-xl font-bold tracking-tight mb-3">{channel.title}</h2>
                <p className="text-muted-foreground mb-8 text-sm flex-grow">
                  {channel.description}
                </p>
                
                <div className="inline-block mt-auto">
                  <span className="font-bold text-primary group-hover:underline underline-offset-4 decoration-2">
                    {channel.action}
                  </span>
                </div>
              </a>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-24 p-8 bg-surface border border-border rounded-3xl flex flex-col md:flex-row items-center md:items-start justify-between gap-6"
        >
          <div className="flex-1 text-left w-full min-w-0">
            <h3 className="text-2xl font-bold mb-2">Looking for Documentation?</h3>
            <p className="text-muted-foreground text-sm w-full">
              Check out our comprehensive API and user documentation to get started quickly and learn advanced features.
            </p>
          </div>
          <Link href="/help" className="shrink-0 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-full hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 whitespace-nowrap self-center md:self-auto mt-4 md:mt-0">
            Visit Help Center
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
