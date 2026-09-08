"use client";
import React, { useEffect, useState } from "react";
import { ThreeDPhotoCarousel } from '@/components/ui/3d-carousel';
import { useTheme } from "next-themes";

const testimonials = [
  {
    quote:
      "AstraFinance-AI completely transformed how our firm analyzes annual reports. The AI agents are incredibly accurate and save us hundreds of hours of manual financial research every month.",
    name: "Priya Sharma",
    designation: "Chief Investment Officer",
    src: "/testimonials/t4.png",
  },
  {
    quote:
      "The ability to instantly compare financial metrics across multiple competitors is a game changer. AstraFinance acts like a 24/7 dedicated analyst for my entire portfolio.",
    name: "Arjun Patel",
    designation: "Senior Portfolio Manager",
    src: "/testimonials/t5.png",
  },
  {
    quote:
      "I was skeptical of AI for financial due diligence, but AstraFinance's red flag detection and precise citations directly to the source documents won me over. It's an indispensable tool.",
    name: "Sneha Gupta",
    designation: "Director of Risk Management",
    src: "/testimonials/t6.png",
  },
  {
    quote:
      "We've reduced our earnings analysis turnaround time by 80%. The extraction agent flawlessly pulls the exact metrics we need without hallucinating data.",
    name: "Rahul Desai",
    designation: "Head of Equity Research",
    src: "/testimonials/t1.png",
  },
  {
    quote:
      "AstraFinance provides the kind of deep dive forensic accounting analysis that usually takes weeks, instantly. It’s an absolute powerhouse for our quant strategies.",
    name: "Ananya Singh",
    designation: "Quantitative Analyst",
    src: "/testimonials/t10.jpg",
  },
  {
    quote:
      "The automatic generation of investment memos directly from uploaded filings is nothing short of magic. Our investment committee relies on it daily.",
    name: "Karan Malhotra",
    designation: "Managing Partner",
    src: "/testimonials/t3.png",
  },
  {
    quote:
      "AstraFinance’s speed in extracting alternative data from massive datasets has given us a distinct edge. It effortlessly uncovers the hidden insights we were previously missing.",
    name: "Vikram Mehta",
    designation: "Principal Analyst",
    src: "/testimonials/t7.png",
  },
];

export const TestimonialsSection = () => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <section className="relative py-24 bg-transparent transition-theme overflow-hidden">
      <div className="container relative z-10 mx-auto px-4 md:px-6 mb-16">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl transition-theme">
            Trusted by Top Financial Analysts
          </h2>
          <p className="max-w-[900px] text-secondary-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed transition-theme mx-auto">
            See how AstraFinance-AI is revolutionizing financial research and portfolio management for industry leaders.
          </p>
        </div>
      </div>

      <div className="w-full bg-background py-16 relative border-y border-border shadow-none transition-theme overflow-hidden">
        {/* Footer-style Background Pattern inside the card */}
        <div className="bg-aurora absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 animate-bg-breathe rounded-[50%] blur-[80px] pointer-events-none z-0 transition-theme" />
        <div className="bg-grid-pattern absolute inset-0 z-0 pointer-events-none transition-theme" />
        <div className="items-center justify-center relative flex w-full">
          <ThreeDPhotoCarousel testimonials={testimonials} />
        </div>
      </div>
    </section>
  );
};
