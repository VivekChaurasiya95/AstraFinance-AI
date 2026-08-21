"use client";

import React from "react";
import { 
  Bot, 
  Brain, 
  Database, 
  LineChart, 
  Newspaper, 
  Search, 
  Shield 
} from "lucide-react";

interface SolarLoaderProps {
  size?: number; // size of the sun
  speed?: number; // animation speed multiplier
  className?: string;
}

const SolarLoader: React.FC<SolarLoaderProps> = ({
  size = 60,
  speed = 1,
  className,
}) => {
  const agents = [
    { name: "Extraction", icon: <Search size={18} className="text-blue-500" />, orbit: 2.5, size: 0.6, duration: 3, ring: false },
    { name: "Analysis", icon: <LineChart size={18} className="text-cyan-500" />, orbit: 3.8, size: 0.6, duration: 4.5, ring: false },
    { name: "News", icon: <Newspaper size={18} className="text-teal-500" />, orbit: 5.2, size: 0.6, duration: 6, ring: true },
    { name: "Data", icon: <Database size={18} className="text-indigo-500" />, orbit: 6.8, size: 0.6, duration: 7.5, ring: false },
    { name: "Security", icon: <Shield size={18} className="text-purple-500" />, orbit: 8.5, size: 0.6, duration: 9, ring: false },
    { name: "Comparison", icon: <Brain size={18} className="text-rose-500" />, orbit: 10, size: 0.6, duration: 11, ring: true },
  ];

  return (
    <div
      className={`relative mx-auto flex items-center justify-center ${className}`}
      style={{
        width: `${size * 10}px`,
        height: `${size * 10}px`,
        perspective: "1200px",
      }}
    >
      <div
        className="relative animate-[tilt_10s_infinite_linear] [transform-style:preserve-3d]"
        style={{ width: "100%", height: "100%" }}
      >
        {/*  Diagonal Axis Line */}
        <div
          className="absolute left-1/2 top-1/2 bg-gradient-to-r from-cyan-300/20 to-blue-500/20 dark:from-cyan-500/20 dark:to-blue-300/20"
          style={{
            width: `${size * 10}px`,
            height: "1px",
            transform: "translate(-50%, -50%) rotate(38deg)",
            boxShadow: "0 0 8px rgba(67, 198, 188, 0.3)",
            zIndex: 0,
          }}
        />

        {/* Core Agent (Sun) */}
        <div
          className="absolute left-1/2 top-1/2 flex items-center justify-center rounded-full shadow-lg
                     bg-gradient-to-br from-cyan-300 to-blue-600 dark:from-cyan-400 dark:to-blue-700"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            transform: "translate(-50%, -50%) translateZ(30px)",
            boxShadow:
              "0 0 50px rgba(67, 198, 188, 0.4), inset 0 0 20px rgba(255,255,255,0.4)",
            zIndex: 10,
          }}
        >
          <Bot size={size * 0.5} className="text-white drop-shadow-md" />
        </div>

        {/* Agents + Orbits */}
        {agents.map((agent, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 rounded-full border border-cyan-500/10 dark:border-cyan-400/10"
            style={{
              width: `${agent.orbit * size}px`,
              height: `${agent.orbit * size}px`,
              marginLeft: `-${(agent.orbit * size) / 2}px`,
              marginTop: `-${(agent.orbit * size) / 2}px`,
              animation: `orbit3d ${agent.duration / speed}s linear infinite`,
              transformStyle: "preserve-3d",
              transform: `rotateX(20deg) translateZ(${(i % 2 === 0 ? 1 : -1) * 20}px)`,
            }}
          >
            <div
              className={`absolute flex items-center justify-center rounded-full bg-card border border-border shadow-md`}
              style={{
                width: `${agent.size * size}px`,
                height: `${agent.size * size}px`,
                top: "50%",
                left: "100%",
                transform: "translate(-50%, -50%) rotateX(-20deg)",
              }}
            >
              {/* Agent Icon inside the orb */}
              <div 
                className="flex items-center justify-center"
                style={{
                  animation: `counter-orbit3d ${agent.duration / speed}s linear infinite`,
                }}
              >
                {agent.icon}
              </div>

              {/* Glowing ring for some agents */}
              {agent.ring && (
                <div
                  className="absolute bg-gradient-to-r from-cyan-300/30 to-blue-500/30 opacity-80"
                  style={{
                    width: `${agent.size * size * 1.8}px`,
                    height: "1px",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%) rotate(25deg)",
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Inject keyframes
const style = `
@keyframes orbit3d {
  0% { transform: rotateX(20deg) rotateY(0deg); }
  100% { transform: rotateX(20deg) rotateY(-360deg); }
}

@keyframes counter-orbit3d {
  0% { transform: rotateY(0deg); }
  100% { transform: rotateY(360deg); }
}

@keyframes tilt {
  0%, 100% { transform: rotateX(15deg) rotateY(0deg); }
  50% { transform: rotateX(-5deg) rotateY(15deg); }
}
`;

if (typeof document !== "undefined" && !document.getElementById("orbit3d-keyframes")) {
  const styleEl = document.createElement("style");
  styleEl.id = "orbit3d-keyframes";
  styleEl.innerHTML = style;
  document.head.appendChild(styleEl);
}

export default SolarLoader;
