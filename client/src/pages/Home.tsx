import React, { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import { Layout } from "@/components/Layout";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  LayoutDashboard,
  BarChart3,
  MapPin,
  Ticket,
  Users,
  Building2,
  Clock4,
  Clock,
  ShieldCheck,
  PauseCircle,
  MessageSquare,
  AlertTriangle,
  Globe2,
  Maximize2,
  Minimize2,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  ScatterChart,
  Scatter,
  LabelList,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip, useMap } from "react-leaflet";

function MapResizer({ isFullScreen }: { isFullScreen: boolean }) {
  const map = useMap();
  useEffect(() => {
    // Pequeno delay para esperar a transição CSS do container terminar
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 600);
    return () => clearTimeout(timer);
  }, [isFullScreen, map]);
  return null;
}

type DashboardPeriod = "diario" | "ontem" | "semanal" | "mensal" | "anual";

type MapPoint = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  count: number;
  lat?: number;
  lng?: number;
};

const MAX_MAP_POINTS = 80;

const statusMeta: Record<
  string,
  { label: string; color: string; text: string; icon: React.ElementType; accent: string }
> = {
  aguardando_atendimento: {
    label: "Aguardando Atendimento",
    color: "bg-sky-50 dark:bg-sky-900/30 border-sky-100 dark:border-sky-800",
    text: "text-sky-700 dark:text-sky-200",
    accent: "bg-sky-500",
    icon: Clock4,
  },
  em_atendimento: {
    label: "Em Atendimento",
    color: "bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-200",
    accent: "bg-blue-500",
    icon: MessageSquare,
  },
  aguardando_resposta: {
    label: "Aguardando Resposta",
    color: "bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-200",
    accent: "bg-amber-500",
    icon: PauseCircle,
  },
  em_espera: {
    label: "Em Espera",
    color: "bg-purple-50 dark:bg-purple-900/30 border-purple-100 dark:border-purple-800",
    text: "text-purple-700 dark:text-purple-200",
    accent: "bg-purple-500",
    icon: AlertTriangle,
  },
  atendimento_fechado: {
    label: "Atendimento Fechado",
    color: "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-200",
    accent: "bg-emerald-500",
    icon: ShieldCheck,
  },
  ticket_invalido: {
    label: "Atendimento Inválido",
    color: "bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-700",
    text: "text-slate-700 dark:text-slate-200",
    accent: "bg-slate-500",
    icon: BarChart3,
  },
};

const pieColors = ["#0ea5e9", "#6366f1", "#f59e0b", "#22c55e", "#f97316", "#334155"];

function formatBucket(bucket: string, period: DashboardPeriod) {
  if (period === "diario" || period === "ontem") return `${bucket}h`;
  if (period === "anual") return bucket;
  
  const date = bucket.includes("-") 
    ? new Date(bucket.length === 10 ? `${bucket}T12:00:00Z` : bucket)
    : new Date(bucket);

  if (Number.isNaN(date.getTime())) return bucket;

  if (period === "mensal") {
    // Ex: Jan/26
    const month = date.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", "");
    const year = date.toLocaleDateString("pt-BR", { year: "2-digit", timeZone: "UTC" });
    const capitalized = month.charAt(0).toUpperCase() + month.slice(1);
    return `${capitalized}/${year}`;
  }
  
  // semanal: "12/01 (Seg)"
  const day = date.toLocaleDateString("pt-BR", { day: "2-digit", timeZone: "UTC" });
  const month = date.toLocaleDateString("pt-BR", { month: "2-digit", timeZone: "UTC" });
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" }).replace(".", "");
  const weekdayCapitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  
  return `${day}/${month} (${weekdayCapitalized})`;
}

