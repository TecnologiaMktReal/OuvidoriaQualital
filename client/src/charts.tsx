// client/src/charts.tsx
import React from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, LabelList,
  BarChart, Bar, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { ChartDataItem, TimelineDataItem, ContractTimeDataItem, ScatterDataItem } from './types';
import { CHART_COLORS, STRONG_COLORS, COLORS } from './constants';

// StatusPieChart - Pagina 1: Visao Geral & KPIs
export const StatusPieChart: React.FC<{ data: ChartDataItem[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        innerRadius={50}
        outerRadius={80}
        paddingAngle={4}
        dataKey="value"
        isAnimationActive={false}
        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
        labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
      >
        {data.map((_, index) => (
          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend verticalAlign="bottom" height={30} iconType="circle" />
    </PieChart>
  </ResponsiveContainer>
);

// TimelineChart - Pagina 2: Evolucao Temporal
export const TimelineChart: React.FC<{ data: TimelineDataItem[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
      <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
      <Tooltip />
      <Line type="monotone" dataKey="Total" stroke={COLORS.COOP_BLUE} strokeWidth={3} dot={{ r: 4, fill: '#fff', stroke: COLORS.COOP_BLUE }} isAnimationActive={false}>
        <LabelList dataKey="Total" position="top" style={{ fontSize: 9, fontWeight: 700, fill: COLORS.COOP_BLUE }} />
      </Line>
    </LineChart>
  </ResponsiveContainer>
);

// FlowBarChart - Pagina 2: Fluxo de Atendimento (Semanal/Mensal/Anual)
export const FlowBarChart: React.FC<{ data: TimelineDataItem[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
      <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
      <Tooltip />
      <Bar dataKey="Total" fill={COLORS.COOP_BLUE} radius={[6, 6, 0, 0]} isAnimationActive={false}>
        <LabelList dataKey="Total" position="top" style={{ fontSize: 9, fontWeight: 700, fill: COLORS.COOP_BLUE }} />
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

// ContractStackedBarChart - Pagina 3: Detalhamento por Contrato
export const ContractStackedBarChart: React.FC<{ data: ContractTimeDataItem[]; contractList: string[] }> = ({ data, contractList }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
      <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
      <Tooltip />
      <Legend />
      {contractList.map((contract, index) => (
        <Bar key={contract} dataKey={contract} stackId="a" fill={STRONG_COLORS[index % STRONG_COLORS.length]} isAnimationActive={false}>
          <LabelList dataKey={contract} position="center" style={{ fontSize: 8, fontWeight: 700, fill: '#fff' }} />
        </Bar>
      ))}
    </BarChart>
  </ResponsiveContainer>
);

// AHTBarChart - Pagina 5: Eficiencia & Rankings
export const AHTBarChart: React.FC<{ data: ChartDataItem[]; formatDuration: (val: number) => string }> = ({ data, formatDuration }) => {
  const displayData = data.slice(0, 6);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={displayData} layout="vertical" margin={{ left: 100, right: 60 }}>
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#1e293b' }} width={95} />
        <Tooltip formatter={(value: number) => formatDuration(value)} />
        <Bar dataKey="value" fill={COLORS.COOP_BLUE} radius={[0, 4, 4, 0]} isAnimationActive={false}>
          <LabelList dataKey="value" position="right" formatter={(v: number) => formatDuration(v)} style={{ fontSize: 9, fontWeight: 700, fill: '#1e293b' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// RankingBarChart - Pagina 5: Eficiencia & Rankings
export const RankingBarChart: React.FC<{ data: ChartDataItem[]; maxItems?: number }> = ({ data, maxItems = 8 }) => {
  const displayData = data.slice(0, maxItems);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={displayData} layout="vertical" margin={{ left: 100, right: 40 }}>
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#1e293b' }} width={95} />
        <Tooltip />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {displayData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.name.includes("SEM RESPOSTA") ? '#94a3b8' : COLORS.COOP_INDIGO} />
          ))}
          <LabelList dataKey="value" position="right" style={{ fontSize: 9, fontWeight: 700, fill: '#1e293b' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// CorrelationMatrixChart - Pagina 6: Matriz de Correlacao
export const CorrelationMatrixChart: React.FC<{ data: ScatterDataItem[]; contractCats: string[]; typeCats: string[] }> = ({ data, contractCats, typeCats }) => (
  <ResponsiveContainer width="100%" height="100%">
    <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 100 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
      <XAxis 
        type="number" dataKey="xIndex" ticks={contractCats.map((_, i) => i)} 
        tickFormatter={(i) => contractCats[i] || ''} tick={{ fontSize: 8, fill: '#64748b' }} 
        interval={0} angle={-45} textAnchor="end"
      />
      <YAxis 
        type="number" dataKey="yIndex" ticks={typeCats.map((_, i) => i)} 
        tickFormatter={(i) => typeCats[i] || ''} tick={{ fontSize: 8, fill: '#64748b' }} 
        interval={0}
      />
      <ZAxis type="number" dataKey="z" range={[100, 800]} />
      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
      <Scatter data={data} isAnimationActive={false}>
        {data.map((entry, index) => (
          <Cell 
            key={`cell-${index}`} 
            fill={entry.rawZ > 10 ? COLORS.COOP_RED : entry.rawZ > 5 ? COLORS.COOP_AMBER : COLORS.COOP_EMERALD} 
            fillOpacity={0.8}
            stroke="#fff"
            strokeWidth={1}
          />
        ))}
        <LabelList dataKey="rawZ" position="center" style={{ fontSize: 9, fontWeight: 800, fill: '#fff' }} />
      </Scatter>
    </ScatterChart>
  </ResponsiveContainer>
);

// CSATChart - Pagina 7: CSAT - Satisfacao do Cliente
export const CSATChart: React.FC<{ data: ChartDataItem[] }> = ({ data }) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  const getEmoji = (name: string) => {
    if (name.includes("Excelente") || name.includes("Satisfeito")) return "🤩";
    if (name.includes("Bom") || name.includes("Neutro")) return "🙂";
    if (name.includes("Ruim") || name.includes("Insatisfeito")) return "😡";
    return "🤔";
  };
  const getColor = (name: string) => {
    if (name.includes("Excelente") || name.includes("Satisfeito")) return "bg-emerald-500";
    if (name.includes("Bom") || name.includes("Neutro")) return "bg-amber-500";
    if (name.includes("Ruim") || name.includes("Insatisfeito")) return "bg-red-500";
    return "bg-slate-400";
  };

  return (
    <div className="space-y-4 pt-2">
      {data.map((item, index) => {
        const percent = total > 0 ? (item.value / total) * 100 : 0;
        return (
          <div key={index} className="flex items-center gap-3">
            <span className="text-2xl">{getEmoji(item.name)}</span>
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-700 uppercase">
                <span>{item.name}</span>
                <span>{item.value} ({percent.toFixed(0)}%)</span>
              </div>
              <div className="h-3 w-full rounded-full overflow-hidden bg-slate-100">
                <div className={`h-full ${getColor(item.name)}`} style={{ width: `${percent}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};



