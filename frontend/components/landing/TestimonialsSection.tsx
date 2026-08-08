"use client";
import React from "react";
import { CircularTestimonials } from '@/components/ui/circular-testimonials';

const testimonials = [
  {
    quote:
      "AstraFinance-AI completely transformed how our firm analyzes annual reports. The AI agents are incredibly accurate and save us hundreds of hours of manual financial research every month.",
    name: "Eleanor Wright",
    designation: "Chief Investment Officer",
    src: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&h=800&auto=format&fit=crop&crop=faces",
  },
  {
    quote:
      "The ability to instantly compare financial metrics across multiple competitors is a game changer. AstraFinance acts like a 24/7 dedicated analyst for my entire portfolio.",
    name: "Marcus Chen",
    designation: "Senior Portfolio Manager",
    src: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800&h=800&auto=format&fit=crop&crop=faces",
  },
  {
    quote:
      "I was skeptical of AI for financial due diligence, but AstraFinance's red flag detection and precise citations directly to the source documents won me over. It's an indispensable tool.",
    name: "Sarah Jenkins",
    designation: "Director of Risk Management",
    src: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=800&h=800&auto=format&fit=crop&crop=faces",
  },
];

export const TestimonialsSection = () => (
  <section className="py-24 bg-transparent text-zinc-900">
    <div className="container mx-auto px-4 md:px-6">
      <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
        <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
          Trusted by Top Financial Analysts
        </h2>
        <p className="max-w-[900px] text-zinc-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
          See how AstraFinance-AI is revolutionizing financial research and portfolio management for industry leaders.
        </p>
      </div>

      <div className="bg-white p-8 md:p-16 rounded-2xl min-h-[300px] flex flex-wrap gap-6 items-center justify-center relative border border-zinc-200 shadow-xl">
        <div
          className="items-center justify-center relative flex w-full"
          style={{ maxWidth: "1024px" }}
        >
          <CircularTestimonials
            testimonials={testimonials}
            autoplay={true}
            colors={{
              name: "#09090b",
              designation: "#52525b",
              testimony: "#3f3f46",
              arrowBackground: "#e4e4e7",
              arrowForeground: "#09090b",
              arrowHoverBackground: "#d4d4d8",
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
