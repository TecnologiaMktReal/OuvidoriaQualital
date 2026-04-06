import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Ticket, Clock, CheckCircle2, AlertCircle, Users, FileText, ArrowUpRight, RefreshCw, Moon, Sun } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const badgeColors: Record<string, string> = {
  aberto: "bg-blue-100 text-blue-700",
  em_andamento: "bg-sky-100 text-sky-700",
  aguardando_cliente: "bg-amber-100 text-amber-700",
  aguardando_departamento: "bg-amber-100 text-amber-700",
  resolvido: "bg-emerald-100 text-emerald-700",
  fechado: "bg-slate-100 text-slate-700",
};

const priorityColors: Record<string, string> = {
  baixa: "text-slate-500",
  media: "text-amber-500",
  alta: "text-rose-500",
  urgente: "text-red-600",
};

const chartHours = [
  { name: "01h", tickets: 2 },
  { name: "03h", tickets: 1 },
  { name: "05h", tickets: 2 },
  { name: "07h", tickets: 3 },
  { name: "09h", tickets: 18 },
  { name: "11h", tickets: 22 },
  { name: "13h", tickets: 24 },
  { name: "15h", tickets: 9 },
  { name: "17h", tickets: 5 },
  { name: "19h", tickets: 4 },
  { name: "21h", tickets: 3 },
  { name: "23h", tickets: 6 },
];

