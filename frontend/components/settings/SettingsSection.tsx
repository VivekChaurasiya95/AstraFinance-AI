import { motion } from "framer-motion";

export function SettingsSection({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-6"
    >
      <div className="mb-3">
        <h3 className="text-base font-bold text-blue-950">{title}</h3>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <motion.div 
        whileHover={{ scale: 1.002 }}
        className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue-200/60 transition-all duration-300 relative overflow-hidden group"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        {children}
      </motion.div>
    </motion.section>
  );
}

export function SettingsToggle({
  label,
  description,
  checked,
  onChange,
  disabled = false
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-slate-100 last:border-0 last:pb-0 first:pt-0 group">
      <div className="pr-8">
        <div className="font-semibold text-slate-800 transition-colors group-hover:text-blue-900">{label}</div>
        {description && <div className="text-sm text-slate-500 mt-1">{description}</div>}
      </div>
      <button
        type="button"
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${checked ? 'bg-blue-600 hover:bg-blue-700 shadow-[0_0_8px_rgba(37,99,235,0.4)]' : 'bg-slate-200 hover:bg-slate-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-300 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}

export function SettingsSelect({
  label,
  description,
  value,
  options,
  onChange,
  disabled = false
}: {
  label: string;
  description?: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0 last:pb-0 first:pt-0 group">
      <div className="pr-8">
        <div className="font-semibold text-slate-800 transition-colors group-hover:text-blue-900">{label}</div>
        {description && <div className="text-sm text-slate-500 mt-1">{description}</div>}
      </div>
      <select
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border-2 border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-0 focus:border-blue-500 block p-2.5 font-bold min-w-[150px] disabled:opacity-50 shadow-sm hover:border-blue-300 transition-all cursor-pointer outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="font-medium">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
