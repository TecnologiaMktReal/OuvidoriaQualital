
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface SimpleTicket {
  id: number;
  criticityId?: number | null;
  criticityName?: string | null;
  criticityColor?: string | null;
}

export function TicketCriticitySelector({ ticket }: { ticket: SimpleTicket }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const ctx = trpc.useContext();
  const { data: criticities } = trpc.ticketSetup.criticities.list.useQuery();
  
  const updateDetails = trpc.tickets.updateDetails.useMutation({
    onSuccess: () => {
      ctx.tickets.list.invalidate();
    }
  });

  const defaultCriticity = criticities?.find(c => c.isDefault);
  const currentCriticity = criticities?.find(c => c.id === ticket.criticityId) || (ticket.criticityId ? null : defaultCriticity);

  // Use current criticity color or default or fallback
  const bgColor = currentCriticity?.color || "#f1f5f9"; // slate-100
  const textColor = currentCriticity?.color ? "#fff" : "#64748b"; // slate-500
  const borderColor = currentCriticity?.color ? "transparent" : "#e2e8f0"; // slate-200

  const handleSelect = (criticityId: number | undefined) => {
    updateDetails.mutate({ id: ticket.id, criticityId });
    setOpen(false);
    setSearch("");
  };

  const filtered = criticities?.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={updateDetails.isPending}
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide border transition-all hover:opacity-90 active:scale-95 min-w-0 max-w-[140px]",
            updateDetails.isPending && "opacity-50 cursor-not-allowed"
          )}
          style={{
            backgroundColor: bgColor,
            color: textColor,
            borderColor: borderColor,
          }}
        >
          {updateDetails.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <span className="truncate block">
              {currentCriticity?.name || "Sem Criticidade"}
            </span>
          )}
          <ChevronDown size={10} className="opacity-70 flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 bg-white rounded-xl shadow-xl border-slate-100" align="start" side="bottom">
        <div className="space-y-2">
          <Input
            placeholder="Buscar criticidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs bg-slate-50 border-slate-200 focus-visible:ring-offset-0 focus-visible:ring-indigo-500/20"
            autoFocus
          />
          
          <div className="max-h-[240px] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent pr-1">
             <button
              onClick={() => handleSelect(undefined)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-600 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <div className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-slate-300 transition-colors" />
              <span>Padrão (Resetar)</span>
            </button>

            {filtered?.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all text-left group"
              >
                <div 
                  className="w-2 h-2 rounded-full border border-white/40 shadow-sm shrink-0" 
                  style={{ backgroundColor: item.color || '#cbd5e1' }}
                />
                <span className="truncate flex-1">{item.name}</span>
                {item.isDefault && <span className="text-[10px] text-slate-400 bg-slate-100 px-1 rounded">Default</span>}
              </button>
            ))}

            {filtered?.length === 0 && (
              <div className="text-xs text-slate-400 text-center py-4 italic">
                Nenhuma criticidade encontrada
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}



