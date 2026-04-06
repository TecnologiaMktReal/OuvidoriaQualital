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
import { Heart } from 'lucide-react';

interface CsatStats {
  rating: number | null;
  status?: string | null;
  count: number;
}

interface CSATStatsChartProps {
  data: CsatStats[];
  isLoading?: boolean;
}

const CustomYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-10}
        y={0}
        dy={4}
        textAnchor="end"
        fill={props.fill}
        fontSize={16}
        fontWeight={700}
        style={{ fontFamily: 'inherit' }}
      >
        {payload.value}
      </text>
    </g>
  );
};

export function CSATStatsChart({ data, isLoading }: CSATStatsChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col min-h-[180px]">
        <div className="px-5 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
          <h3 className="font-semibold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <Heart size={14} className="text-rose-500 fill-rose-500" /> Gráfico CSAT
          </h3>
        </div>
        <div className="p-8 flex flex-col items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rose-500"></div>
        </div>
      </div>
    );
  }

  // Mapear dados para emoticons
  const ratingLabels: Record<number, string> = {
    3: '🤩',
    2: '🙂',
    1: '😡',
    0: '⏳'
  };

  const formattedData = [3, 2, 1, 0].map(rating => {
    let found;
    if (rating === 0) {
       // Para 0 (Sem Resposta), somamos expired + items com status 'pending' que já passaram do prazo (se houver essa lógica no front, mas aqui pegamos do banco)
       // O banco retorna status='expired' para não respondidos. 
       // O backend retorna rating=null para expired? ou rating=null e status='expired'.
       // Vamos assumir que o backend agrupa por rating e status.
       found = data.find(d => d.status === 'expired' || (d.rating === null && d.status === 'expired'));
    } else {
       found = data.find(d => d.rating === rating && d.status === 'answered');
    }

    return {
      name: ratingLabels[rating],
      count: found ? found.count : 0,
      rating
    };
  });

  const hasData = data && data.length > 0;

  if (!hasData) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col min-h-[180px]">
        <div className="px-5 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
          <h3 className="font-semibold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <Heart size={14} className="text-rose-500" /> Gráfico CSAT
          </h3>
        </div>
        <div className="p-6 flex flex-col items-center justify-center flex-1 text-center">
          <Heart className="text-slate-200 mb-1" size={32} />
          <p className="text-xs font-semibold text-slate-400">Sem avaliações</p>
        </div>
      </div>
    );
  }

  const colors: Record<number, string> = {
    3: '#10b981', // Emerald (Excelente)
    2: '#f59e0b', // Amber (Bom)
    1: '#ef4444',  // Rose/Red (Ruim)
    0: '#94a3b8'   // Slate (Sem Resposta)
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col min-h-[200px]">
      <div className="px-5 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
        <h3 className="font-semibold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
          <Heart size={14} className="text-rose-500 fill-rose-500" /> Gráfico CSAT
        </h3>
      </div>
      <div className="p-3 flex-1">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart
            data={formattedData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? "#334155" : "#f1f5f9"} />
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={40} 
              axisLine={false}
              tickLine={false}
              tick={<CustomYAxisTick fill={isDark ? '#e2e8f0' : '#64748b'} />}
            />
            <Tooltip 
              cursor={{ fill: isDark ? '#1e293b' : '#f8fafc' }}
              contentStyle={{ 
                backgroundColor: isDark ? '#1e293b' : '#fff',
                borderRadius: '8px', 
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                fontSize: '10px',
                fontWeight: '700',
                color: isDark ? '#f8fafc' : '#0f172a'
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={12}>
              {formattedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[entry.rating] || '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}



