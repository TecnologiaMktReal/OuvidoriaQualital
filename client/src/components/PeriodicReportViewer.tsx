import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Route, useLocation } from "wouter";
import { 
  FileText, 
  RefreshCw, 
  TrendingUp, 
  Users, 
  Clock, 
  MessageSquare,
  ShieldCheck,
  BrainCircuit,
  AlertCircle,
  BarChart3,
  PieChart as PieIcon,
  PauseCircle,
  AlertTriangle,
  Building2,
  Calendar
} from "lucide-react";
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
  ScatterChart,
  Scatter,
  ZAxis
} from "recharts";
import { trpc } from "@/lib/trpc";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";

type PeriodType = "diario" | "ontem" | "semanal" | "mensal" | "anual";

interface Props {
  initialPeriod?: PeriodType;
  fixedPeriodType?: PeriodType; // NOVO: Trava o período
  title: string;
  subtitle: string;
}

const statusMeta: Record<string, { label: string; color: string; text: string; icon: any; accent: string }> = {
  aguardando_atendimento: { 
    label: "Aguardando", 
    color: "bg-sky-50 dark:bg-sky-900/30 border-sky-100", 
    text: "text-sky-700",
    icon: Clock, 
    accent: "bg-sky-500" 
  },
  em_atendimento: { 
    label: "Em curso", 
    color: "bg-blue-50 dark:bg-blue-900/30 border-blue-100", 
    text: "text-blue-700",
    icon: MessageSquare, 
    accent: "bg-blue-500" 
  },
  aguardando_resposta: { 
    label: "Pendente", 
    color: "bg-amber-50 dark:bg-amber-900/30 border-amber-100", 
    text: "text-amber-700",
    icon: PauseCircle, 
    accent: "bg-amber-500" 
  },
  em_espera: { 
    label: "Em Espera", 
    color: "bg-purple-50 dark:bg-purple-900/30 border-purple-100", 
    text: "text-purple-700",
    icon: AlertTriangle, 
    accent: "bg-purple-500" 
  },
  atendimento_fechado: { 
    label: "Concluído", 
    color: "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100", 
    text: "text-emerald-700",
    icon: ShieldCheck, 
    accent: "bg-emerald-500" 
  },
  ticket_invalido: { 
    label: "Inválido", 
    color: "bg-slate-50 dark:bg-slate-800/60 border-slate-100", 
    text: "text-slate-700",
    icon: BarChart3, 
    accent: "bg-slate-500" 
  },
};

const PIE_COLORS = ["#0ea5e9", "#6366f1", "#f59e0b", "#22c55e", "#f97316", "#334155"];

