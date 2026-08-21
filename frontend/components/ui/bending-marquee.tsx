"use client";

import React, { useRef } from "react";
import { motion, useAnimationFrame, useMotionValue, useTransform } from "framer-motion";

interface BendingMarqueeProps {
  text: string;
  speed?: number; // Pixels per frame or speed multiplier
  color?: string;
}

export function BendingMarquee({ 
  text, 
  speed = 1,
  color = "currentColor"
}: BendingMarqueeProps) {
  // We use a motion value to track the offset
  const baseOffset = useMotionValue(0);

  // Animate the base offset continuously
  useAnimationFrame((t, delta) => {
    // Increase offset. Speed controls how fast. 
    // Decrease speed further as requested (divided by 120)
    let moveBy = speed * (delta / 120);
    
    // We'll map the offset from 0 to 50% since we duplicate the text twice.
    // If it exceeds 50%, we wrap it back to 0.
    const newOffset = baseOffset.get() - moveBy;
    if (newOffset <= -50) {
      baseOffset.set(0);
    } else {
      baseOffset.set(newOffset);
    }
  });

  // Convert the numerical offset into a percentage string for SVG startOffset
  const startOffset = useTransform(baseOffset, (v) => `${v}%`);

  // To make the scroll seamless, we duplicate the text a few times with spacing.
  const spacedText = `${text}  ✳  ${text}  ✳  ${text}  ✳  ${text}  ✳  `;

  return (
    <div className="w-full relative overflow-hidden h-[120px] md:h-[160px] flex items-center justify-center py-4">
      {/* 
        We use a viewBox of 0 0 1000 200 to establish a responsive coordinate system.
        The path is a gentle curve. 
      */}
      <svg 
        viewBox="0 0 1000 200" 
        preserveAspectRatio="none" 
        className="w-full h-full absolute inset-0 pointer-events-none"
      >
        <defs>
          <path 
            id="bend-curve" 
            d="M -500,50 Q 500,200 1500,50" 
          />
        </defs>
        
        {/* Adaptive background band (White in light mode, Black in dark mode) */}
        <use href="#bend-curve" className="stroke-white dark:stroke-black" strokeWidth="60" fill="transparent" />
        
        {/* Main Text (Black in light mode, Primary Teal in dark mode) */}
        <motion.text 
          className="text-2xl md:text-3xl font-medium tracking-wide pointer-events-none fill-black dark:fill-primary"
          style={{ whiteSpace: "pre" }}
          dy="10" // Vertically center text on the stroke
        >
          <motion.textPath 
            href="#bend-curve" 
            startOffset={startOffset}
            className="select-none"
          >
            {spacedText}
          </motion.textPath>
        </motion.text>
      </svg>
    </div>
  );
}
