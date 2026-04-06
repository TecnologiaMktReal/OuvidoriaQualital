import { Layout } from "@/components/Layout";
import { EmailSender } from "@/components/EmailSender";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  ArrowUpRightSquare,
  Clock3,
  SlidersHorizontal,
  Maximize2,
  MessageSquare,
  Minimize2,
  PhoneCall,
  Search,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";

type TicketListItem = {
  id: number;
  protocol: string;
  status: string;
  priority: "baixa" | "media" | "alta" | "urgente";
  description?: string | null;
  openedAt: string | Date;
  slaDeadline?: string | Date | null;
  clienteName?: string | null;
  channel?: string | null;
  currentDepartmentId?: number | null;
  assignedTo?: number | null;
};

type TicketMessage = {
  id: number;
  ticketId: number;
  message: string;
  mediaUrl?: string | null;
  senderType: "user" | "Cliente" | "sistema" | "interno";
  createdAt: string | Date;
};

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: "slate" | "blue" | "emerald" | "amber" | "red" }) {
  const tones: Record<"slate" | "blue" | "emerald" | "amber" | "red", string> = {
    slate: "from-slate-500 to-slate-600",
    blue: "from-sky-500 to-blue-600",
    emerald: "from-emerald-500 to-teal-600",
    amber: "from-amber-500 to-orange-600",
    red: "from-rose-500 to-red-600",
  };
  return (
    <div className="rounded-lg border bg-white shadow-sm p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold text-white px-3 py-1 inline-flex rounded-md shadow-sm bg-gradient-to-r ${tones[tone]}`}
      >
        {value}
      </p>
    </div>
  );
}

function slaBadge(deadline?: string | Date | null) {
  if (!deadline)
    return {
      text: "Sem SLA",
      className: "bg-slate-100 text-slate-700 border-slate-200",
    };

  const msLeft = new Date(deadline).getTime() - Date.now();
  const minutes = Math.max(0, Math.floor(msLeft / 60000));

  if (minutes <= 0)
    return {
      text: "SLA estourado",
      className: "bg-gradient-to-r from-rose-500 to-red-600 text-white border-transparent",
    };

  const pct = minutes / (60 * 4); // aprox base 4h
  if (pct <= 0.1)
    return {
      text: `SLA crítico (${minutes}m)`,
      className: "bg-gradient-to-r from-red-500 to-amber-500 text-white border-transparent",
    };
  if (pct <= 0.3)
    return {
      text: `SLA atenção (${minutes}m)`,
      className: "bg-gradient-to-r from-amber-400 to-orange-500 text-white border-transparent",
    };

  return {
    text: `SLA ${minutes}m`,
    className: "bg-gradient-to-r from-emerald-400 to-teal-500 text-white border-transparent",
  };
}

