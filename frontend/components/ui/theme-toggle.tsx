"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid Hydration Mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-16 h-8 rounded-full border border-border bg-surface flex items-center justify-between px-1 opacity-50">
        <div className="w-6 h-6 rounded-full bg-background" />
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative w-[72px] h-9 rounded-full border border-border dark:bg-[#0B1118] dark:border-primary/45 bg-surface flex items-center justify-between px-1 focus:outline-none focus:ring-2 focus:ring-ring transition-colors duration-250 overflow-hidden"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <motion.div
        initial={false}
        animate={{
          x: isDark ? 36 : 0,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="absolute left-1 w-7 h-7 rounded-full bg-background border border-border-subtle shadow-sm z-0"
      />
      <div className="relative z-10 w-7 h-7 flex items-center justify-center">
        <Sun
          className={`w-4 h-4 transition-colors duration-250 ${
            !isDark ? "text-primary" : "text-muted-foreground"
          }`}
        />
      </div>
      <div className="relative z-10 w-7 h-7 flex items-center justify-center">
        <Moon
          className={`w-4 h-4 transition-colors duration-250 ${
            isDark ? "text-primary drop-shadow-[0_0_8px_rgba(67,198,188,0.4)]" : "text-muted-foreground"
          }`}
        />
      </div>
    </button>
  );
}
