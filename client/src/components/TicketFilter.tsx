import React, { useState, useEffect } from "react";
import { format, subDays, startOfWeek, startOfMonth, isSameDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Filter, X, Check, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

export type DateRangeType = "all" | "today" | "yesterday" | "week" | "month" | "custom";

export interface TicketFilters {
  status: string[];
  clienteId?: number | null;
  reasonId?: number | null;
  dateRange: {
    from?: Date;
    to?: Date;
    type: DateRangeType;
  };
}

interface TicketFilterProps {
  filters: TicketFilters;
  onFilterChange: (filters: TicketFilters) => void;
}

export function TicketFilter({ filters, onFilterChange }: TicketFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [Clientesearch, setClientesearch] = useState("");
  
  // Queries
  const { data: statuses } = trpc.ticketSetup.statuses.list.useQuery();
  const { data: reasons } = trpc.attendanceReasons.list.useQuery();
  const { data: Clientes } = trpc.clientes.list.useQuery(
    { search: Clientesearch, pageSize: 20 },
    { enabled: Clientesearch.length > 2 }
  );

  const handleDatePreset = (type: DateRangeType) => {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));
    
    let from: Date | undefined;
    let to: Date | undefined;

    switch (type) {
      case "all":
        from = undefined;
        to = undefined;
        break;
      case "today":
        from = startOfToday;
        to = endOfToday;
        break;
      case "yesterday":
        const yest = subDays(startOfToday, 1);
        from = yest;
        to = new Date(yest);
        to.setHours(23, 59, 59, 999);
        break;
      case "week":
        from = startOfToday;
        from.setDate(from.getDate() - 7); // Últimos 7 dias
        to = endOfToday;
        break;
      case "month":
        from = startOfMonth(startOfToday);
        to = endOfToday;
        break;
      default:
        return; 
    }

    onFilterChange({
      ...filters,
      dateRange: { type, from, to }
    });
  };

  const toggleStatus = (slug: string) => {
    const current = filters.status;
    const next = current.includes(slug)
      ? current.filter(s => s !== slug)
      : [...current, slug];
    onFilterChange({ ...filters, status: next });
  };

  const activeFilterCount = [
    filters.status.length > 0,
    filters.clienteId,
    filters.reasonId,
    filters.dateRange.type !== "today"
  ].filter(Boolean).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button 
          className={cn(
            "p-2 rounded-full transition-colors relative",
            activeFilterCount > 0 
              ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100" 
              : "hover:bg-slate-100 text-slate-500"
          )}
          title="Filtros Avançados"
        >
          <Filter size={18} />
          {activeFilterCount > 0 && (
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-indigo-600 rounded-full border-2 border-white" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="end">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h4 className="font-semibold text-sm text-slate-800">Filtros</h4>
          {activeFilterCount > 0 && (
             <Button 
               variant="ghost" 
               size="sm" 
               onClick={() => onFilterChange({
                 status: [],
                 dateRange: { type: "all", from: undefined, to: undefined }
               })}
               className="h-auto px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
             >
               Limpar
             </Button>
          )}
        </div>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-3 space-y-4">
            
            {/* Status */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
              <div className="flex flex-wrap gap-1.5">
                {statuses?.map(status => (
                  <Badge
                    key={status.id}
                    variant="outline"
                    className={cn(
                      "cursor-pointer hover:bg-indigo-50 transition-colors text-[10px] px-2 py-0.5",
                      filters.status.includes(status.slug) 
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold" 
                        : "border-slate-200 text-slate-600"
                    )}
                    onClick={() => toggleStatus(status.slug)}
                    style={filters.status.includes(status.slug) && status.color ? {
                      borderColor: status.color,
                      color: status.color,
                      backgroundColor: status.color + "10"
                    } : {}}
                  >
                    {status.name}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Data */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Período</label>
              <Tabs value={filters.dateRange.type} onValueChange={(v) => handleDatePreset(v as DateRangeType)} className="w-full">
                <TabsList className="w-full grid grid-cols-5 h-8 bg-slate-100">
                  <TabsTrigger value="all" className="text-[10px] px-1">Tudo</TabsTrigger>
                  <TabsTrigger value="today" className="text-[10px] px-1">Hoje</TabsTrigger>
                  <TabsTrigger value="yesterday" className="text-[10px] px-1">Ontem</TabsTrigger>
                  <TabsTrigger value="week" className="text-[10px] px-1">Semana</TabsTrigger>
                  <TabsTrigger value="month" className="text-[10px] px-1">Mês</TabsTrigger>
                </TabsList>
              </Tabs>
              
              {filters.dateRange.type === "custom" && (
                <div className="pt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 mb-1 block">Data Inicial</label>
                      <Input
                        type="date"
                        value={filters.dateRange.from ? format(filters.dateRange.from, "yyyy-MM-dd") : ""}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : undefined;
                          onFilterChange({
                            ...filters,
                            dateRange: {
                              ...filters.dateRange,
                              from: date,
                              type: "custom"
                            }
                          });
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 mb-1 block">Data Final</label>
                      <Input
                        type="date"
                        value={filters.dateRange.to ? format(filters.dateRange.to, "yyyy-MM-dd") : ""}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : undefined;
                          onFilterChange({
                            ...filters,
                            dateRange: {
                              ...filters.dateRange,
                              to: date,
                              type: "custom"
                            }
                          });
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-[10px]"
                    onClick={() => handleDatePreset("today")}
                  >
                    Voltar para Hoje
                  </Button>
                </div>
              )}
              
              {filters.dateRange.type !== "custom" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-[10px]"
                  onClick={() => onFilterChange({
                    ...filters,
                    dateRange: {
                      type: "custom",
                      from: filters.dateRange.from,
                      to: filters.dateRange.to
                    }
                  })}
                >
                  <CalendarIcon size={12} className="mr-1" />
                  Período Personalizado
                </Button>
              )}
            </div>

            <Separator />

            {/* Cliente */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Cliente</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal h-8 px-2 text-xs">
                    <User size={12} className="mr-2 text-slate-400" />
                    {filters.clienteId 
                      ? (Clientes?.find(c => c.id === filters.clienteId)?.name || "Selecionado")
                      : <span className="text-slate-500">Buscar...</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[280px]" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Nome ou matrícula..." 
                      value={Clientesearch}
                      onValueChange={setClientesearch}
                      className="text-xs"
                    />
                    <CommandList>
                      <CommandEmpty className="text-xs">Nenhum Cliente encontrado.</CommandEmpty>
                      {Clientesearch.length > 2 && (
                        <CommandGroup heading="Resultados">
                          {Clientes?.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={c.name}
                              onSelect={() => {
                                onFilterChange({ ...filters, clienteId: c.id });
                              }}
                              className="text-xs"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-3 w-3",
                                  filters.clienteId === c.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{c.name}</span>
                                <span className="text-[10px] text-slate-400">Matr: {c.registrationNumber}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
               {filters.clienteId && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-[10px] text-red-500 w-full"
                  onClick={() => onFilterChange({ ...filters, clienteId: undefined })}
                >
                  Remover
                </Button>
              )}
            </div>

            <Separator />

            {/* Motivo */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Motivo</label>
              <Select 
                value={filters.reasonId?.toString() || "all"} 
                onValueChange={(val) => onFilterChange({ 
                  ...filters, 
                  reasonId: val === "all" ? undefined : Number(val) 
                })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos</SelectItem>
                  {reasons?.map((reason) => (
                    <SelectItem key={reason.id} value={reason.id.toString()} className="text-xs">
                      {reason.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>
        </ScrollArea>
        <div className="p-3 border-t bg-slate-50">
           <Button className="w-full h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs" onClick={() => setIsOpen(false)}>
             Aplicar Filtros
           </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}