export default function HomePrev() {
  const { data: tickets, isLoading: loadingTickets } = trpc.tickets.list.useQuery();
  const { data: Clientes, isLoading: loadingClientes } = trpc.clientes.list.useQuery();
  const { data: contracts, isLoading: loadingContracts } = trpc.contracts.list.useQuery();
  const [filterStatus, setFilterStatus] = useState<"all" | "abertos" | "finalizados">("all");

  const ticketsData = (tickets as any[]) || [];

  const ticketsAbertos = ticketsData.filter((t) => t.status === "aberto" || t.status === "em_andamento").length || 0;
  const ticketsAguardando =
    ticketsData.filter((t) => t.status === "aguardando_cliente" || t.status === "aguardando_departamento").length || 0;
  const ticketsResolvidos = ticketsData.filter((t) => t.status === "resolvido" || t.status === "fechado").length || 0;
  const ticketsTotal = ticketsData.length || 0;

  const stats = [
    { title: "Tickets Abertos", value: ticketsAbertos, description: "Em atendimento", icon: Ticket, color: "text-blue-600" },
    { title: "Aguardando", value: ticketsAguardando, description: "Pendentes de resposta", icon: Clock, color: "text-amber-500" },
    { title: "Resolvidos", value: ticketsResolvidos, description: "Finalizados", icon: CheckCircle2, color: "text-emerald-500" },
    { title: "Total de Tickets", value: ticketsTotal, description: "Auditados e aprovados", icon: AlertCircle, color: "text-slate-700" },
  ];

  const otherStats = [
    { title: "Clientes", value: Clientes?.length || 0, description: "Cadastrados no sistema", icon: Users, loading: loadingClientes },
    { title: "Contratos", value: contracts?.length || 0, description: "Ativos e inativos", icon: FileText, loading: loadingContracts },
  ];

  const filteredTickets = useMemo(() => {
    return ticketsData.filter((ticket: any) => {
      if (filterStatus === "abertos") {
        return ticket.status === "aberto" || ticket.status === "em_andamento" || ticket.status === "aguardando_cliente" || ticket.status === "aguardando_departamento";
      }
      if (filterStatus === "finalizados") {
        return ticket.status === "resolvido" || ticket.status === "fechado";
      }
      return true;
    });
  }, [ticketsData, filterStatus]);

  const statusTotal = Math.max(ticketsAbertos + ticketsAguardando + ticketsResolvidos, 1);
  const donutData = [
    { name: "Abertos", value: ticketsAbertos, color: "#3B82F6" },
    { name: "Aguardando", value: ticketsAguardando, color: "#F59E0B" },
    { name: "Resolvidos", value: ticketsResolvidos, color: "#10B981" },
  ];

  return (
    <Layout>
      <div className="space-y-5 bg-[#f7f9fc] dark:bg-slate-900/40 p-1">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Dashboard Geral</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Bem-vindo de volta! Aqui está o <span className="text-blue-600 dark:text-blue-400 font-semibold">resumo de hoje.</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
              Diário (Hoje)
            </button>
            <button className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-200 transition" aria-label="Atualizar">
              <RefreshCw size={16} />
            </button>
            <button className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-200 transition" aria-label="Tema">
              <Sun size={16} className="hidden dark:block" />
              <Moon size={16} className="dark:hidden" />
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 flex gap-3 items-center"
            >
              <div className={`h-10 w-10 rounded-lg bg-blue-50 dark:bg-slate-800 flex items-center justify-center ${stat.color}`}>
                <stat.icon size={18} />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{stat.title}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</span>
                  <span className="text-xs text-slate-500">{stat.description}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Conteúdo central */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Gráfico */}
          <Card className="lg:col-span-2 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900 dark:text-white text-lg">Fluxo de Atendimentos</CardTitle>
              <CardDescription className="text-xs">Distribuição dos tickets no período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartHours} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} dy={6} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "10px", border: "none", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }} />
                    <Area type="monotone" dataKey="tickets" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorTickets)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Donut */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900 dark:text-white text-lg">Status Atual</CardTitle>
              <CardDescription className="text-xs">Visão consolidada</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="w-full h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={82}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "none" }} />
                    <Legend verticalAlign="bottom" height={32} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{ticketsTotal}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total de Tickets</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Outras métricas */}
        <div className="grid gap-3 md:grid-cols-2">
          {otherStats.map((stat) => (
            <Card key={stat.title} className="border border-slate-200 dark:border-slate-800 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-blue-600">
                  <stat.icon size={18} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{stat.title}</p>
                  {stat.loading ? (
                    <Skeleton className="h-6 w-16" />
                  ) : (
                    <p className="text-xl font-semibold text-slate-900 dark:text-white">{stat.value}</p>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400">{stat.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tickets Recentes */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-slate-900 dark:text-white">Tickets Recentes</CardTitle>
                <CardDescription>Últimos atendimentos registrados no sistema</CardDescription>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setFilterStatus("all")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filterStatus === "all" ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-500 dark:text-slate-300"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterStatus("abertos")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filterStatus === "abertos" ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-500 dark:text-slate-300"
                  }`}
                >
                  Abertos
                </button>
                <button
                  onClick={() => setFilterStatus("finalizados")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filterStatus === "finalizados" ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-500 dark:text-slate-300"
                  }`}
                >
                  Finalizados
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingTickets ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : filteredTickets.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300">
                    <tr>
                      <th className="p-3 font-semibold">ID</th>
                      <th className="p-3 font-semibold">Assunto / Cliente</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 font-semibold">Prioridade</th>
                      <th className="p-3 font-semibold">Data</th>
                      <th className="p-3 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTickets.slice(0, 6).map((ticket: any) => {
                      const statusKey = String(ticket.status || "").toLowerCase();
                      const createdAtLabel = ticket?.createdAt ? new Date(ticket.createdAt as any).toLocaleDateString("pt-BR") : "--";

                      return (
                        <tr key={ticket.id ?? ticket.protocol} className="hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors">
                          <td className="p-3 font-medium text-slate-700 dark:text-slate-200">#{ticket.protocol || ticket.id}</td>
                          <td className="p-3">
                            <div className="font-medium text-slate-900 dark:text-white">{ticket.description || "Sem descrição"}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Users size={12} /> {ticket.clienteName || "N/D"}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${badgeColors[statusKey] || "bg-slate-100 text-slate-700"}`}>
                              {String(ticket.status || "").replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`text-xs font-bold ${priorityColors[ticket.priority] || "text-slate-500"}`}>
                              {ticket.priority ? String(ticket.priority).toUpperCase() : "--"}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 dark:text-slate-300">{createdAtLabel}</td>
                          <td className="p-3 text-right">
                            <button className="p-2 text-slate-400 hover:text-blue-600 transition">
                              <ArrowUpRight size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-sm text-slate-500 dark:text-slate-300 py-6">Nenhum ticket encontrado.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}




