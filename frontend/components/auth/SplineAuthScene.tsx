"use client";

import Spline from '@splinetool/react-spline';
import { motion } from 'framer-motion';

export default function SplineAuthScene() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      className="absolute inset-0 w-full h-full"
    >
      <Spline
        scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode"
        className="w-full h-full"
      />
    </motion.div>
  );
}
