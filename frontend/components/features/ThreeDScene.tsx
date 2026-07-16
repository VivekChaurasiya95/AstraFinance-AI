"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { motion } from "framer-motion";
import { FileSearch, BarChart3, ShieldAlert, Scale, MessageCircle, FileText, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Agent Data ---
const agents = [
  { id: 1, name: "Document Agent", icon: FileSearch, color: "text-indigo-500", bg: "bg-indigo-100", angle: 0 },
  { id: 2, name: "Extraction Agent", icon: BarChart3, color: "text-teal-500", bg: "bg-teal-100", angle: 60 },
  { id: 3, name: "Red Flag Agent", icon: ShieldAlert, color: "text-orange-500", bg: "bg-orange-100", angle: 120 },
  { id: 4, name: "Comparison Agent", icon: Scale, color: "text-purple-500", bg: "bg-purple-100", angle: 180 },
  { id: 5, name: "Research Agent", icon: MessageCircle, color: "text-blue-500", bg: "bg-blue-100", angle: 240 },
  { id: 6, name: "Report Agent", icon: FileText, color: "text-indigo-400", bg: "bg-indigo-100", angle: 300 },
];

export function ThreeDScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);

  // --- Three.js Background (Rings & Particles) ---
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let width = container.clientWidth;
    let height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    
    // Absolute position underneath the UI
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.zIndex = "0";
    renderer.domElement.style.pointerEvents = "none";
    container.appendChild(renderer.domElement);

    // Particles (Glowing Dots)
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 40;
    const posArray = new Float32Array(particlesCount * 3);
    const colorsArray = new Float32Array(particlesCount * 3);
    const palette = [
      new THREE.Color(0x6366f1), // Indigo
      new THREE.Color(0x14b8a6), // Teal
      new THREE.Color(0xf97316), // Orange
      new THREE.Color(0xa855f7), // Purple
      new THREE.Color(0x3b82f6), // Blue
    ];

    for (let i = 0; i < particlesCount * 3; i += 3) {
      const radius = 2 + Math.random() * 3;
      const angle = Math.random() * Math.PI * 2;
      posArray[i] = Math.cos(angle) * radius; // x
      posArray[i + 1] = (Math.random() - 0.5) * 2; // y
      posArray[i + 2] = Math.sin(angle) * radius; // z

      const color = palette[Math.floor(Math.random() * palette.length)];
      colorsArray[i] = color.r;
      colorsArray[i + 1] = color.g;
      colorsArray[i + 2] = color.b;
    }
    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
    particlesGeometry.setAttribute("color", new THREE.BufferAttribute(colorsArray, 3));
    
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // Orbit Rings
    const ringGroup = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.RingGeometry(2.8 + i * 0.4, 2.82 + i * 0.4, 64);
      const ringMat = new THREE.MeshBasicMaterial({ 
        color: 0x818cf8, 
        transparent: true, 
        opacity: 0.15 - (i * 0.04),
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      
      // Give rings a slight varied tilt
      ring.rotation.y = (Math.random() - 0.5) * 0.2;
      ring.rotation.x += (Math.random() - 0.5) * 0.2;
      ringGroup.add(ring);
    }
    
    // Tilt the entire ring group slightly
    ringGroup.rotation.x = 0.2;
    scene.add(ringGroup);

    camera.position.z = 6;
    camera.position.y = 1;
    camera.lookAt(0, 0, 0);

    let animationFrameId: number;
    function animate(time: number) {
      animationFrameId = requestAnimationFrame(animate);
      const t = time * 0.001;

      // Rotate particles and rings
      particlesMesh.rotation.y = t * 0.1;
      ringGroup.rotation.y = t * 0.05;
      
      // Gentle floating for particles
      particlesMesh.position.y = Math.sin(t * 0.5) * 0.1;

      renderer.render(scene, camera);
    }
    animate(0);

    const handleResize = () => {
      if (!containerRef.current) return;
      width = containerRef.current.clientWidth;
      height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.clear();
    };
  }, []);

  // --- Framer Motion UI Animation ---
  useEffect(() => {
    let animationFrameId: number;
    let startTime = performance.now();
    
    const animateUI = (time: number) => {
      const elapsed = time - startTime;
      // 20 seconds per full rotation
      const currentRotation = (elapsed / 20000) * 360; 
      setRotation(currentRotation);
      animationFrameId = requestAnimationFrame(animateUI);
    };
    
    animationFrameId = requestAnimationFrame(animateUI);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-end pr-[5%] overflow-hidden">
      
      {/* Container for Orbiting Agents — anchored to right half */}
      <div className="relative z-10 w-full max-w-[620px] aspect-square flex items-center justify-center">
        
        {/* Orbit Path Dashed Line */}
        <div className="absolute inset-8 rounded-full border border-dashed border-indigo-200/60 pointer-events-none" />

        {/* Orbiting Agents */}
        <motion.div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ rotate: rotation }}
        >
          {agents.map((agent) => {
            // Calculate position on the circle (radius of ~40% of container)
            return (
              <motion.div
                key={agent.id}
                className="absolute"
                style={{
                  rotate: agent.angle,
                  originX: 0.5,
                  originY: 0.5,
                  height: "85%", // Orbit radius controller
                }}
              >
                <motion.div
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 pointer-events-auto"
                  style={{
                    // Counter-rotate so the icon stays upright
                    rotate: -(rotation + agent.angle),
                  }}
                  whileHover={{ scale: 1.1 }}
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 flex items-center justify-center hover:shadow-lg transition-shadow duration-300 relative group cursor-pointer">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", agent.bg, agent.color)}>
                      <agent.icon className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                    </div>
                  </div>
                  <div className="text-center px-3 py-1 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-slate-100/50">
                    <div className="text-[10px] md:text-xs font-bold text-slate-700 whitespace-nowrap">
                      {agent.id}. {agent.name.replace(" Agent", "")}
                    </div>
                    <div className="text-[9px] md:text-[10px] text-slate-500 font-medium">Agent</div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Central Isometric Financial Report Document */}
        <div className="relative z-20 pointer-events-auto">
          <motion.div
            animate={{ 
              y: [0, -10, 0],
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="relative perspective-[1000px]"
          >
            {/* 3D Document Surface */}
            <div 
              className="w-48 h-64 md:w-56 md:h-72 bg-white rounded-xl shadow-[20px_30px_60px_rgba(0,0,0,0.1),_0_0_0_1px_rgba(0,0,0,0.05)] flex flex-col p-5 overflow-hidden"
              style={{
                transform: "rotateX(15deg) rotateY(-15deg) rotateZ(5deg)",
                transformStyle: "preserve-3d",
              }}
            >
              {/* Document Header */}
              <div className="text-xs font-bold tracking-widest text-slate-800 uppercase text-center mb-4 border-b border-slate-100 pb-2">
                Financial Report
              </div>
              
              {/* Skeleton Content - Bar Chart */}
              <div className="flex items-end gap-1.5 h-16 mb-4 mt-2">
                <div className="w-1/4 bg-blue-200 h-[40%] rounded-t-sm" />
                <div className="w-1/4 bg-blue-400 h-[70%] rounded-t-sm" />
                <div className="w-1/4 bg-blue-500 h-[100%] rounded-t-sm" />
                <div className="w-1/4 bg-indigo-500 h-[85%] rounded-t-sm" />
              </div>

              {/* Skeleton Content - Text Lines */}
              <div className="flex flex-col gap-2 mb-4">
                <div className="h-2 bg-slate-200 rounded-full w-full" />
                <div className="h-2 bg-slate-200 rounded-full w-[80%]" />
                <div className="h-2 bg-slate-200 rounded-full w-[90%]" />
              </div>

              {/* Skeleton Content - Line Chart */}
              <div className="mt-auto relative h-12 flex items-center">
                <svg viewBox="0 0 100 40" className="w-full h-full stroke-blue-500 overflow-visible" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M0 30 L20 15 L40 25 L60 5 L80 15 L100 0" />
                </svg>
              </div>

              {/* Pie Chart floating on right side */}
              <div className="absolute right-4 top-24 w-12 h-12 bg-white rounded-full shadow-md p-1">
                <div className="w-full h-full rounded-full border-4 border-blue-500 border-r-teal-400 border-b-orange-400" />
              </div>
            </div>

            {/* Blue Checkmark Badge */}
            <div 
              className="absolute -bottom-4 -right-4 w-14 h-14 bg-blue-500 rounded-full shadow-[0_10px_20px_rgba(59,130,246,0.3)] flex items-center justify-center border-4 border-slate-50"
              style={{
                transform: "translateZ(30px) rotateX(15deg) rotateY(-15deg) rotateZ(5deg)",
              }}
            >
              <Check className="w-6 h-6 text-white stroke-[3]" />
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
