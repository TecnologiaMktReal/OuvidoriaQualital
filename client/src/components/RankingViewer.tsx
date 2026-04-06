import React, { useState, useMemo } from 'react';
import { trpc } from "@/lib/trpc";
import { format, subDays, startOfWeek, startOfMonth, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trophy, Medal, Crown, Filter, User, Users, FileText, BarChart3, Calendar, Search, Loader2, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type RankingType = "Cliente" | "coordenador" | "contrato" | "tipo";

interface RankingViewerProps {
  type: RankingType;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

type PeriodType = "today" | "yesterday" | "week" | "month" | "custom";

export function RankingViewer({ type, title, subtitle, icon: Icon, color }: RankingViewerProps) {
  const [period, setPeriod] = useState<PeriodType>("month");
  const [limit, setLimit] = useState(10);
  const [customRange, setCustomRange] = useState<{ from?: string; to?: string }>({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });

  const dateRange = useMemo(() => {
    const now = new Date();
    let start = startOfDay(now);
    let end = endOfDay(now);

    switch (period) {
      case "today":
        break;
      case "yesterday":
        start = startOfDay(subDays(now, 1));
        end = endOfDay(subDays(now, 1));
        break;
      case "week":
        start = startOfDay(subDays(now, 7));
        break;
      case "month":
        start = startOfMonth(now);
        break;
      case "custom":
        start = customRange.from ? startOfDay(new Date(customRange.from)) : startOfDay(subDays(now, 30));
        end = customRange.to ? endOfDay(new Date(customRange.to)) : endOfDay(now);
        break;
    }

    return { start, end };
  }, [period, customRange]);

  const { data: rankingData, isLoading } = trpc.reports.getRanking.useQuery({
    type,
    startDate: dateRange.start,
    endDate: dateRange.end,
    limit,
  });

  const top3 = rankingData?.slice(0, 3) || [];
  const rest = rankingData?.slice(3) || [];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn("p-4 rounded-3xl shadow-xl border-b-4", color)}
          >
            <Icon className="h-10 w-10 text-white" />
          </motion.div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight dark:text-white">{title}</h1>
            <p className="text-slate-500 font-medium text-lg">{subtitle}</p>
          </div>
        </div>
        </div>

      {/* Filters Card */}
      <Card className="bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
            <div className="md:col-span-5 space-y-3">
              <label className="uppercase text-[11px] font-black text-slate-400 tracking-widest pl-1">
                Período de Análise
              </label>
              <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodType)} className="w-full">
                <TabsList className="w-full grid grid-cols-5 h-12 p-1.5 bg-slate-100/80 rounded-2xl">
                  <TabsTrigger value="today" className="rounded-xl text-xs font-bold">Hoje</TabsTrigger>
                  <TabsTrigger value="yesterday" className="rounded-xl text-xs font-bold">Ontem</TabsTrigger>
                  <TabsTrigger value="week" className="rounded-xl text-xs font-bold">7 Dias</TabsTrigger>
                  <TabsTrigger value="month" className="rounded-xl text-xs font-bold">Mês</TabsTrigger>
                  <TabsTrigger value="custom" className="rounded-xl text-xs font-bold">Personalizado</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {period === "custom" && (
              <div className="md:col-span-4 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Início</span>
                  <Input 
                    type="date" 
                    value={customRange.from} 
                    onChange={(e) => setCustomRange(prev => ({ ...prev, from: e.target.value }))}
                    className="h-12 rounded-2xl border-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium" 
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Fim</span>
                  <Input 
                    type="date" 
                    value={customRange.to} 
                    onChange={(e) => setCustomRange(prev => ({ ...prev, to: e.target.value }))}
                    className="h-12 rounded-2xl border-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium" 
                  />
                </div>
              </div>
            )}
            
            <div className={cn("space-y-3", period === "custom" ? "md:col-span-3" : "md:col-span-3")}>
              <label className="uppercase text-[11px] font-black text-slate-400 tracking-widest pl-1">
                Posições no Ranking
              </label>
              <div className="flex items-center gap-3 bg-slate-100/80 p-1 rounded-2xl h-12">
                {[5, 10, 20, 50].map(n => (
                  <button
                    key={n}
                    onClick={() => setLimit(n)}
                    className={cn(
                      "flex-1 h-full rounded-xl text-xs font-bold transition-all",
                      limit === n ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Top {n}
                  </button>
                ))}
              </div>
            </div>

            <div className={cn("flex items-end", period === "custom" ? "md:col-span-12 lg:col-span-12" : "md:col-span-4")}>
                {/* Search or extra filter could go here */}
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="py-32 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
          <p className="text-slate-400 font-bold uppercase tracking-widest animate-pulse">Processando Dados...</p>
        </div>
      ) : rankingData && rankingData.length > 0 ? (
        <div className="space-y-12">
          {/* Podium Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end max-w-5xl mx-auto pt-24">
            {/* 2nd Place */}
            {top3[1] && (
              <motion.div 
                initial={{ y: 50, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="order-2 md:order-1"
              >
                <div className="relative group flex flex-col items-center">
                  <div className="absolute -top-12 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 border-4 border-slate-300 shadow-2xl flex items-center justify-center relative overflow-hidden group-hover:scale-110 transition-transform">
                      <Medal className="h-10 w-10 text-slate-400" />
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 w-full pt-12 pb-8 px-6 rounded-t-[3rem] shadow-2xl border-x border-t border-slate-100 dark:border-slate-700 text-center space-y-2 mt-4 min-h-[160px] flex flex-col justify-center">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white capitalize truncate px-2">{top3[1].name}</h3>
                    <div className="flex flex-col items-center">
                        <span className="text-3xl font-black text-slate-400">{top3[1].count}</span>
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Tickets</span>
                    </div>
                  </div>
                  <div className="h-24 w-full bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-b-3xl flex items-center justify-center shadow-inner">
                    <span className="text-4xl font-black text-slate-400/50">2º</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 1st Place */}
            {top3[0] && (
              <motion.div 
                initial={{ y: 50, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="order-1 md:order-2 z-10"
              >
                <div className="relative group flex flex-col items-center">
                  <div className="absolute -top-20 flex flex-col items-center">
                    <Crown className="h-10 w-10 text-yellow-500 drop-shadow-lg mb-2 animate-bounce" />
                    <div className="w-28 h-28 rounded-[2.5rem] bg-yellow-50 dark:bg-yellow-900/20 border-4 border-yellow-400 shadow-2xl shadow-yellow-200/50 flex items-center justify-center relative overflow-hidden group-hover:scale-110 transition-transform">
                      <Trophy className="h-14 w-14 text-yellow-500" />
                      <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400/20 to-transparent pointer-events-none" />
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 w-full pt-16 pb-10 px-6 rounded-t-[3.5rem] shadow-[0_30px_60px_-15px_rgba(234,179,8,0.2)] border-x border-t border-yellow-100 dark:border-yellow-900/50 text-center space-y-3 mt-4 min-h-[200px] flex flex-col justify-center">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white capitalize truncate px-2">{top3[0].name}</h3>
                    <div className="flex flex-col items-center">
                        <span className="text-5xl font-black text-yellow-500 drop-shadow-sm">{top3[0].count}</span>
                        <span className="text-[11px] uppercase font-black text-yellow-600 tracking-widest">Tickets Realizados</span>
                    </div>
                  </div>
                  <div className="h-40 w-full bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-b-3xl flex items-center justify-center shadow-lg transform -translate-y-1">
                    <span className="text-7xl font-black text-white/40 italic">1º</span>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-1.5 bg-white/20 rounded-full" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <motion.div 
                initial={{ y: 50, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="order-3"
              >
                <div className="relative group flex flex-col items-center">
                  <div className="absolute -top-10 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-900/20 border-4 border-orange-300 shadow-2xl flex items-center justify-center relative overflow-hidden group-hover:scale-110 transition-transform">
                      <Medal className="h-8 w-8 text-orange-400" />
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 w-full pt-10 pb-6 px-6 rounded-t-[2.5rem] shadow-2xl border-x border-t border-slate-100 dark:border-slate-700 text-center space-y-2 mt-4 min-h-[140px] flex flex-col justify-center">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white capitalize truncate px-2">{top3[2].name}</h3>
                    <div className="flex flex-col items-center">
                        <span className="text-2xl font-black text-orange-400">{top3[2].count}</span>
                        <span className="text-[9px] uppercase font-black text-orange-400 tracking-wider">Tickets</span>
                    </div>
                  </div>
                  <div className="h-16 w-full bg-gradient-to-b from-orange-200 to-orange-300 dark:from-orange-800 dark:to-orange-900 rounded-b-3xl flex items-center justify-center ">
                    <span className="text-3xl font-black text-orange-500/40">3º</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Leaderboard Section */}
          {rest.length > 0 && (
            <div className="max-w-4xl mx-auto space-y-4 pt-10 pb-20">
              <div className="flex items-center justify-between px-6 py-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Resto do Ranking</span>
                <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Volume Total</span>
              </div>
              <div className="space-y-3">
                {rest.map((item: { id: number; name: string; count: number }, idx: number) => {
                   const maxVal = top3[0]?.count || 1;
                   const percentage = (item.count / maxVal) * 100;

                   return (
                    <motion.div 
                      key={item.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 * idx }}
                      className="group bg-white dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-6"
                    >
                      <div className="flex items-center justify-center w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-2xl font-black text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        #{idx + 4}
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-700 dark:text-slate-200 text-lg capitalize">{item.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 dark:text-white text-xl">{item.count}</span>
                            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                          </div>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${percentage}%` }}
                             transition={{ duration: 1, ease: "easeOut" }}
                             className="absolute inset-0 bg-indigo-500 rounded-full"
                           />
                        </div>
                      </div>
                    </motion.div>
                   );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-32 flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-8 bg-slate-100/50 rounded-full">
            <BarChart3 className="h-16 w-16 text-slate-300" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-700">Sem dados no período</h3>
            <p className="text-slate-400 max-w-xs font-medium">Tente ajustar o filtro de datas para ver o ranking dos mais tickets.</p>
          </div>
        </div>
      )}
    </div>
  );
}