export default function PeriodicReportViewer({ initialPeriod = "diario", fixedPeriodType, title, subtitle }: Props) {
  const [period, setPeriod] = useState<PeriodType>(fixedPeriodType || initialPeriod);
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  const [, setLocation] = useLocation();
  
  const { data, isLoading, isFetching, refetch } = trpc.reports.getPeriodicMetrics.useQuery({
    period,
    date: referenceDate,
    withAiAnalysis: true
  });

  const formattedPeriod = useMemo(() => {
    if (period === "diario") return format(referenceDate, "dd/MM/yyyy");
    if (period === "ontem") {
        const d = new Date(referenceDate);
        d.setDate(d.getDate() - 1);
        return format(d, "dd/MM/yyyy");
    }
    if (period === "semanal") {
        const start = startOfWeek(referenceDate, { weekStartsOn: 1 });
        const end = endOfWeek(referenceDate, { weekStartsOn: 1 });
        return `${format(start, "dd/MM")} a ${format(end, "dd/MM/yyyy")}`;
    }
    if (period === "mensal") return format(referenceDate, "MMMM 'de' yyyy", { locale: ptBR });
    return format(referenceDate, "yyyy");
  }, [period, referenceDate]);

  const flowData = useMemo(() => {
    if (!data?.flowSeries) return [];
    return data.flowSeries.map(item => {
      let label = item.bucket;
      if (period === "diario" || period === "ontem") {
        label = item.bucket + "h00";
      } else if (item.bucket.includes("-")) {
        // YYYY-MM-DD -> DD/MM/YYYY
        const parts = item.bucket.split("-");
        if (parts.length === 3) {
          label = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
      
      return {
        name: label,
        tickets: item.count
      };
    });
  }, [data, period]);

  const statusData = useMemo(() => {
    if (!data?.statusCounts) return [];
    const counts = data.statusCounts as Record<string, number>;
    const abertos = (counts.aguardando_atendimento ?? 0) + (counts.em_atendimento ?? 0) + (counts.aguardando_resposta ?? 0) + (counts.ticket_invalido ?? 0);
    const espera = counts.em_espera ?? 0;
    const fechados = counts.atendimento_fechado ?? 0;
    
    return [
      { name: "Abertos", value: abertos, color: "#0f172a" },
      { name: "Em Espera", value: espera, color: "#f59e0b" },
      { name: "Fechados", value: fechados, color: "#22c55e" },
    ];
  }, [data]);

  const csatData = useMemo(() => {
    const ratings = (data?.metrics?.csat?.ratings || {}) as Record<string, number>;
    const total = data?.metrics?.csat?.total || 0;
    const happy = ratings["3"] ?? 0;
    const neutral = ratings["2"] ?? 0;
    const sad = ratings["1"] ?? 0;
    const noAnswer = ratings["na"] ?? 0;
    const percent = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
    return [
      { label: "🤩 Satisfeito", value: happy, percent: percent(happy), color: "#22c55e" },
      { label: "🙂 Neutro", value: neutral, percent: percent(neutral), color: "#f59e0b" },
      { label: "😡 Insatisfeito", value: sad, percent: percent(sad), color: "#ef4444" },
      { label: "🤔 Sem resposta", value: noAnswer, percent: percent(noAnswer), color: "#64748b" },
    ];
  }, [data]);

  const matrixData = useMemo(() => {
    const matrix = data?.matrix || [];
    const contracts = Array.from(new Set(matrix.map((m: any) => m.contractName || "N/D")));
    const reasons = Array.from(new Set(matrix.map((m: any) => m.reasonAcronym || m.reasonName || "Motivo")));
    const points = matrix.map((m: any) => {
      const x = contracts.indexOf(m.contractName || "N/D");
      const reasonLabel = m.reasonAcronym || m.reasonName || "Motivo";
      const y = reasons.indexOf(reasonLabel);
      const count = m.count ?? 0;
      const color = count > 10 ? "#ef4444" : count > 5 ? "#f59e0b" : "#22c55e";
      const size = Math.min(50, 12 + count * 2.5);
      return { x, y, count, color, size, contract: m.contractName || "N/D", reason: reasonLabel };
    });
    return { contracts, reasons, points };
  }, [data]);

  const tmaLabel = useMemo(() => {
    const mins = data?.metrics?.tmaMinutes;
    if (!mins) return "--";
    const nMins = Number(mins);
    if (nMins < 60) return `${Math.round(nMins)}m`;
    const h = Math.floor(nMins / 60);
    const m = Math.round(nMins % 60);
    return `${h}h ${m}m`;
  }, [data]);


  const renderMatrixPoint = (props: any): React.ReactElement => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || !payload) return <g />;
    const fillColor = payload.color || "#94a3b8";
    const r = (payload.size || 0) / 2;
    const showInside = r > 12;

    return (
      <g className="cursor-pointer transition-all duration-300 hover:brightness-110">
        <circle cx={cx} cy={cy} r={r} fill={fillColor} stroke="#fff" strokeWidth={r > 5 ? 2 : 1} fillOpacity={0.8} />
        <text x={cx} y={showInside ? cy + 4 : cy - (r + 10)} textAnchor="middle" fontSize={showInside ? 10 : 11} fontWeight={900} fill={showInside ? "#ffffff" : "#334155"}>
          {payload.count}
        </text>
      </g>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 pb-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white/50 backdrop-blur-md p-6 rounded-3xl border border-slate-200/60 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-blue-600/70">
            <TrendingUp className="w-4 h-4" />
            Relatório de Gestão (HDC v2)
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500 font-medium">{subtitle} • <span className="text-blue-600 font-bold">{formattedPeriod}</span></p>
        </div>

        <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("rounded-2xl border-slate-200/60 font-bold text-xs gap-2 min-w-[180px] justify-start", !referenceDate && "text-muted-foreground")}>
                  <Calendar className="w-4 h-4 text-blue-600" />
                  {formattedPeriod}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-3xl overflow-hidden border-slate-200/60 shadow-2xl" align="end">
                <CalendarComponent
                  mode="single"
                  selected={referenceDate}
                  onSelect={(date) => date && setReferenceDate(date)}
                  disabled={(date) => date > new Date() || date < new Date("2024-01-01")}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>

          {!fixedPeriodType && (
            <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodType)} className="w-auto">
                <TabsList className="bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50">
                <TabsTrigger value="diario" className="rounded-xl text-xs font-bold px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Dia</TabsTrigger>
                <TabsTrigger value="semanal" className="rounded-xl text-xs font-bold px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Semana</TabsTrigger>
                <TabsTrigger value="mensal" className="rounded-xl text-xs font-bold px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Mês</TabsTrigger>
                <TabsTrigger value="anual" className="rounded-xl text-xs font-bold px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Ano</TabsTrigger>
                </TabsList>
            </Tabs>
          )}

          <Button variant="outline" size="icon" onClick={() => refetch()} className="rounded-2xl border-slate-200/60 hover:bg-white shadow-sm">
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
          </Button>

          <Button 
            onClick={() => setLocation(`/relatorios/pdf-grade-10?period=${period}&date=${referenceDate.toISOString()}`)}
            className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 gap-2 px-6"
          >
            <PieIcon className="w-4 h-4" />
            <span className="font-bold">Gerar Relatório</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiBar title="Total de Tickets" value={data?.totals?.tickets ?? data?.totalTickets ?? 0} icon={FileText} accent="bg-blue-600" />
        <KpiBar title="Clientes Ativos" value={data?.totals?.clientes ?? 0} icon={Users} accent="bg-emerald-600" />
        <KpiBar title="Polos/Contratos" value={data?.totals?.contracts ?? 0} icon={Building2} accent="bg-indigo-600" />
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(statusMeta).map(([slug, meta]) => (
            <StatusCard key={slug} label={meta.label} value={(data?.statusCounts as Record<string, number>)?.[slug] ?? 0} meta={meta} />
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200/60 shadow-xl shadow-slate-200/30 rounded-3xl overflow-hidden bg-white/80">
          <CardHeader className="border-b border-slate-100/50 bg-slate-50/30">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Fluxo de Atendimento
            </CardTitle>
            <CardDescription>Volume de tickets no período selecionado</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[350px] w-full">
              {isLoading ? (
                <Skeleton className="w-full h-full rounded-2xl" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {period === "diario" || period === "ontem" ? (
                    <AreaChart data={flowData}>
                      <defs>
                        <linearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} interval={period === "diario" || period === "ontem" ? 0 : "preserveStartEnd"} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                      <Area type="monotone" dataKey="tickets" stroke="#2563eb" strokeWidth={3} fill="url(#flowGrad)" />
                    </AreaChart>
                  ) : (
                    <BarChart data={flowData}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} interval={0} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="tickets" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={30} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 shadow-xl shadow-slate-200/30 rounded-3xl overflow-hidden bg-white/80">
          <CardHeader className="border-b border-slate-100/50 bg-slate-50/30">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-emerald-600" />
              Status dos Tickets
            </CardTitle>
            <CardDescription>Distribuição setorial</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
             <div className="h-[240px] w-full">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={statusData} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                      {statusData.map((item: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
             </div>
             <div className="mt-4 space-y-2">
                {statusData.map((item: any) => (
                    <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-xs font-bold text-slate-600">{item.name}</span>
                        </div>
                        <span className="text-xs font-black text-slate-900">{item.value}</span>
                    </div>
                ))}
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-slate-200/60 shadow-xl shadow-slate-200/30 rounded-3xl overflow-hidden bg-white/80">
            <CardHeader className="border-b border-slate-100/50 bg-slate-50/30">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                Satisfação (CSAT)
                </CardTitle>
                <CardDescription>Qualidade do atendimento no período</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total de Avaliações</p>
                        <p className="text-2xl font-black text-slate-900">{data?.metrics?.csat?.total ?? 0}</p>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                        <p className="text-[10px] font-black uppercase text-emerald-600 mb-1">Satisfeitos</p>
                        <p className="text-2xl font-black text-emerald-700">{Math.round(((csatData[0].value || 0) / (data?.metrics?.csat?.total || 1)) * 100)}%</p>
                    </div>
                </div>
                <div className="space-y-4">
                    {csatData.map(item => (
                        <div key={item.label} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-600">{item.label}</span>
                                <span className="text-slate-900">{item.value} ({item.percent}%)</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full transition-all duration-500" style={{ width: `${item.percent}%`, backgroundColor: item.color }} />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 shadow-xl shadow-slate-200/30 rounded-3xl overflow-hidden bg-white/80">
            <CardHeader className="border-b border-slate-100/50 bg-slate-50/30">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" />
                Tempo Médio (TMA)
                </CardTitle>
                <CardDescription>Performance temporal</CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex flex-col items-center justify-center min-h-[300px]">
                <div className="relative h-48 w-48 flex items-center justify-center">
                    <svg className="absolute inset-0 h-full w-full -rotate-90">
                        <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                        <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={502} strokeDashoffset={502 * (1 - Math.min(1, (data?.metrics?.tmaMinutes || 0) / 120))} className="text-indigo-500 transition-all duration-1000" strokeLinecap="round" />
                    </svg>
                    <div className="text-center z-10">
                        <p className="text-4xl font-black text-slate-900">{tmaLabel}</p>
                        <p className="text-[10px] font-black uppercase text-slate-400 mt-1">Média por Ticket</p>
                    </div>
                </div>
            </CardContent>
          </Card>
      </div>

      <Card className="border-slate-200/60 shadow-xl shadow-slate-200/30 rounded-3xl overflow-hidden bg-white/80">
        <CardHeader className="border-b border-slate-100/50 bg-slate-50/30">
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Matriz Tipo x Contrato
          </CardTitle>
          <CardDescription>Correlação entre motivos de atendimento e polos</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
            <div className="h-[600px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 80, left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" dataKey="x" name="Polo" ticks={matrixData.contracts.map((_, i) => i)} tickFormatter={(i) => matrixData.contracts[i]} tick={{ fontSize: 10, fontWeight: 700 }} />
                        <YAxis type="number" dataKey="y" name="Motivo" ticks={matrixData.reasons.map((_, i) => i)} tickFormatter={(i) => matrixData.reasons[i]} tick={{ fontSize: 10, fontWeight: 700 }} />
                        <ZAxis type="number" dataKey="size" range={[100, 1000]} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }: any) => {
                            if (active && payload && payload.length) {
                                const p = payload[0].payload;
                                return (
                                    <div className="bg-white p-3 rounded-xl shadow-xl border border-slate-100">
                                        <p className="text-xs font-black text-blue-600 mb-1">{p.contract}</p>
                                        <p className="text-[10px] font-bold text-slate-500 mb-2">{p.reason}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-black text-slate-900">{p.count} tickets</span>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        }} />
                        <Scatter name="Matriz" data={matrixData.points} shape={renderMatrixPoint} />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </CardContent>
      </Card>

      <Card className="border-blue-100 bg-gradient-to-br from-white via-white to-blue-50/30 shadow-xl shadow-blue-500/5 rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-blue-50/50">
          <CardTitle className="text-xl font-black flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
              <BrainCircuit className="w-5 h-5" />
            </div>
            Inteligência Analítica (HDC v2)
          </CardTitle>
          <CardDescription>Análise crítica gerada por inteligência artificial baseada nos resultados atuais.</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <AiSection title="Análise de Volume" text={data?.aiAnalysis?.volume} icon={BarChart3} />
                <AiSection title="Performance & Eficiência" text={data?.aiAnalysis?.performance} icon={Clock} />
              </div>
              <div className="space-y-6">
                <AiSection title="Tendências & Recorrências" text={data?.aiAnalysis?.trends} icon={TrendingUp} />
                <AiSection title="Plano de Ação Sugerido" text={data?.aiAnalysis?.actionPlan} icon={ShieldCheck} isImportant />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiBar({ title, value, icon: Icon, accent }: any) {
    return (
      <Card className="border-0 shadow-lg bg-white ring-1 ring-slate-200/50 rounded-3xl overflow-hidden hover:ring-blue-500/20 transition-all">
        <CardContent className="p-5 flex items-center gap-4">
          <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg", accent)}>
            <Icon size={24} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase text-slate-500 tracking-widest">{title}</p>
            <p className="text-2xl font-black text-slate-900 leading-tight">{value}</p>
          </div>
        </CardContent>
      </Card>
    );
}

function StatusCard({ label, value, meta }: any) {
    const Icon = meta.icon;
    return (
      <Card className={cn("border-0 shadow-md rounded-2xl ring-1 ring-slate-200/50", meta.color)}>
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="flex flex-col justify-between">
            <p className={cn("text-[10px] font-black uppercase tracking-wide opacity-80", meta.text)}>{label}</p>
            <p className="text-xl font-black text-slate-900 leading-none">{value}</p>
          </div>
          <span className={cn("p-2 rounded-xl text-white shadow-sm", meta.accent)}>
            <Icon size={16} />
          </span>
        </CardContent>
      </Card>
    );
}

function AiSection({ title, text, icon: Icon, isImportant }: any) {
  if (!text) return null;
  return (
    <div className={cn(
        "p-5 rounded-2xl border transition-all",
        isImportant ? "bg-blue-600/5 border-blue-200" : "bg-white border-slate-100 hover:border-blue-100 shadow-sm"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("w-4 h-4", isImportant ? "text-blue-600" : "text-slate-400")} />
        <h4 className={cn("text-xs font-black uppercase tracking-wider", isImportant ? "text-blue-700" : "text-slate-600")}>{title}</h4>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed font-medium">
        {text}
      </p>
    </div>
  );
}



