"use client";

import React from "react";
import { motion } from "framer-motion";

export function PremiumTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-foreground border border-slate-700/50 rounded-xl shadow-xl px-4 py-3 min-w-[140px]"
      >
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-2">
          {label}
        </p>
        <div className="flex flex-col gap-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full shadow-sm" 
                  style={{ backgroundColor: entry.color }} 
                />
                <span className="text-muted-foreground text-xs font-medium">
                  {entry.name}
                </span>
              </div>
              <span className="text-white text-sm font-bold tracking-tight">
                {typeof entry.value === 'number' && entry.value > 100 
                  ? entry.value.toLocaleString() 
                  : entry.value}
                {entry.name.toLowerCase().includes('margin') ? '%' : ''}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }
  return null;
}