export default function Tickets() {
  const [, setLocation] = useLocation();
  const dashboardMode = typeof window !== "undefined" && window.location.search.includes("dashboard=1");

  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("todos");
  const [criticityFilter, setCriticityFilter] = useState<string>("todos");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"arrival" | "sla">("arrival");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dialogOpen, setDialogOpen] = useState<null | { type: "motivo" | "criticidade"; ticketId: number }>(null);
  const [motivoSelection, setMotivoSelection] = useState<Record<string, string>>({});
  const [criticidadeSelection, setCriticidadeSelection] = useState<Record<string, string>>({});
  const [selectedTickets, setSelectedTickets] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<"confirm" | "reason">("confirm");
  const [deleteJustification, setDeleteJustification] = useState("");
  const statusTimersRef = useRef<Record<number, { wait?: ReturnType<typeof setTimeout>; close?: ReturnType<typeof setTimeout> }>>({});

  const { data: tickets, isLoading, refetch } = trpc.tickets.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const utils = trpc.useContext();
  const { data: statusSetup } = trpc.ticketSetup.statuses.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const { data: criticitySetup } = trpc.ticketSetup.criticities.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const { data: motiveSetup } = trpc.ticketSetup.serviceTypes.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const { data: departments } = trpc.departments.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const ticketCounters = useMemo(() => {
    const list = (tickets as TicketListItem[]) || [];
    const now = Date.now();
    const estourados = list.filter((t) => t.slaDeadline && new Date(t.slaDeadline).getTime() < now).length;
    const aguardando = list.filter((t) => t.status === "aguardando_cliente" || t.status === "aguardando_departamento").length;
    const andamento = list.filter((t) => t.status === "em_andamento").length;
    const abertos = list.filter((t) => t.status === "aberto").length;
    return {
      total: list.length,
      abertos,
      andamento,
      aguardando,
      estourados,
    };
  }, [tickets]);

  function formatPhoneBrazil(value?: string | null) {
    if (!value) return "";
    const digits = value.replace(/\D+/g, "");
    if (digits.length < 10) return value;
    const d = digits.slice(-11);
    const country = "+55";
    const dd = d.slice(0, 2);
    const nine = d.slice(2);
    return `${country} ${dd} ${nine.slice(0, 5)}-${nine.slice(5)}`;
  }

  const findColorByName = (items: any[] | undefined, name?: string | null) => {
    if (!items || !name) return undefined;
    const n = name.trim().toLowerCase();
    return items.find((i) => (i.name || "").toLowerCase() === n)?.color;
  };

  const toggleSelectTicket = (id: number, checked: boolean) => {
    setSelectedTickets((prev) => {
      const set = new Set(prev);
      if (checked) {
        set.add(id);
      } else {
        set.delete(id);
      }
      return Array.from(set);
    });
  };

  const handleDeleteClick = () => {
    if (selectedTickets.length === 0) return;
    setDeleteDialogOpen(true);
    setDeleteStep("confirm");
  };

  const ticketList: TicketListItem[] = (tickets as TicketListItem[]) || [];

  const filteredTickets: TicketListItem[] = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    const filtered = ticketList
      .filter((t) => (statusFilter === "todos" ? true : t.status === statusFilter))
      .filter((t) =>
        term.length === 0
          ? true
          : (t.protocol?.toLowerCase().includes(term) ||
              t.description?.toLowerCase().includes(term) ||
              t.clienteName?.toLowerCase().includes(term))
      )
      .filter((t) =>
        departmentFilter === "todos" ? true : (t.currentDepartmentId ?? null) === Number(departmentFilter)
      )
      .filter((t) =>
        criticityFilter === "todos" ? true : (t.priority || "").toLowerCase() === criticityFilter
      )
      .filter((t) => {
        if (!fromDate && !toDate) return true;
        const opened = t.openedAt ? new Date(t.openedAt) : null;
        if (!opened) return false;
        if (fromDate && opened < fromDate) return false;
        if (toDate && opened > toDate) return false;
        return true;
      });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "sla") {
        const aSla = a.slaDeadline ? new Date(a.slaDeadline).getTime() : Number.MAX_SAFE_INTEGER;
        const bSla = b.slaDeadline ? new Date(b.slaDeadline).getTime() : Number.MAX_SAFE_INTEGER;
        return aSla - bSla;
      }
      // arrival (openedAt desc)
      const aOpen = a.openedAt ? new Date(a.openedAt).getTime() : 0;
      const bOpen = b.openedAt ? new Date(b.openedAt).getTime() : 0;
      return bOpen - aOpen;
    });

    return sorted;
  }, [ticketList, statusFilter, searchTerm, departmentFilter, criticityFilter, dateFrom, dateTo, sortBy]);

  useEffect(() => {
    if (!selectedId && filteredTickets.length > 0) {
      setSelectedId(filteredTickets[0].id);
    }
  }, [filteredTickets, selectedId]);

  const hasTickets = filteredTickets.length > 0;
  const selectedTicket = filteredTickets.find((t) => t.id === selectedId) || filteredTickets[0];
  const isClosed =
    selectedTicket?.status === "fechado" || selectedTicket?.status === "fechado_sem_interacao";

  const statusColorMap = useMemo(() => {
    const map = new Map<string, string>();
    (statusSetup || []).forEach((s: any) => map.set((s.name || "").toLowerCase(), s.color || ""));
    return map;
  }, [statusSetup]);

  const criticityColorMap = useMemo(() => {
    const map = new Map<string, string>();
    (criticitySetup || []).forEach((s: any) => map.set((s.name || "").toLowerCase(), s.color || ""));
    return map;
  }, [criticitySetup]);

  const { data: messages, refetch: refetchMessages } = trpc.tickets.messages.list.useQuery(
    selectedTicket ? { ticketId: selectedTicket.id } : (null as any),
    { enabled: !!selectedTicket, refetchInterval: 5000 }
  );

  const updateStatus = trpc.tickets.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
    },
  });
  const deleteTickets = trpc.tickets.deleteMany.useMutation({
    async onMutate(variables) {
      const ids = variables.ids;
      await utils.tickets.list.cancel();
      const previous = utils.tickets.list.getData();
      utils.tickets.list.setData(undefined, (old) =>
        old ? (old as TicketListItem[]).filter((t) => !ids.includes(t.id)) : old
      );
      setSelectedTickets((prev) => prev.filter((id) => !ids.includes(id)));
      if (selectedId && ids.includes(selectedId)) {
        setSelectedId(null);
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        utils.tickets.list.setData(undefined, context.previous as any);
      }
    },
    onSuccess: () => {
      setSelectedTickets([]);
      setDeleteJustification("");
      setDeleteDialogOpen(false);
      setDeleteStep("confirm");
      setSelectedId(null);
    },
    onSettled: async () => {
      await utils.tickets.list.invalidate();
    },
  });

  const sendMessage = trpc.tickets.messages.create.useMutation({
    onSuccess: async () => {
      setMessageDraft("");
      await refetchMessages();
    },
  });

  useEffect(() => {
    if (!selectedTicket || !messages || (messages as TicketMessage[]).length === 0) return;
    const last = (messages as TicketMessage[])[(messages as TicketMessage[]).length - 1];
    if (last.senderType === "Cliente") {
      const timers = statusTimersRef.current[selectedTicket.id];
      if (timers?.wait) clearTimeout(timers.wait);
      if (timers?.close) clearTimeout(timers.close);
    }
  }, [messages, selectedTicket]);

  useEffect(() => {
    return () => {
      Object.values(statusTimersRef.current).forEach((timers) => {
        if (timers.wait) clearTimeout(timers.wait);
        if (timers.close) clearTimeout(timers.close);
      });
    };
  }, []);

  useEffect(() => {
    if (!dashboardMode) return;
    const id = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(id);
  }, [dashboardMode, refetch]);

  const handleSend = () => {
    if (!selectedTicket || !messageDraft.trim()) return;
    sendMessage.mutate({
      ticketId: selectedTicket.id,
      message: messageDraft.trim(),
    });
    updateStatus.mutate({ id: selectedTicket.id, status: "em_andamento", comment: "Atendente iniciou atendimento" });
    // Iniciar timers de espera e fechamento
    const existing = statusTimersRef.current[selectedTicket.id];
    if (existing?.wait) clearTimeout(existing.wait);
    if (existing?.close) clearTimeout(existing.close);
    const wait = setTimeout(() => {
      updateStatus.mutate({ id: selectedTicket.id, status: "aguardando_cliente", comment: "Sem resposta do Cliente há 3 minutos" });
    }, 3 * 60 * 1000);
    const close = setTimeout(() => {
      updateStatus.mutate({
        id: selectedTicket.id,
        status: "fechado_sem_interacao",
        comment: "Falta de Interação: Cliente não respondeu em 15 minutos",
      });
    }, 15 * 60 * 1000);
    statusTimersRef.current[selectedTicket.id] = { wait, close };
  };

  const handleDashboardOpen = () => {
    window.open("/tickets?dashboard=1", "_blank", "noopener");
  };

  const toggleTheme = () => setIsDark((v) => !v);

  const shell = (
    <div
      className={cn(
        "h-full flex flex-col rounded-xl border overflow-hidden w-full",
        "transition-all duration-300",
        isDark
          ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 border-slate-700"
          : "bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-900"
      )}
      style={{
        backgroundImage: isDark
          ? "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.08), transparent 25%), radial-gradient(circle at 80% 0%, rgba(168,85,247,0.08), transparent 25%)"
          : "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.12), transparent 25%), radial-gradient(circle at 80% 0%, rgba(168,85,247,0.12), transparent 25%)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowFilters((v) => !v)} aria-label="Abrir filtros">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <h2 className="text-base font-semibold">Tickets de Atendimento = Total ({filteredTickets.length})</h2>
          {selectedTickets.length > 0 && (
            <Button size="sm" variant="destructive" onClick={handleDeleteClick}>
              Excluir ticket
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsDark((v) => !v)} aria-label="Alternar tema">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDashboardOpen}>
            <ArrowUpRightSquare className="h-4 w-4 mr-1" />
            Modo Dashboard
          </Button>
        </div>
      </div>

      <div className="grid h-full w-full grid-cols-1 lg:grid-cols-12">
        {/* Lista */}
        <div
          className={cn(
            "h-full flex flex-col backdrop-blur border-b lg:border-b-0 lg:border-r",
            "lg:col-span-5 xl:col-span-5",
            isDark ? "bg-slate-900/60 border-slate-800" : "bg-white/80 border-slate-200"
          )}
        >
          {/* Painel lateral de filtros */}
          {showFilters && (
            <div
              className={cn(
                "absolute inset-0 z-30 max-w-xs w-full bg-background/95 border-r shadow-xl flex flex-col gap-3 p-4",
                "backdrop-blur"
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Filtros</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)} aria-label="Fechar filtros">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por protocolo, nome, contato..."
                  className="pl-8"
                  aria-label="Buscar tickets"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Departamento</Label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {(departments || []).map((d: any) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Criticidade</Label>
                <Select value={criticityFilter} onValueChange={setCriticityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">De</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Até</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Ordenação</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={sortBy === "arrival" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortBy("arrival")}
                  >
                    Chegada
                  </Button>
                  <Button
                    variant={sortBy === "sla" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortBy("sla")}
                  >
                    SLA
                  </Button>
                </div>
              </div>
              <div className="flex justify-between gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("todos");
                    setDepartmentFilter("todos");
                    setCriticityFilter("todos");
                    setDateFrom("");
                    setDateTo("");
                    setSortBy("arrival");
                    setSearchTerm("");
                  }}
                >
                  Limpar
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowFilters(false)}>
                  Aplicar
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  ["todos", "Todos"],
                  ["aberto", "Aberto"],
                  ["em_andamento", "Em andamento"],
                  ["aguardando_cliente", "Aguard. coop."],
                  ["aguardando_departamento", "Aguard. depto."],
                  ["resolvido", "Resolvido"],
                  ["fechado", "Fechado"],
                  ["fechado_sem_interacao", "Falta de Interação"],
                ].map(([v, label]) => (
                  <Button
                    key={v}
                    size="sm"
                    variant={statusFilter === v ? "default" : "outline"}
                    onClick={() => setStatusFilter(v)}
                    aria-pressed={statusFilter === v}
                    className="flex-1 min-w-[140px]"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Diálogo para Motivo / Criticidade */}
          <Dialog open={!!dialogOpen} onOpenChange={(v) => !v && setDialogOpen(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base">
                  {dialogOpen?.type === "motivo" ? "Selecionar Motivo do Ticket" : "Selecionar Criticidade"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(dialogOpen?.type === "motivo" ? motiveSetup || [] : criticitySetup || []).map((item: any) => {
                  const selected =
                    dialogOpen?.type === "motivo"
                      ? motivoSelection[String(dialogOpen?.ticketId ?? "")] === item.name
                      : criticidadeSelection[String(dialogOpen?.ticketId ?? "")] === item.name;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (!dialogOpen) return;
                        if (dialogOpen.type === "motivo") {
                          setMotivoSelection((prev) => ({ ...prev, [String(dialogOpen.ticketId)]: item.name || "" }));
                        } else {
                          setCriticidadeSelection((prev) => ({ ...prev, [String(dialogOpen.ticketId)]: item.name || "" }));
                        }
                        setDialogOpen(null);
                      }}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-3 py-2 text-left transition hover:shadow-sm",
                        isDark ? "bg-slate-900/70 border-slate-800" : "bg-white",
                        selected && "ring-2 ring-primary/60 border-primary/30"
                      )}
                      style={item.color ? { backgroundColor: item.color, color: "#fff" } : undefined}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{item.name}</p>
                        {"acronym" in item && item.acronym ? <p className="text-[11px] opacity-90">Sigla: {item.acronym}</p> : null}
                        {"slaMinutes" in item ? <p className="text-[11px] opacity-90">SLA: {item.slaMinutes} min</p> : null}
                      </div>
                      {item.color ? <span className="h-6 w-6 rounded-full border shadow-inner" style={{ backgroundColor: item.color }} /> : <span className="text-[11px] opacity-80">Sem cor</span>}
                    </button>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>

          {/* Diálogo de exclusão */}
          <Dialog
            open={deleteDialogOpen}
            onOpenChange={(v) => {
              if (!v) {
                setDeleteDialogOpen(false);
                setDeleteStep("confirm");
                setDeleteJustification("");
              }
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base">
                  {deleteStep === "confirm" ? "Excluir ticket" : "Justificativa obrigatória"}
                </DialogTitle>
              </DialogHeader>
              {deleteStep === "confirm" ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Deseja realmente excluir {selectedTickets.length} ticket(s)? Esta ação encerrará o ticket e registrará no histórico.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button variant="destructive" onClick={() => setDeleteStep("reason")}>
                      Continuar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Informe a justificativa. Ela será salva no histórico do ticket.
                  </p>
                  <Textarea
                    value={deleteJustification}
                    onChange={(e) => setDeleteJustification(e.target.value)}
                    placeholder="Ex.: Exclusão solicitada pelo gestor / ticket duplicado..."
                    className="min-h-[90px]"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={deleteJustification.trim().length < 5 || deleteTickets.isPending}
                      onClick={() =>
                        deleteTickets.mutate({
                          ids: selectedTickets,
                          justification: deleteJustification.trim(),
                        })
                      }
                    >
                      {deleteTickets.isPending ? "Excluindo..." : "Confirmar exclusão"}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <ScrollArea className="flex-1 p-4">
            {isLoading ? (
              <div className="space-y-3 p-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredTickets.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nenhum ticket encontrado</p>
            ) : (
              <div className="divide-y">
                {filteredTickets.map((ticket) => {
                  const motivo = motivoSelection[String(ticket.id)] || ticket.channel || "Motivo não informado";
                  const active = ticket.id === selectedTicket?.id;
                  const statusKey = (ticket.status || "").replace(/_/g, " ").toLowerCase();
                  const statusColor = statusColorMap.get(statusKey);
                  const priorityKey = (ticket.priority || "").toLowerCase();
                  const prioColor = criticityColorMap.get(priorityKey);
                  const fallbackClass =
                    ticket.priority === "urgente"
                      ? "bg-gradient-to-r from-rose-500 to-red-600"
                      : ticket.priority === "alta"
                      ? "bg-gradient-to-r from-orange-400 to-amber-500"
                      : ticket.priority === "media"
                      ? "bg-gradient-to-r from-sky-400 to-blue-500"
                      : "bg-gradient-to-r from-slate-400 to-slate-500";
                  const contact =
                    ticket.clienteName ||
                    ticket.channel ||
                    (ticket.description ? ticket.description.slice(0, 40) : "Contato não identificado");
                  const contract = ticket.description ? ticket.description.slice(0, 50) : "Contrato não informado";
                  const motivoColor =
                    findColorByName(motiveSetup, motivoSelection[String(ticket.id)]) ||
                    findColorByName(motiveSetup, ticket.channel) ||
                    undefined;
                  const critColor =
                    findColorByName(criticitySetup, criticidadeSelection[String(ticket.id)]) ||
                    findColorByName(criticitySetup, ticket.priority) ||
                    prioColor;

                  const isSelected = selectedTickets.includes(ticket.id);
                  return (
                    <button
                      key={ticket.id}
                      onClick={() => setSelectedId(ticket.id)}
                      className={cn(
                        "w-full text-left p-3 hover:bg-accent/30 transition flex flex-col gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                        active && "bg-accent/50"
                      )}
                      aria-pressed={active}
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => toggleSelectTicket(ticket.id, Boolean(checked))}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Selecionar ticket"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-[13px]">#{ticket.protocol}</span>
                              <span className="text-[12px] text-muted-foreground truncate max-w-[260px]">
                                {contact} {contract ? `- ${contract}` : ""}
                              </span>
                            </div>
                            <Badge
                              className={cn(
                                "capitalize text-white shadow-sm border-0 text-[11px] px-2 py-1 min-w-[140px] justify-center",
                                statusColor ? "bg-gradient-to-r from-black/30 to-black/10" : "bg-gradient-to-r from-indigo-500 to-sky-500"
                              )}
                              style={
                                statusColor
                                  ? {
                                      backgroundImage: `linear-gradient(135deg, ${statusColor || "#475569"}, ${statusColor || "#475569"}CC)`,
                                    }
                                  : undefined
                              }
                            >
                              {statusSetup?.find((s: any) => (s.name || "").toLowerCase() === statusKey)?.name ||
                                ticket.status.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate max-w-[320px]">
                            {contract}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                            <span>{formatDate(ticket.openedAt)}</span>
                            <span className="text-[11px] text-muted-foreground">
                              Canal - {formatPhoneBrazil(ticket.channel) || "—"}
                            </span>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="shadow-sm text-[11px] px-2 py-0.5 min-w-[140px] justify-center"
                              onClick={() => setDialogOpen({ type: "motivo", ticketId: ticket.id })}
                              style={motivoColor ? { backgroundColor: motivoColor, color: "#fff" } : undefined}
                            >
                              {motivoSelection[String(ticket.id)] || motivo}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="shadow-sm text-[11px] px-2 py-0.5 min-w-[140px] justify-center"
                              onClick={() => setDialogOpen({ type: "criticidade", ticketId: ticket.id })}
                              style={critColor ? { backgroundColor: critColor, color: "#fff" } : undefined}
                            >
                              {criticidadeSelection[String(ticket.id)] || "Criticidade"}
                            </Button>
                            <Badge className="shadow-sm text-[11px] px-2 py-0.5 bg-gradient-to-r from-emerald-400 to-teal-500 text-white border-transparent min-w-[140px] justify-center">
                              SLA Normal
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Detalhe + Chat */}
        <div
          className={cn(
            "h-full grid grid-rows-[auto,1fr]",
            "lg:col-span-7 xl:col-span-7",
            isDark ? "bg-slate-900 text-slate-100" : "bg-white"
          )}
        >
          <div
            className={cn(
              "flex items-start justify-between px-5 py-2 border-b sticky top-0 z-20",
              isDark ? "border-slate-800 bg-slate-900/95 backdrop-blur" : "bg-white/95 border-slate-200 backdrop-blur"
            )}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-semibold truncate">
                  {selectedTicket ? `Ticket #${selectedTicket.protocol}` : "Selecione um ticket"}
                </h2>
                {selectedTicket ? (
                  <>
                    <Badge variant="outline" className="capitalize">
                      {selectedTicket.status.replace(/_/g, " ")}
                    </Badge>
                    <Badge variant="secondary">Tipo: —</Badge>
                    <Badge variant="secondary">Depto: —</Badge>
                  </>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedTicket
                  ? `${selectedTicket.clienteName || "Cliente não informado"} - ${
                      selectedTicket.description || "Contrato não informado"
                    }`
                  : "Sem descrição"}
              </p>
            </div>
          </div>

          {hasTickets ? (
            <div className="grid grid-cols-2 h-full">
              {/* Painel info + histórico (classificação removida) */}
              <div
                className={cn(
                  "border-r h-full p-4 space-y-3 overflow-auto",
                  isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-50/60"
                )}
              >
                <Card className={cn(isDark && "bg-slate-900/70 border-slate-800 text-slate-100")}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Cliente / Contrato</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    <p>Cliente: {selectedTicket?.clienteName ?? "Não informado"}</p>
                    <p>Contrato: {selectedTicket?.description || "Contrato não informado"}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        Ver contatos
                      </Button>
                      <Button size="sm" variant="outline">
                        Mesclar contatos
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className={cn(isDark && "bg-slate-900/70 border-slate-800 text-slate-100")}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Histórico</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1">
                    <p>Em breve: log detalhado (status, motivo, depto, SLA, pausas, anexos removidos...)</p>
                  </CardContent>
                </Card>
              </div>

              {/* Chat */}
              <div className="h-full flex flex-col">
                <Tabs defaultValue="chat" className="flex-1 flex flex-col">
                  <TabsList className="px-4 py-2 border-b justify-start">
                    <TabsTrigger value="chat">Chat</TabsTrigger>
                    <TabsTrigger value="interno">Interno</TabsTrigger>
                    <TabsTrigger value="email">E-mail</TabsTrigger>
                  </TabsList>
                  <TabsContent value="chat" className="flex-1 flex flex-col">
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-3">
                        {(messages as TicketMessage[] | undefined)?.map((msg) => (
                          <div
                            key={msg.id}
                            className={cn(
                              "max-w-[70%] rounded-lg border p-3 shadow-sm",
                              msg.senderType === "user"
                                ? "ml-auto bg-primary/10 border-primary/20"
                                : isDark
                                ? "bg-slate-900/40 border-slate-800"
                                : "bg-white"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline" className="text-[10px]">
                                  {msg.senderType === "user"
                                    ? "Atendente"
                                    : msg.senderType === "interno"
                                    ? "Interno"
                                    : msg.senderType === "sistema"
                                    ? "Sistema"
                                    : "Cliente"}
                                </Badge>
                                <span>{formatDate(msg.createdAt)}</span>
                              </div>
                            </div>
                            <p className="text-sm text-foreground">{msg.message}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="border-t p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Textarea
                          value={messageDraft}
                          onChange={(e) => setMessageDraft(e.target.value)}
                          placeholder="Responder (WhatsApp/e-mail)..."
                          className="min-h-[60px]"
                          disabled={isClosed}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MessageSquare className="h-4 w-4" />
                          <span>Multicanal: WA preferido, e-mail opcional</span>
                        </div>
                        <Button onClick={handleSend} disabled={sendMessage.isPending || !selectedTicket || isClosed}>
                          {sendMessage.isPending ? "Enviando..." : "Enviar"}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="interno" className="flex-1 flex flex-col">
                    <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                      Em breve: chat interno com menções e notificações.
                    </div>
                  </TabsContent>
                  <TabsContent value="email" className="flex-1 flex flex-col p-4">
                    {selectedTicket ? (
                      <EmailSender
                        ticketId={selectedTicket.id}
                        defaultTo={selectedTicket.clienteName ? `${selectedTicket.clienteName}@exemplo.com` : ""}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">Selecione um ticket.</p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          ) : (
            <div className={cn("p-4 text-sm space-y-1", isDark ? "bg-slate-900 text-slate-100" : "bg-white")}>
              <p className="text-base font-semibold leading-tight">Selecione um ticket</p>
              <p className="text-xs text-muted-foreground leading-tight">Sem descrição</p>
              <p className="text-xs text-muted-foreground leading-tight">Nenhum ticket listado no momento.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (dashboardMode) {
    return (
      <div className="h-screen bg-slate-50 flex flex-col">
        <header className="flex items-center justify-between px-4 py-2 border-b bg-white/70 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
              TK
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Helpdesk</p>
              <p className="text-sm font-semibold">Tickets</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => document.documentElement.requestFullscreen?.()}>
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => document.exitFullscreen?.()}>
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => window.close()}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-hidden px-0 pb-4 pt-3 space-y-3">
          <div className="px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <SummaryTile label="Total" value={ticketCounters.total} tone="slate" />
            <SummaryTile label="Abertos" value={ticketCounters.abertos} tone="blue" />
            <SummaryTile label="Em andamento" value={ticketCounters.andamento} tone="emerald" />
            <SummaryTile label="Aguardando" value={ticketCounters.aguardando} tone="amber" />
            <SummaryTile label="SLA estourado" value={ticketCounters.estourados} tone="red" />
          </div>
          {shell}
        </main>
      </div>
    );
  }

  return (
    <Layout>
      <div className="h-[calc(100vh-32px)] w-full px-0 sm:px-0 lg:px-0 flex justify-start">
        {shell}
      </div>
    </Layout>
  );
}



