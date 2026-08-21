"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface CardSpreadProps {
  cards: React.ReactNode[];
  spreadOffset?: number;
  hoverSpreadMultiplier?: number;
}

export function CardSpread({
  cards,
  spreadOffset = 40,
  hoverSpreadMultiplier = 2,
}: CardSpreadProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Automatically cycle through cards when not hovered
  useEffect(() => {
    if (isHovered) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % cards.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isHovered, cards.length]);

  return (
    <div 
      className="relative flex items-center justify-center w-full min-h-[500px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {cards.map((card, idx) => {
        // True center calculation for even or odd lengths
        const distanceToCenter = idx - (cards.length - 1) / 2;
        
        // Calculate spread
        const xOffset = isHovered 
          ? distanceToCenter * spreadOffset * hoverSpreadMultiplier 
          : distanceToCenter * spreadOffset;
          
        const baseRotation = isHovered 
          ? distanceToCenter * 5
          : distanceToCenter * 2;
          
        const baseYOffset = isHovered ? Math.abs(distanceToCenter) * 10 : Math.abs(distanceToCenter) * 4;

        const isActive = activeIndex === idx;

        // Continuous floating animation when not hovered and not active
        const shouldFloat = !isHovered && !isActive;
        const animatedY = shouldFloat ? [baseYOffset, baseYOffset - 12, baseYOffset] : (isActive ? -80 : baseYOffset);
        const animatedRotate = shouldFloat ? [baseRotation, baseRotation + (distanceToCenter > 0 ? 2 : -2), baseRotation] : (isActive ? 0 : baseRotation);

        return (
          <motion.div
            key={idx}
            onClick={() => setActiveIndex(idx)}
            initial={false}
            animate={{
              x: isActive ? 0 : xOffset,
              y: animatedY,
              rotate: animatedRotate,
              zIndex: isActive ? 50 : 10 + idx,
              scale: isActive ? 1.05 : 1,
            }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              // Apply continuous easeInOut only to the floating properties when they are floating
              y: shouldFloat ? {
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: idx * 0.2,
              } : { type: "spring", stiffness: 260, damping: 20 },
              rotate: shouldFloat ? {
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: idx * 0.2,
              } : { type: "spring", stiffness: 260, damping: 20 },
            }}
            className="absolute cursor-pointer origin-bottom"
            style={{
              // Center the card origins
              left: '50%',
              top: '50%',
              marginLeft: '-180px', // half width (assuming 360px wide cards)
              marginTop: '-220px',  // half height
            }}
          >
            {card}
          </motion.div>
        );
      })}
    </div>
  );
}
