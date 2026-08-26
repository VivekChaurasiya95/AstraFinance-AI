/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const DIRECTORIES = [
  'app',
  'components',
];

const classMap = {
  // Backgrounds
  'bg-white': 'bg-card',
  'bg-slate-50': 'bg-surface',
  'bg-slate-100': 'bg-surface',
  'bg-slate-900': 'bg-foreground',
  'hover:bg-slate-50': 'hover:bg-surface',
  'hover:bg-slate-100': 'hover:bg-surface',
  'hover:bg-slate-200': 'hover:bg-surface',
  
  // Text
  'text-slate-900': 'text-foreground',
  'text-slate-800': 'text-foreground',
  'text-slate-700': 'text-foreground',
  'text-slate-600': 'text-muted-foreground',
  'text-slate-500': 'text-muted-foreground',
  'text-slate-400': 'text-muted-foreground',
  'hover:text-slate-900': 'hover:text-foreground',
  'hover:text-slate-800': 'hover:text-foreground',
  'hover:text-slate-700': 'hover:text-foreground',
  'hover:text-slate-600': 'hover:text-foreground',
  
  // Borders
  'border-slate-200': 'border-border',
  'border-slate-100': 'border-border-subtle',
  'border-slate-300': 'border-border',
  'hover:border-slate-200': 'hover:border-border',
  
  // Primary Blues
  'text-blue-700': 'text-primary',
  'text-blue-600': 'text-primary',
  'text-blue-500': 'text-primary',
  'text-blue-400': 'text-primary',
  'bg-blue-700': 'bg-primary',
  'bg-blue-600': 'bg-primary',
  'bg-blue-500': 'bg-primary',
  'bg-blue-400': 'bg-primary/70',
  'bg-blue-200': 'bg-primary/40',
  'bg-blue-100': 'bg-primary/20',
  'bg-blue-50': 'bg-primary/10',
  'border-blue-500': 'border-primary',
  'border-blue-400': 'border-primary',
  'border-blue-200': 'border-primary/50',
  'hover:bg-blue-800': 'hover:bg-primary-hover',
  'hover:bg-blue-700': 'hover:bg-primary-hover',
  'hover:text-blue-800': 'hover:text-primary-hover',
  'hover:text-blue-700': 'hover:text-primary',
  'hover:text-blue-600': 'hover:text-primary',
  'hover:border-blue-400': 'hover:border-primary',
  'hover:border-blue-200': 'hover:border-primary/50',
  'stroke-blue-500': 'stroke-primary',
  
  // Status Colors (Emerald/Teal)
  'text-emerald-700': 'text-success',
  'text-emerald-600': 'text-success',
  'bg-emerald-50': 'bg-success/10',
  'border-emerald-200': 'border-success/50',
  
  // Danger/Rose Colors
  'text-rose-600': 'text-destructive',
  'text-rose-500': 'text-destructive',
  'bg-rose-50': 'bg-destructive/10',
  'hover:text-rose-600': 'hover:text-destructive',
  'hover:text-rose-500': 'hover:text-destructive',
  'hover:bg-rose-50': 'hover:bg-destructive/10',
  
  // Specific fixes
  'bg-slate-50/80': 'bg-background-secondary',
  'bg-white/80': 'bg-card',
  'bg-slate-900/40': 'bg-background/80',
  'bg-slate-900/50': 'bg-black/50', // overlays
  'divide-slate-100': 'divide-border',
  'text-slate-300': 'text-muted-foreground',
  'text-slate-400': 'text-muted-foreground',
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // Match tailwind classes whole word only
  for (const [oldClass, newClass] of Object.entries(classMap)) {
    // Regex for exact class match (bounded by spaces, quotes, or newlines)
    const regex = new RegExp(`(?<=['"\\s\`])(${oldClass})(?=['"\\s\`])`, 'g');
    content = content.replace(regex, newClass);
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

DIRECTORIES.forEach(dir => {
  const target = path.join(__dirname, dir);
  if (fs.existsSync(target)) {
    walkDir(target);
  }
});

console.log("Refactoring complete.");
