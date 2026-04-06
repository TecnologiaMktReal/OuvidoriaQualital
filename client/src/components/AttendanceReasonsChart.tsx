import React from 'react';
import { useTheme } from "@/components/theme-provider";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { BarChart3 } from 'lucide-react';

interface AttendanceStats {
  reasonName: string;
  count: number;
}

interface AttendanceReasonsChartProps {
  data: AttendanceStats[];
  isLoading?: boolean;
}

export function AttendanceReasonsChart({ data, isLoading }: AttendanceReasonsChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col min-h-[180px]">
        <div className="px-5 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
          <h3 className="font-semibold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <BarChart3 size={14} className="text-indigo-500" /> Gráfico motivo de Atendimento
          </h3>
        </div>
        <div className="p-8 flex flex-col items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[180px]">
        <div className="px-5 py-2 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-semibold text-[11px] uppercase tracking-wider text-slate-600 flex items-center gap-2">
            <BarChart3 size={14} className="text-indigo-500" /> Gráfico motivo de Atendimento
          </h3>
        </div>
        <div className="p-6 flex flex-col items-center justify-center flex-1 text-center">
          <BarChart3 className="text-slate-200 mb-1" size={32} />
          <p className="text-xs font-semibold text-slate-400">Sem histórico</p>
        </div>
      </div>
    );
  }

  // Cores variadas e modernas para as barras
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col min-h-[180px]">
      <div className="px-5 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
        <h3 className="font-semibold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
          <BarChart3 size={14} className="text-indigo-500" /> Gráfico motivo de Atendimento
        </h3>
      </div>
      <div className="p-3 flex-1">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? "#334155" : "#f1f5f9"} />
            <XAxis type="number" hide />
            <YAxis 
              dataKey="reasonName" 
              type="category" 
              width={90} 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fontWeight: 700, fill: isDark ? '#e2e8f0' : '#64748b' }}
            />
            <Tooltip 
              cursor={{ fill: isDark ? '#1e293b' : '#f8fafc' }}
              contentStyle={{ 
                backgroundColor: isDark ? '#1e293b' : '#fff',
                borderRadius: '8px', 
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                fontSize: '11px',
                fontWeight: '700',
                color: isDark ? '#f8fafc' : '#0f172a'
              }}
              labelStyle={{ color: '#4f46e5', marginBottom: '2px' }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}



