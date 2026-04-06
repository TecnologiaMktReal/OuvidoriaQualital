// client/src/components.tsx
import React from 'react';
import { cn } from "@/lib/utils";

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm p-5", className)}>
    {children}
  </div>
);

export const Title: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <h3 className={cn("text-sm font-bold text-slate-800 uppercase tracking-wide mb-3", className)}>
    {children}
  </h3>
);

export const Text: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <p className={cn("text-xs text-slate-600", className)}>
    {children}
  </p>
);

export const Metric: React.FC<{ children: React.ReactNode; className?: string; color?: string }> = ({ children, className, color = "blue" }) => {
  const colorClass = {
    blue: "text-blue-600",
    green: "text-emerald-600",
    purple: "text-purple-600",
    amber: "text-amber-600",
    red: "text-red-600",
    indigo: "text-indigo-600",
    gray: "text-slate-600",
  }[color] || "text-blue-600";
  
  return (
    <span className={cn("text-3xl font-black", colorClass, className)}>
      {children}
    </span>
  );
};

export const Grid: React.FC<{ children: React.ReactNode; numItems?: 1 | 2 | 3 | 4; className?: string }> = ({ children, numItems = 3, className }) => {
  const cols = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  };
  return (
    <div className={cn("grid gap-4", cols[numItems], className)}>
      {children}
    </div>
  );
};

export const AnalysisBox: React.FC<{ title: string; content: string; variant?: 'green' | 'yellow' | 'blue' | 'gray' }> = ({ title, content, variant = 'blue' }) => {
  const variants = {
    green: "bg-emerald-50 border-emerald-500 text-emerald-900",
    yellow: "bg-amber-50 border-amber-500 text-amber-900",
    blue: "bg-blue-50 border-blue-500 text-blue-900",
    gray: "bg-slate-50 border-slate-400 text-slate-800",
  };
  
  return (
    <div className={cn("p-4 rounded-lg border-l-4", variants[variant])}>
      <h4 className="text-xs font-bold uppercase tracking-wider mb-2 opacity-80">{title}</h4>
      <p className="text-xs leading-relaxed">{content}</p>
    </div>
  );
};



