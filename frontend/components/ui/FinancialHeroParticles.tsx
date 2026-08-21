"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function FinancialHeroParticles() {
  const particles = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      size: Math.random() * 4 + 2, // 2px to 6px
      x: Math.random() * 100, // 0 to 100%
      y: Math.random() * 100, // 0 to 100%
      duration: Math.random() * 20 + 10, // 10s to 30s
      delay: Math.random() * 5,
    }));
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden opacity-40">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent opacity-50" />
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary/30"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          animate={{
            y: [`${p.y}%`, `${p.y - 10}%`, `${p.y}%`],
            x: [`${p.x}%`, `${p.x + (Math.random() * 10 - 5)}%`, `${p.x}%`],
            opacity: [0.1, 0.4, 0.1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "linear",
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}
