import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { TicketKanbanCard } from "@/components/TicketKanbanCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

type ColumnDef = { slug: string; title: string };

const FIXED_COLUMNS: ColumnDef[] = [
  { slug: "aguardando_atendimento", title: "Aguardando Atendimento" },
  { slug: "em_atendimento", title: "Em Atendimento" },
  { slug: "em_espera", title: "Em Espera" },
  { slug: "aguardando_resposta", title: "Aguardando Resposta" },
  { slug: "atendimento_fechado", title: "Atendimento Fechado" },
];

const COLUMN_STYLES: Record<
  string,
  {
    shell: string;
    header: string;
    title: string;
    badge: string;
    accent: string;
  }
> = {
  aguardando_atendimento: {
    shell:
      "bg-amber-50/60 dark:bg-amber-950/15 border-amber-200/70 dark:border-amber-900/40",
    header: "bg-amber-50/80 dark:bg-amber-950/25",
    title: "text-amber-950 dark:text-amber-100",
    badge:
      "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/30 dark:text-amber-100 dark:border-amber-800/40",
    accent: "bg-amber-400",
  },
  em_atendimento: {
    shell:
      "bg-sky-50/60 dark:bg-sky-950/15 border-sky-200/70 dark:border-sky-900/40",
    header: "bg-sky-50/80 dark:bg-sky-950/25",
    title: "text-sky-950 dark:text-sky-100",
    badge:
      "bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-900/30 dark:text-sky-100 dark:border-sky-800/40",
    accent: "bg-sky-400",
  },
  em_espera: {
    shell:
      "bg-orange-50/60 dark:bg-orange-950/15 border-orange-200/70 dark:border-orange-900/40",
    header: "bg-orange-50/80 dark:bg-orange-950/25",
    title: "text-orange-950 dark:text-orange-100",
    badge:
      "bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-900/30 dark:text-orange-100 dark:border-orange-800/40",
    accent: "bg-orange-400",
  },
  aguardando_resposta: {
    shell:
      "bg-slate-50/70 dark:bg-slate-900/30 border-slate-200/80 dark:border-slate-700/60",
    header: "bg-slate-50/80 dark:bg-slate-900/40",
    title: "text-slate-900 dark:text-slate-100",
    badge:
      "bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-800/50 dark:text-slate-100 dark:border-slate-700/50",
    accent: "bg-slate-400",
  },
  atendimento_fechado: {
    shell:
      "bg-emerald-50/60 dark:bg-emerald-950/15 border-emerald-200/70 dark:border-emerald-900/40",
    header: "bg-emerald-50/80 dark:bg-emerald-950/25",
    title: "text-emerald-950 dark:text-emerald-100",
    badge:
      "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-100 dark:border-emerald-800/40",
    accent: "bg-emerald-400",
  },
  outros: {
    shell:
      "bg-violet-50/60 dark:bg-violet-950/15 border-violet-200/70 dark:border-violet-900/40",
    header: "bg-violet-50/80 dark:bg-violet-950/25",
    title: "text-violet-950 dark:text-violet-100",
    badge:
      "bg-violet-100 text-violet-900 border-violet-200 dark:bg-violet-900/30 dark:text-violet-100 dark:border-violet-800/40",
    accent: "bg-violet-400",
  },
};

export function TicketsStatusKanban({
  tickets,
  onOpenChat,
  onViewHistory,
  onViewCliente,
}: {
  tickets: any[];
  onOpenChat: (ticket: any) => void;
  onViewHistory: (ticket: any) => void;
  onViewCliente: (ticket: any) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const c of FIXED_COLUMNS) map.set(c.slug, []);
    map.set("outros", []);

    for (const t of tickets ?? []) {
      const slug = String(t.status || "");
      if (map.has(slug)) map.get(slug)!.push(t);
      else map.get("outros")!.push(t);
    }

    return map;
  }, [tickets]);

  const columns = useMemo(() => {
    const base = [...FIXED_COLUMNS];
    const othersCount = grouped.get("outros")?.length ?? 0;
    if (othersCount > 0) base.push({ slug: "outros", title: "Outros" });
    return base;
  }, [grouped]);

  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex gap-4 h-full min-h-[calc(100vh-180px)] p-4">
          {columns.map((col) => {
            const items = grouped.get(col.slug) ?? [];
            const style = COLUMN_STYLES[col.slug] ?? COLUMN_STYLES.outros;
            return (
              <Card
                key={col.slug}
                className={cn(
                  "w-[340px] shrink-0 overflow-hidden flex flex-col shadow-sm",
                  style.shell
                )}
              >
                <CardHeader className={cn("p-0 sticky top-0 z-10 border-b", style.header)}>
                  <div className="h-1 w-full" aria-hidden="true">
                    <div className={cn("h-full w-full", style.accent)} />
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className={cn("font-bold text-sm tracking-tight", style.title)}>{col.title}</div>
                    <Badge variant="outline" className={cn("text-[11px] font-semibold", style.badge)}>
                      {items.length}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-3 space-y-3">
                  {items.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-500/80 dark:text-slate-400 italic">
                      Sem tickets
                    </div>
                  ) : (
                    items.map((t, idx) => (
                      <TicketKanbanCard
                        key={t.id ?? t.protocol ?? `kanban-${col.slug}-${idx}`}
                        ticket={t}
                        onOpenChat={onOpenChat}
                        onViewHistory={onViewHistory}
                        onViewCliente={onViewCliente}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}