function useGeocodedPoints(points: MapPoint[]) {
  const [geoPoints, setGeoPoints] = useState<MapPoint[]>([]);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const isClient = typeof window !== "undefined";

    if (!points || points.length === 0) {
      setGeoPoints([]);
      setSkipped(false);
      return () => controller.abort();
    }

    if (points.length > MAX_MAP_POINTS) {
      setSkipped(true);
      setGeoPoints([]);
      return () => controller.abort();
    }

    setSkipped(false);

    const fetchCoords = async (point: MapPoint) => {
      if (!point.city) return point;
      const keyBase = `${point.city?.toLowerCase() || ""}-${point.state?.toLowerCase() || ""}`;
      const cacheKey = `geo:${keyBase}`;

      if (isClient) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            return { ...point, lat: parsed.lat, lng: parsed.lng };
          } catch {
            // ignore
          }
        }
      }

      try {
        const query = encodeURIComponent(`${point.city}${point.state ? `, ${point.state}` : ""}, Brasil`);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`, {
          signal: controller.signal,
          headers: { "Accept-Language": "pt-BR" },
        });
        const data = await res.json();
        if (Array.isArray(data) && data[0]) {
          const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
          if (isClient) localStorage.setItem(cacheKey, JSON.stringify(coords));
          return { ...point, ...coords };
        }
      } catch {
        // ignore geocode errors
      }
      return point;
    };

    (async () => {
      // Processa sequencialmente para não bloquear o main thread
      const results: MapPoint[] = [];
      for (const point of points) {
        if (!active) break;
        const enriched = await fetchCoords(point);
        results.push(enriched);
      }
      if (active) setGeoPoints(results);
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [points]);

  return { geoPoints, skipped };
}

const StatusCard = ({ label, value, meta }: { label: string; value: number; meta: (typeof statusMeta)[string] }) => {
  const Icon = meta.icon;
  return (
    <Card
      className={cn(
        "border-0 shadow-lg bg-gradient-to-br from-white via-white to-slate-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950 ring-1 ring-slate-100/70 dark:ring-slate-800",
        meta.color,
      )}
    >
      <CardContent className="p-4 flex items-center justify-between gap-3 h-full">
        <div className="flex flex-col justify-between min-h-[54px]">
          <p className={cn("text-[11px] font-semibold uppercase tracking-wide opacity-80 leading-tight", meta.text)}>{label}</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{value}</p>
        </div>
        <span className={cn("p-3 rounded-xl text-white shadow-md shadow-slate-900/10", meta.accent)}>
          <Icon size={20} />
        </span>
      </CardContent>
    </Card>
  );
};

const TotalCard = ({
  title,
  value,
  icon: Icon,
  accent,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  accent: string;
}) => (
  <Card className="border-0 shadow-lg bg-gradient-to-br from-white via-white to-slate-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950 ring-1 ring-slate-100/70 dark:ring-slate-800">
    <CardContent className="p-4 flex items-center gap-3">
      <div className={cn("h-11 w-11 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-900/15", accent)}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[11px] uppercase text-slate-500 dark:text-slate-400 font-semibold tracking-wide">{title}</p>
        <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{value}</p>
      </div>
    </CardContent>
  </Card>
);

export default function Home() {
  const [period, setPeriod] = useState<DashboardPeriod>("diario");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { data, isLoading, refetch } = trpc.dashboard.metrics.useQuery({ period });

  // Relógio em tempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh a cada 30 segundos no modo FullScreen
  useEffect(() => {
    let interval: any;
    if (isFullScreen) {
      interval = setInterval(() => {
        refetch();
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isFullScreen, refetch]);

  const byContract = useMemo(() => data?.byContract ?? [], [data?.byContract]);
  const byReason = useMemo(() => data?.byReason ?? [], [data?.byReason]);

  const statusCards = useMemo(() => {
    return Object.entries(statusMeta).map(([slug, meta]) => ({
      slug,
      value: (data?.statusCounts as Record<string, number>)?.[slug] ?? 0,
      meta,
    }));
  }, [data]);

  const flowData = useMemo(
    () => {
      const series = data?.flowSeries || [];
      const now = new Date();
      
      if (period === "diario" || period === "ontem") {
        // Garantir 24 pontos (00h-23h)
        const map = new Map<string, number>();
        series.forEach((item) => map.set(String(item.bucket).padStart(2, "0"), item.count));
        return Array.from({ length: 24 }, (_, h) => {
          const key = String(h).padStart(2, "0");
          return { name: `${key}h`, tickets: map.get(key) ?? 0 };
        });
      }

      if (period === "mensal") {
        const map = new Map<string, number>();
        series.forEach((item) => {
          const d = new Date(item.bucket);
          if (!Number.isNaN(d.getTime())) {
            map.set(String(d.getUTCMonth()), item.count);
          }
        });

        // Ano atual em Brasília
        const nowUTC = new Date();
        const brTime = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));
        const currentYear = brTime.getUTCFullYear();

        return Array.from({ length: 12 }, (_, m) => {
          // Criar data no meio do mês para segurança
          const date = new Date(Date.UTC(currentYear, m, 15));
          const iso = date.toISOString().split("T")[0];
          return { 
            name: formatBucket(iso, "mensal"), 
            tickets: map.get(String(m)) ?? 0 
          };
        });
      }

      if (period === "semanal") {
        const workingDays = (data as any)?.workingDays || [1, 2, 3, 4, 5];
        const map = new Map<string, number>();
        series.forEach((item) => map.set(String(item.bucket), item.count));

        // Encontrar a segunda-ferira da semana atual (Brasília Time: UTC-3)
        // Usamos math puro de UTC para evitar qualquer interferência do Date do sistema
        const now = new Date();
        const brTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
        const day = brTime.getUTCDay(); // 0-Sunday, 1-Monday...
        const diff = (day === 0 ? -6 : 1) - day;
        
        const monday = new Date(brTime);
        monday.setUTCDate(brTime.getUTCDate() + diff);
        monday.setUTCHours(12, 0, 0, 0); // Meio dia para evitar bordas de fuso

        return Array.from({ length: 7 }, (_, i) => {
          const d = new Date(monday);
          d.setUTCDate(monday.getUTCDate() + i);
          const iso = d.toISOString().split("T")[0];
          return {
            name: formatBucket(iso, "semanal"),
            date: iso,
            weekday: d.getUTCDay(),
            tickets: map.get(iso) ?? 0,
          };
        }).filter(item => workingDays.includes(item.weekday));
      }

      return series.map((item) => ({
        name: formatBucket(String(item.bucket), period),
        tickets: item.count,
      }));
    },
    [data, period],
  );

  const { flowDomain, flowTicks } = useMemo(() => {
    const maxVal = flowData.reduce((acc, item) => Math.max(acc, item.tickets || 0), 0);
    const yMax = Math.max(20, Math.ceil(maxVal / 10) * 10 || 20);
    const step = yMax <= 20 ? 1 : 10;
    const ticks = Array.from({ length: Math.floor(yMax / step) + 1 }, (_, i) => i * step);
    return { flowDomain: [0, yMax] as [number, number], flowTicks: ticks };
  }, [flowData]);

  const donutData = useMemo(() => {
    const statusCounts = (data?.statusCounts || {}) as Record<string, number>;
    const abertos =
      (statusCounts.aguardando_atendimento ?? 0) +
      (statusCounts.em_atendimento ?? 0) +
      (statusCounts.aguardando_resposta ?? 0) +
      (statusCounts.ticket_invalido ?? 0);
    const espera = statusCounts.em_espera ?? 0;
    const fechados = statusCounts.atendimento_fechado ?? 0;
    return [
      { name: "Abertos", value: abertos, color: "#0f172a" },
      { name: "Em Espera", value: espera, color: "#f59e0b" },
      { name: "Fechados", value: fechados, color: "#22c55e" },
    ];
  }, [data?.statusCounts]);

  const contractData = useMemo(
    () =>
      byContract.map((item) => ({
        name: item.contractName || "Sem contrato",
        count: item.count,
        city: item.city,
        state: item.state,
        id: item.contractId ?? -1,
      })),
    [byContract],
  );

  const reasonData = useMemo(
    () =>
      byReason.map((item) => ({
        name: item.reasonAcronym || item.reasonName || "Motivo não informado",
        count: item.count,
        color: item.reasonColor || "#f59e0b",
      })),
    [byReason],
  );

  const csat = useMemo(() => data?.metrics?.csat ?? { total: 0, ratings: {} }, [data?.metrics]);
  const matrix = data?.matrix ?? [];

  const { reasonDomain, reasonTicks } = useMemo(() => {
    const topReasons = reasonData.slice(0, 10);
    const maxVal = topReasons.reduce((acc, item) => Math.max(acc, item.count || 0), 0);
    if (maxVal <= 20) {
      const ticks = Array.from({ length: 21 }, (_, i) => i);
      return { reasonDomain: [0, 20] as [number, number], reasonTicks: ticks };
    }
    const yMax = Math.ceil(maxVal / 10) * 10 + 10;
    const ticks = Array.from({ length: Math.floor(yMax / 10) + 1 }, (_, i) => i * 10);
    return { reasonDomain: [0, yMax] as [number, number], reasonTicks: ticks };
  }, [reasonData]);

  const csatData = useMemo(() => {
    const ratings = (csat.ratings || {}) as Record<string, number>;
    const total = csat.total || 0;
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
  }, [csat]);

  const matrixData = useMemo(() => {
    const contracts = Array.from(new Set(matrix.map((m: any) => m.contractName || "N/D")));
    // PRIORIZAR SIGLAS NA MATRIZ
    const reasons = Array.from(new Set(matrix.map((m: any) => m.reasonAcronym || m.reasonName || "Motivo")));
    const points = matrix.map((m: any) => {
      const x = contracts.indexOf(m.contractName || "N/D");
      const reasonLabel = m.reasonAcronym || m.reasonName || "Motivo";
      const y = reasons.indexOf(reasonLabel);
      const count = m.count ?? 0;
      const color = count > 10 ? "#ef4444" : count > 5 ? "#f59e0b" : "#22c55e";
      // REDUZIR ESCALA PARA EVITAR SOBREPOSIÇÃO (máximo 50 em vez de 70)
      const size = Math.min(50, 12 + count * 2.5);
      return { x, y, count, color, size, contract: m.contractName || "N/D", reason: reasonLabel };
    });
    return { contracts, reasons, points };
  }, [matrix]);

  // PEÇA CHAVE: Renderiza a bolha e o texto como um único elemento SVG
  const renderMatrixPoint = (props: any): React.ReactElement => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || !payload) return <g />;
    
    // USAR COR DO PAYLOAD EXPLICITAMENTE PARA EVITAR PRETO
    const fillColor = payload.color || "#94a3b8";
    const r = (payload.size || 0) / 2;
    const showInside = r > 12;

    return (
      <g className="cursor-pointer transition-all duration-300 hover:brightness-110">
        <defs>
          <radialGradient id={`grad-${payload.x}-${payload.y}`} cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
            <stop offset="0%" stopColor={fillColor} stopOpacity={1} />
            <stop offset="100%" stopColor={fillColor} stopOpacity={0.8} />
          </radialGradient>
        </defs>
        <circle 
          cx={cx} 
          cy={cy} 
          r={r} 
          fill={`url(#grad-${payload.x}-${payload.y})`} 
          stroke="#fff" 
          strokeWidth={r > 5 ? 2 : 1} 
          fillOpacity={1}
          className="drop-shadow-md" 
        />
        <text
          x={cx}
          y={showInside ? cy + 4 : cy - (r + 10)}
          textAnchor="middle"
          fontSize={showInside ? 11 : 12}
          fontWeight={900}
          fill={showInside ? "#ffffff" : "#334155"}
          className="pointer-events-none select-none drop-shadow-sm transition-all"
        >
          {payload.count}
        </text>
      </g>
    );
  };

  const { contractDomain, contractTicks } = useMemo(() => {
    const topContracts = contractData.slice(0, 10);
    const maxVal = topContracts.reduce((acc, item) => Math.max(acc, item.count || 0), 0);
    if (maxVal <= 20) {
      const ticks = Array.from({ length: 5 }, (_, i) => i * 5);
      return { contractDomain: [0, 20] as [number, number], contractTicks: ticks };
    }
    const yMax = Math.ceil(maxVal / 10) * 10 + 10;
    const ticks = Array.from({ length: Math.floor(yMax / 10) + 1 }, (_, i) => i * 10);
    return { contractDomain: [0, yMax] as [number, number], contractTicks: ticks };
  }, [contractData]);

  const mapPoints = useMemo(() => {
    const grouped = new Map<string, MapPoint>();
    
    contractData.forEach((item) => {
      const city = item.city || "Sem Cidade";
      const state = item.state || "NA";
      const key = `${city}-${state}`.toUpperCase();
      
      const existing = grouped.get(key);
      if (existing) {
        existing.count += item.count;
      } else {
        grouped.set(key, {
          id: key,
          name: city, // Nome da cidade como nome principal
          city: city,
          state: state,
          count: item.count,
        });
      }
    });

    return Array.from(grouped.values())
      .sort((a, b) => b.count - a.count);
  }, [contractData]);

  const { geoPoints, skipped } = useGeocodedPoints(mapPoints);
  const totals = data?.totals || { tickets: 0, Clientes: 0, contracts: 0 };
  const tmaMinutes = data?.metrics?.tmaMinutes ?? null;

  const periodOptions: Array<{ id: DashboardPeriod; label: string }> = [
    { id: "diario", label: "Hoje" },
    { id: "ontem", label: "Ontem" },
    { id: "semanal", label: "Semanal" },
    { id: "mensal", label: "Mensal" },
    { id: "anual", label: "Anual" },
  ];

  const tmaColor = (() => {
    if (tmaMinutes === null || Number.isNaN(tmaMinutes)) return "#94a3b8";
    if (tmaMinutes <= 20) return "#22c55e";
    if (tmaMinutes <= 120) return "#f59e0b";
    return "#ef4444";
  })();

  const tmaLabel = (() => {
    if (tmaMinutes === null || Number.isNaN(tmaMinutes)) return "Sem dados";
    const mins = Math.round(tmaMinutes);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  })();

  const chartHeight = isFullScreen ? "h-[500px]" : "h-[320px]";
  const barHeight = isFullScreen ? "h-[420px]" : "h-[280px]";
  const mapHeight = isFullScreen ? "h-[700px]" : "h-[400px]";
  const matrixHeight = isFullScreen ? "h-[800px]" : "h-[600px]";

  return (
    <Layout hideSidebar={isFullScreen}>
      <div className={cn(
        "min-h-screen transition-colors duration-500",
        isFullScreen 
          ? "bg-slate-950 text-white" 
          : "bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-white"
      )}>
        <main className={cn(
          "w-full transition-all duration-500 mx-auto px-4 md:px-6 py-6 space-y-6",
          isFullScreen ? "max-w-full" : "max-w-6xl"
        )}>
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {isFullScreen && (
                <div className="flex items-center gap-3 bg-blue-600 px-4 py-2 rounded-2xl shadow-lg border border-blue-400/30">
                  <RefreshCw size={18} className="animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-widest">LIVE MODE (30s)</span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-300 font-semibold mb-1">
                  <LayoutDashboard size={18} />
                  Dashboard Estratégico
                </div>
                <h1 className={cn(
                  "font-black tracking-tighter leading-none transition-all",
                  isFullScreen ? "text-4xl" : "text-3xl"
                )}>
                  Dashboard Ouvidoria
                </h1>
                {!isFullScreen && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Métricas e indicadores de atendimento em tempo real.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
               {isFullScreen && (
                <div className="hidden lg:flex items-center gap-3 bg-slate-900/80 border border-slate-800 px-5 py-2.5 rounded-2xl font-mono text-xl font-black shadow-inner">
                  <Clock className="text-blue-400" size={22} />
                  {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              )}

              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1 shadow-sm">
                {periodOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setPeriod(opt.id)}
                    className={cn(
                      "px-3 py-1.5 text-xs md:text-sm rounded-full font-bold transition-all",
                      period === opt.id
                        ? "bg-blue-600 text-white shadow-md scale-105"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className={cn(
                  "p-3 rounded-2xl border transition-all shadow-md active:scale-95",
                  isFullScreen 
                    ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-700" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
                title={isFullScreen ? "Sair da Tela Cheia" : "Modo Tela Cheia"}
              >
                {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TotalCard title="Total de Atendimentos" value={totals.tickets} icon={Ticket} accent="bg-blue-600" />
            <TotalCard title="Total de Clientes" value={totals.Clientes} icon={Users} accent="bg-emerald-600" />
            <TotalCard title="Total de Contratos" value={totals.contracts} icon={Building2} accent="bg-indigo-600" />
          </div>

          <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {statusCards.map((item) => (
              <StatusCard key={item.slug} label={item.meta.label} value={item.value} meta={item.meta} />
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4">
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 size={18} className="text-blue-500" />
                  {period === "diario" ? "Fluxo de atendimento por horário" : "Fluxo de atendimento por quantidade"}
                </CardTitle>
                <CardDescription>Volume de atendimentos criados no período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={cn("transition-all duration-500", chartHeight)}>
                  {isLoading ? (
                    <Skeleton className="w-full h-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      {period === "mensal" || period === "anual" ? (
                        <BarChart data={flowData} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.9} />
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.6} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="name" 
                            tickLine={false} 
                            axisLine={false} 
                            interval={0} 
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                            tickMargin={12}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                            tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                            tickMargin={10}
                            domain={flowDomain}
                            ticks={flowTicks}
                          />
                          <ReTooltip 
                            cursor={{ fill: "rgba(37,99,235,0.05)" }} 
                            contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", padding: '12px' }}
                          />
                          <Bar 
                            name="Atendimentos"
                            dataKey="tickets" 
                            fill="url(#barGradient)" 
                            radius={[6, 6, 0, 0]} 
                            barSize={period === "anual" ? 50 : 32}
                            label={{ 
                              position: 'top', 
                              fill: '#1e40af', 
                              fontSize: 11, 
                              fontWeight: 800,
                              offset: 8,
                              formatter: (v: number) => v > 0 ? v : ""
                            }}
                          />
                        </BarChart>
                      ) : (
                        <AreaChart data={flowData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="flowGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="name" 
                            tickLine={false} 
                            axisLine={false} 
                            interval={0} 
                            tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                            tickMargin={12}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                            tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                            tickMargin={10}
                            domain={flowDomain}
                            ticks={flowTicks}
                          />
                          <ReTooltip cursor={{ fill: "rgba(37,99,235,0.05)" }} />
                          <Area name="Atendimentos" type="monotone" dataKey="tickets" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#flowGradient)" />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-500" />
                    Distribuição por status
                  </CardTitle>
                  <CardDescription>Status dentro do período selecionado</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-3">
                  <div className="h-[260px] w-full">
                    {isLoading ? (
                      <Skeleton className="w-full h-full" />
                    ) : (
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={donutData}
                            innerRadius={70}
                            outerRadius={95}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                          >
                            {donutData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            formatter={(value) => <span className="text-sm text-slate-600">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Clock4 size={18} className="text-blue-500" />
                    KPI TMA
                  </CardTitle>
                  <CardDescription>Tempo médio de atendimento</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-3">
                  <div className="relative w-full flex justify-center">
                    <div className="relative w-80 h-44">
                      <svg viewBox="0 0 280 190" className="w-full h-full">
                        <defs>
                          <linearGradient id="tmaTrack" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#e2e8f0" />
                            <stop offset="100%" stopColor="#cbd5e1" />
                          </linearGradient>
                          <linearGradient id="tmaValue" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={tmaColor} />
                            <stop offset="100%" stopColor={tmaColor} />
                          </linearGradient>
                        </defs>
                        <path
                          d="M30 170 A110 110 0 0 1 250 170"
                          fill="none"
                          stroke="url(#tmaTrack)"
                          strokeWidth="20"
                          strokeLinecap="round"
                        />
                        <path
                          d="M30 170 A110 110 0 0 1 250 170"
                          fill="none"
                          stroke="url(#tmaValue)"
                          strokeWidth="20"
                          strokeLinecap="round"
                          strokeDasharray={`${Math.min(Math.max((tmaMinutes ?? 0) / 180, 0), 1) * 345} 345`}
                        />
                        <circle cx="30" cy="170" r="9" fill={tmaColor} opacity="0.2" />
                        <circle cx="250" cy="170" r="9" fill={tmaColor} opacity="0.2" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-end pb-6">
                        <p className="text-2xl font-black leading-tight" style={{ color: tmaColor }}>
                          {tmaLabel}
                        </p>
                        <p className="text-[11px] text-slate-500">Tempo médio de atendimento</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Building2 size={18} className="text-indigo-500" />
                  Tickets por contrato
                </CardTitle>
                <CardDescription>Contratos com maior volume de tickets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={cn("transition-all duration-500", barHeight)}>
                  {isLoading ? (
                    <Skeleton className="w-full h-full" />
                  ) : (
                    <ResponsiveContainer>
                      <BarChart data={contractData.slice(0, 10)} layout="vertical" margin={{ left: 80, right: 40 }}>
                        <defs>
                          <linearGradient id="contractGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#818cf8" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis
                          type="number"
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                          domain={contractDomain}
                          ticks={contractTicks}
                        />
                        <YAxis dataKey="name" type="category" width={120} axisLine={false} tickLine={false} />
                        <ReTooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 8px 20px rgba(0,0,0,0.1)" }} />
                        <Bar dataKey="count" radius={[0, 10, 10, 0]} minPointSize={4} fill="url(#contractGradient)">
                          <LabelList dataKey="count" position="right" className="fill-slate-600 dark:fill-slate-400 font-bold text-xs" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare size={18} className="text-amber-500" />
                  Tickets por motivo de atendimento
                </CardTitle>
                <CardDescription>Principais motivos que geram tickets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={cn("transition-all duration-500", barHeight)}>
                  {isLoading ? (
                    <Skeleton className="w-full h-full" />
                  ) : (
                    <ResponsiveContainer>
                      <BarChart data={reasonData.slice(0, 10)} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tickLine={false} interval={0} angle={-20} height={70} textAnchor="end" axisLine={false} />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                          domain={reasonDomain}
                          ticks={reasonTicks}
                        />
                        <ReTooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 8px 20px rgba(0,0,0,0.1)" }} />
                        <Bar dataKey="count" radius={[10, 10, 4, 4]}>
                          {reasonData.slice(0, 10).map((entry, index) => (
                            <Cell key={entry.name} fill={entry.color || pieColors[index % pieColors.length]} />
                          ))}
                          <LabelList dataKey="count" position="top" className="fill-slate-600 dark:fill-slate-400 font-bold text-xs" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid grid-cols-1 gap-4">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <span className="text-lg">🧮</span>
                Matriz: Tipo x Contrato
              </CardTitle>
              <CardDescription>
                Bolhas indicam volume (verde &lt; 5, amarelo 5-10, vermelho &gt; 10)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={cn("w-full transition-all duration-500", matrixHeight)}>
                {matrixData.points.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-500">
                    Sem dados no período selecionado.
                  </div>
                ) : (
                  <ResponsiveContainer>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        dataKey="x"
                        tickFormatter={(v) => matrixData.contracts[v] || ""}
                        ticks={matrixData.contracts.map((_, i) => i)}
                        interval={0}
                        axisLine={false}
                        tickLine={false}
                        tickMargin={12}
                        domain={[-0.5, Math.max(matrixData.contracts.length - 0.5, 0.5)]}
                        label={{ value: 'Contratos', position: 'insideBottom', offset: -25, style: { fontSize: 13, fontWeight: 700, fill: '#64748b' } }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        tickFormatter={(v) => matrixData.reasons[v] || ""}
                        ticks={matrixData.reasons.map((_, i) => i)}
                        interval={0}
                        axisLine={false}
                        tickLine={false}
                        width={160}
                        tickMargin={12}
                        domain={[-0.5, Math.max(matrixData.reasons.length - 0.5, 0.5)]}
                      />
                      <ReTooltip
                        contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 8px 20px rgba(0,0,0,0.1)" }}
                        formatter={(value: any, _name: any, props: any) => {
                          return [
                            `${props.payload.count} tickets`,
                            `${props.payload.reason} • ${props.payload.contract}`,
                          ];
                        }}
                      />
                      <Scatter data={matrixData.points} shape={renderMatrixPoint} />
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4">
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Globe2 size={18} className="text-emerald-500" />
                    Mapa por localização dos contratos
                  </CardTitle>
                  <CardDescription>Volume de tickets por cidade/UF do contrato</CardDescription>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  Cada círculo representa a soma de tickets para o contrato na cidade.
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn("rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-all duration-500", mapHeight)}>
                  {isLoading ? (
                    <Skeleton className="w-full h-full" />
                  ) : mapPoints.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      Nenhum contrato com localização disponível.
                    </div>
                  ) : skipped ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500 px-6 text-center">
                      Muitos contratos para exibir no mapa. Refine o período ou filtros para mostrar até {MAX_MAP_POINTS} locais.
                    </div>
                  ) : (
                    <MapContainer
                      center={[-5.8, -36.6]}
                      zoom={6}
                      scrollWheelZoom={false}
                      className="h-full w-full"
                      attributionControl={false}
                    >
                      <MapResizer isFullScreen={isFullScreen} />
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      {geoPoints
                        .filter((p) => p.lat && p.lng)
                        .map((point) => (
                          <CircleMarker
                            key={point.id}
                            center={[point.lat!, point.lng!]}
                            radius={10 + Math.sqrt(point.count || 0) * 2.5}
                            pathOptions={{ 
                              color: "#059669", 
                              weight: 2, 
                              fillColor: "#10b981", 
                              fillOpacity: 0.4 
                            }}
                          >
                            <LeafletTooltip direction="center" permanent className="!bg-emerald-600 !text-white !border-none !rounded-full !px-2 !py-0.5 text-[10px] font-bold shadow-md">
                              {point.count}
                            </LeafletTooltip>
                            <LeafletTooltip direction="top" offset={[0, -10]}>
                              <div className="p-1">
                                <p className="font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1">
                                  {point.city} / {point.state}
                                </p>
                                <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  {point.count} tickets no período
                                </p>
                              </div>
                            </LeafletTooltip>
                          </CircleMarker>
                        ))}
                    </MapContainer>
                  )}
                </div>
                {mapPoints.length > MAX_MAP_POINTS && !skipped && (
                  <p className="text-xs text-slate-500 mt-2">
                    Exibindo até {MAX_MAP_POINTS} contratos com maior volume para manter a performance do mapa.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid grid-cols-1 gap-4">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <span className="text-lg">😊</span>
                CSAT (Satisfação)
              </CardTitle>
              <CardDescription>Sentimento médio no período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-3 w-full">
                {csatData.map((item) => (
                  <div
                    key={item.label}
                    className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-2 h-full"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.label}</span>
                      <span className="text-sm font-bold" style={{ color: item.color }}>
                        {item.percent}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">Votos: {item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
        </main>
      </div>
    </Layout>
  );
}




