"use client";

import React, { useState, useEffect } from "react";
import CountUp from "react-countup";
import { motion } from "framer-motion";

export function AnimatedNumber({ 
  value, 
  prefix = "", 
  suffix = "", 
  decimals = 1 
}: { 
  value: number; 
  prefix?: string; 
  suffix?: string; 
  decimals?: number 
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span>{prefix}{value.toFixed(decimals)}{suffix}</span>;
  }

  return (
    <CountUp 
      start={0} 
      end={value} 
      duration={2.5} 
      separator="," 
      decimals={decimals}
      prefix={prefix}
      suffix={suffix}
      useEasing={true}
    >
      {({ countUpRef }) => (
        <span ref={countUpRef} />
      )}
    </CountUp>
  );
}
