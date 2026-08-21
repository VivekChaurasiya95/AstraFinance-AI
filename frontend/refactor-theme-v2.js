const fs = require('fs');
const path = require('path');

const DIRECTORIES = ['app', 'components'];

const patternMap = [
  // Backgrounds
  { regex: /\bbg-white\b/g, replacement: 'bg-card' },
  { regex: /\bbg-slate-50\b/g, replacement: 'bg-surface' },
  { regex: /\bbg-slate-100\b/g, replacement: 'bg-surface' },
  { regex: /\bbg-slate-200\b/g, replacement: 'bg-muted' },
  { regex: /\bbg-slate-300\b/g, replacement: 'bg-muted' },
  { regex: /\bbg-slate-400\b/g, replacement: 'bg-muted' },
  { regex: /\bbg-slate-800\b/g, replacement: 'bg-foreground' },
  { regex: /\bbg-slate-900\b/g, replacement: 'bg-foreground' },
  { regex: /\bbg-gray-[0-9]+\b/g, replacement: 'bg-surface' },
  { regex: /\bbg-zinc-[0-9]+\b/g, replacement: 'bg-surface' },
  
  // Hovers
  { regex: /\bhover:bg-slate-50\b/g, replacement: 'hover:bg-surface' },
  { regex: /\bhover:bg-slate-100\b/g, replacement: 'hover:bg-surface' },
  { regex: /\bhover:bg-slate-200\b/g, replacement: 'hover:bg-muted' },
  
  // Text
  { regex: /\btext-slate-300\b/g, replacement: 'text-muted-foreground' },
  { regex: /\btext-slate-400\b/g, replacement: 'text-muted-foreground' },
  { regex: /\btext-slate-500\b/g, replacement: 'text-muted-foreground' },
  { regex: /\btext-slate-600\b/g, replacement: 'text-muted-foreground' },
  { regex: /\btext-slate-700\b/g, replacement: 'text-foreground' },
  { regex: /\btext-slate-800\b/g, replacement: 'text-foreground' },
  { regex: /\btext-slate-900\b/g, replacement: 'text-foreground' },
  { regex: /\bhover:text-slate-[6-9]00\b/g, replacement: 'hover:text-foreground' },
  { regex: /\bhover:text-slate-[1-5]00\b/g, replacement: 'hover:text-muted-foreground' },
  
  // Borders
  { regex: /\bborder-slate-[1-3]00\b/g, replacement: 'border-border' },
  { regex: /\bborder-slate-[4-6]00\b/g, replacement: 'border-border-strong' },
  { regex: /\bhover:border-slate-[2-4]00\b/g, replacement: 'hover:border-border-strong' },
  { regex: /\bdivide-slate-[1-3]00\b/g, replacement: 'divide-border' },
  
  // Primary Blues & Indigos
  { regex: /\btext-blue-[4-7]00\b/g, replacement: 'text-primary' },
  { regex: /\btext-indigo-[4-7]00\b/g, replacement: 'text-primary' },
  { regex: /\bbg-blue-[5-7]00\b/g, replacement: 'bg-primary' },
  { regex: /\bbg-indigo-[5-7]00\b/g, replacement: 'bg-primary' },
  { regex: /\bbg-blue-[2-4]00\b/g, replacement: 'bg-primary/50' },
  { regex: /\bbg-indigo-[2-4]00\b/g, replacement: 'bg-primary/50' },
  { regex: /\bbg-blue-[5]0\b/g, replacement: 'bg-primary/10' },
  { regex: /\bbg-indigo-[5]0\b/g, replacement: 'bg-primary/10' },
  { regex: /\bbg-blue-100\b/g, replacement: 'bg-primary/20' },
  { regex: /\bbg-indigo-100\b/g, replacement: 'bg-primary/20' },
  { regex: /\bborder-blue-[4-6]00\b/g, replacement: 'border-primary' },
  { regex: /\bborder-indigo-[4-6]00\b/g, replacement: 'border-primary' },
  { regex: /\bborder-blue-[1-3]00\b/g, replacement: 'border-primary/50' },
  { regex: /\bhover:bg-blue-[6-8]00\b/g, replacement: 'hover:bg-primary-hover' },
  { regex: /\bhover:bg-blue-[5]0\b/g, replacement: 'hover:bg-primary/20' },
  { regex: /\bhover:bg-blue-100\b/g, replacement: 'hover:bg-primary/30' },
  { regex: /\bhover:text-blue-[6-8]00\b/g, replacement: 'hover:text-primary-hover' },
  
  // Danger (Red/Rose)
  { regex: /\btext-red-[5-7]00\b/g, replacement: 'text-destructive' },
  { regex: /\btext-rose-[5-7]00\b/g, replacement: 'text-destructive' },
  { regex: /\bbg-red-500\b/g, replacement: 'bg-destructive' },
  { regex: /\bbg-red-[5]0\b/g, replacement: 'bg-destructive/10' },
  { regex: /\bbg-rose-[5]0\b/g, replacement: 'bg-destructive/10' },
  { regex: /\bbg-red-100\b/g, replacement: 'bg-destructive/20' },
  { regex: /\bborder-red-[2-5]00\b/g, replacement: 'border-destructive/50' },
  { regex: /\bhover:text-red-[5-7]00\b/g, replacement: 'hover:text-destructive' },
  { regex: /\bhover:bg-red-[5]0\b/g, replacement: 'hover:bg-destructive/10' },
  
  // Success (Emerald/Teal)
  { regex: /\btext-emerald-[5-7]00\b/g, replacement: 'text-success' },
  { regex: /\btext-teal-[5-7]00\b/g, replacement: 'text-success' },
  { regex: /\bbg-emerald-500\b/g, replacement: 'bg-success' },
  { regex: /\bbg-emerald-[5]0\b/g, replacement: 'bg-success/10' },
  { regex: /\bborder-emerald-[2-5]00\b/g, replacement: 'border-success/50' },
  
  // Specific complex classes
  { regex: /\bbg-white\/80\b/g, replacement: 'bg-card/80' },
  { regex: /\bbg-slate-50\/80\b/g, replacement: 'bg-surface' },
  { regex: /\bbg-slate-900\/40\b/g, replacement: 'bg-black/40' },
  { regex: /\bbg-slate-900\/50\b/g, replacement: 'bg-black/50' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  for (const { regex, replacement } of patternMap) {
    content = content.replace(regex, replacement);
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
