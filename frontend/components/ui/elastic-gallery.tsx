"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

export interface ElasticItemProps {
  id: string;
  title: string;
  colorClass?: string;
  bgClass?: string;
  borderClass?: string;
  glowClass?: string;
  content: React.ReactNode;
}

interface ElasticGalleryProps {
  items: ElasticItemProps[];
}

export function ElasticGallery({ items }: ElasticGalleryProps) {
  const [activeId, setActiveId] = useState<string | null>(items.length > 0 ? items[0].id : null);

  return (
    <div className="w-full py-12 bg-transparent md:py-8">
      {/* Container */}
      <div className="mx-auto flex h-[500px] w-full flex-col gap-2 px-4 md:h-[540px] md:flex-row md:gap-4">
        {items.map((item) => {
          const isActive = activeId === item.id;
          
          return (
            <div
              key={item.id}
              onMouseEnter={() => setActiveId(item.id)}
              onClick={() => setActiveId(item.id)} // Touch support
              className={cn(
                "relative cursor-pointer overflow-hidden rounded-3xl border bg-card/80 backdrop-blur-2xl shadow-xl",
                "transition-[flex,filter,background,border,box-shadow] duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]",
                // Flex Logic
                isActive ? "flex-[5]" : "flex-[1]",
                // Card Styles when active
                isActive ? item.borderClass : "border-border/50",
                isActive ? item.glowClass : "shadow-none",
                isActive ? "opacity-100" : "opacity-70 hover:opacity-100"
              )}
            >
              
              {/* --- Expanded Content --- */}
              <div 
                className={cn(
                  "absolute inset-y-0 left-0 w-full min-w-[360px] transition-all duration-700 ease-in-out",
                  isActive ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8 pointer-events-none"
                )}
              >
                {item.content}
              </div>

              {/* --- Collapsed Content --- */}
              <div
                className={cn(
                  "absolute inset-0 flex flex-col items-center justify-end pb-8 transition-all duration-700 ease-in-out",
                  item.bgClass,
                  isActive ? "opacity-0 pointer-events-none scale-110" : "opacity-100 scale-100"
                )}
              >
                {/* Desktop: Vertical Text */}
                <span className={cn(
                  "hidden whitespace-nowrap text-xl font-bold uppercase tracking-widest [writing-mode:vertical-rl] md:block",
                  item.colorClass
                )}>
                  {item.title}
                </span>

                {/* Mobile: Horizontal ID/Label */}
                <span className={cn("block text-xs font-bold md:hidden", item.colorClass)}>
                  {item.title}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
