"use client";
import React, { useEffect, useState } from "react";
import { CircularTestimonials } from '@/components/ui/circular-testimonials';
import { useTheme } from "next-themes";

const testimonials = [
  {
    quote:
      "AstraFinance-AI completely transformed how our firm analyzes annual reports. The AI agents are incredibly accurate and save us hundreds of hours of manual financial research every month.",
    name: "Priya Sharma",
    designation: "Chief Investment Officer",
    src: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=800&h=800&auto=format&fit=crop&crop=faces",
  },
  {
    quote:
      "The ability to instantly compare financial metrics across multiple competitors is a game changer. AstraFinance acts like a 24/7 dedicated analyst for my entire portfolio.",
    name: "Arjun Patel",
    designation: "Senior Portfolio Manager",
    src: "https://images.unsplash.com/photo-1556157382-97eda2d62296?q=80&w=800&h=800&auto=format&fit=crop&crop=faces",
  },
  {
    quote:
      "I was skeptical of AI for financial due diligence, but AstraFinance's red flag detection and precise citations directly to the source documents won me over. It's an indispensable tool.",
    name: "Sneha Gupta",
    designation: "Director of Risk Management",
    src: "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?q=80&w=800&h=800&auto=format&fit=crop&crop=faces",
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

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl transition-theme">
            Trusted by Top Financial Analysts
          </h2>
          <p className="max-w-[900px] text-secondary-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed transition-theme">
            See how AstraFinance-AI is revolutionizing financial research and portfolio management for industry leaders.
          </p>
        </div>

        <div className="bg-background p-8 md:p-16 rounded-2xl min-h-[300px] flex flex-wrap gap-6 items-center justify-center relative border border-border shadow-none transition-theme overflow-hidden">
          {/* Footer-style Background Pattern inside the card */}
          <div className="bg-aurora absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 animate-bg-breathe rounded-[50%] blur-[80px] pointer-events-none z-0 transition-theme" />
          <div className="bg-grid-pattern absolute inset-0 z-0 pointer-events-none transition-theme" />
        <div
          className="items-center justify-center relative flex w-full"
          style={{ maxWidth: "1024px" }}
        >
          <CircularTestimonials
            testimonials={testimonials}
            autoplay={true}
            colors={{
              name: "var(--foreground)",
              designation: "var(--muted-foreground)",
              testimony: "var(--foreground)",
              arrowBackground: "var(--card-elevated)",
              arrowForeground: "var(--foreground)",
              arrowHoverBackground: "var(--primary)",
            }}
            fontSizes={{
              name: "24px",
              designation: "16px",
              quote: "18px",
            }}
          />
        </div>
      </div>
    </div>
  </section>
  );
};
