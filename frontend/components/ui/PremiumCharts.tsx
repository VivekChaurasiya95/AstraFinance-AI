"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { PremiumTooltip } from "./PremiumTooltip";


const SEG_COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899"];

const parseNum = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null) return NaN;
  if (typeof val === 'number') return val;
  const match = val.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : NaN;
};

// ── 1. Recharts Donut ────────────────────────────────────────────────────────
export function DonutChart({ segments }: { segments: any[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center relative">
        <div className="w-48 h-48 border-[20px] border-slate-100 rounded-full flex items-center justify-center">
           <span className="text-slate-400 font-bold text-sm">No Data</span>
        </div>
      </div>
    );
  }

  const validSegments = segments
    .map((seg) => ({ ...seg, numVal: parseNum(seg.value) }))
    .filter((seg) => Number.isFinite(seg.numVal) && seg.numVal > 0);

  const total = validSegments.reduce((s, seg) => s + seg.numVal, 0);

  if (total <= 0) {
    return (
      <div className="w-full h-full flex items-center justify-center relative">
        <div className="w-48 h-48 border-[20px] border-slate-100 rounded-full flex items-center justify-center">
           <span className="text-slate-400 font-bold text-sm">No Data</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[260px] relative flex flex-col items-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<PremiumTooltip />} />
          <Pie
            data={validSegments}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={95}
            paddingAngle={2}
            dataKey="numVal"
            nameKey="segment"
            stroke="none"
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {validSegments.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={SEG_COLORS[index % SEG_COLORS.length]} 
                opacity={activeIndex === null || activeIndex === index ? 1 : 0.3}
                style={{ transition: 'opacity 300ms ease' }}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-0">
        <span className="text-slate-900 text-3xl font-black tracking-tighter">100%</span>
        <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">Total Revenue</span>
      </div>
    </div>
  );
}

// ── 2. Recharts Area Trend ─────────────────────────────────────────────
export function QuarterlyTrendChart({ trendData }: { trendData: any[] }) {
  if (!trendData || !Array.isArray(trendData) || trendData.length === 0 || trendData[0].quarter == null) {
    return <div className="w-full h-40 flex items-center justify-center text-slate-400">No data</div>;
  }

  const validData = trendData.map(q => ({
    name: q.quarter,
    Revenue: parseNum(q.revenue) || 0,
    Margin: parseNum(q.margin) || 0,
  }));

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={validData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorMargin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 500 }} 
            dy={10} 
          />
          <YAxis 
            yAxisId="left"
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 500 }}
            tickFormatter={(value) => value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#10B981', fontSize: 12, fontWeight: 600 }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<PremiumTooltip />} cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Area 
            yAxisId="left"
            type="monotone" 
            dataKey="Revenue" 
            stroke="#3B82F6" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorRevenue)" 
            activeDot={{ r: 6, strokeWidth: 0, fill: '#3B82F6' }}
          />
          <Area 
            yAxisId="right"
            type="monotone" 
            dataKey="Margin" 
            stroke="#10B981" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorMargin)" 
            activeDot={{ r: 6, strokeWidth: 0, fill: '#10B981' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 3. Recharts Geography Bar (Replacing Polar) ────────────────────────
export function GeographySplitChart({ splitData }: { splitData: any[] }) {
  if (!splitData || !Array.isArray(splitData) || splitData.length === 0) {
    return <div className="w-full h-40 flex items-center justify-center text-slate-400">No data</div>;
  }
  const validGeos = splitData.map(g => ({ name: g.region, Value: parseNum(g.percentage) })).filter(g => Number.isFinite(g.Value));

  return (
    <div className="w-full h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={validGeos} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} tickFormatter={(val) => `${val}%`} />
          <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} width={100} />
          <Tooltip content={<PremiumTooltip />} cursor={{ fill: '#F1F5F9' }} />
          <Bar dataKey="Value" radius={[0, 4, 4, 0]} barSize={24}>
            {validGeos.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={SEG_COLORS[index % SEG_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 4. Recharts Key Metrics Bar (Log Scale Alternative) ────────────────────────
export function KeyMetricsBarChart({ metrics }: { metrics: any[] }) {
  const validMetrics = metrics
    .map(m => ({ name: m.label, Value: parseNum(m.value) }))
    .filter(m => Number.isFinite(m.Value) && m.Value > 0);

  if (validMetrics.length < 2) return null;

  return (
    <div className="w-full h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={validMetrics} margin={{ top: 20, right: 0, left: -20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }} angle={-25} textAnchor="end" dy={10} />
          <YAxis scale="log" domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} />
          <Tooltip content={<PremiumTooltip />} cursor={{ fill: '#F1F5F9' }} />
          <Bar dataKey="Value" radius={[4, 4, 0, 0]} barSize={32}>
            {validMetrics.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={SEG_COLORS[index % SEG_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 5. Recharts Circular Gauge ──────────────────────────────────────────────
export function CircularGauge({ value, label }: { value: number | string; label: string }) {
  const numVal = parseNum(value);
  if (!Number.isFinite(numVal) || numVal < 0) {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-[120px]">
        <div className="w-24 h-24 flex items-center justify-center border-8 border-slate-100 rounded-full">
          <span className="text-slate-400 font-bold text-sm">-</span>
        </div>
        <span className="text-xs font-semibold text-slate-500 mt-2">{label}</span>
      </div>
    );
  }

  const data = [
    { name: "Value", value: numVal, fill: "#3B82F6" },
    { name: "Remainder", value: 100 - numVal, fill: "#E2E8F0" },
  ];

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-[140px]">
      <div className="w-full h-[100px] relative -mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={35}
              outerRadius={45}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              cornerRadius={10}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-1 pointer-events-none">
          <span className="text-slate-900 text-lg font-black">{numVal}%</span>
        </div>
      </div>
      <span className="text-[11px] font-bold text-slate-400 mt-3 uppercase tracking-wider text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

// ── 6. Recharts Key Metrics Radar ───────────────────────────────────────────
export function KeyMetricsRadarChart({ metrics }: { metrics: any[] }) {
  const validMetrics = metrics
    .map(m => ({ label: m.label, numVal: parseNum(m.value) }))
    .filter(m => Number.isFinite(m.numVal) && m.numVal > 0);

  if (validMetrics.length < 3) return null;

  const maxVal = Math.max(...validMetrics.map(m => m.numVal));
  const data = validMetrics.map(m => ({
    subject: m.label,
    A: (m.numVal / maxVal) * 100,
    originalValue: m.numVal,
  }));

  return (
    <div className="w-full h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="#E2E8F0" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-slate-900 border border-slate-700/50 rounded-xl shadow-xl px-4 py-3">
                    <p className="text-slate-300 text-xs font-bold mb-1">{payload[0].payload.subject}</p>
                    <p className="text-white text-sm font-bold">Value: {payload[0].payload.originalValue}</p>
                  </div>
                );
              }
              return null;
            }} 
          />
          <Radar name="Metrics" dataKey="A" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
