import { cn } from "@/lib/utils";
import { User, Building, MapPin, Phone, Mail, Fingerprint, Calendar, ShieldCheck, ShieldAlert, Heart } from "lucide-react";

interface ClienteInfoSectionProps {
  clienteName?: string | null;
  clienteId?: number | null;
  contractName?: string | null;
  ticketDescription?: string | null;
  registrationNumber?: string | number | null;
  position?: string | null;
  birthDate?: string | Date | null;
  motherName?: string | null;
  status?: string | null;
  associationDate?: string | Date | null;
  terminationDate?: string | Date | null;
  hideContainer?: boolean;
}

export function ClienteInfoSection({
  clienteName,
  clienteId,
  contractName,
  ticketDescription,
  registrationNumber,
  position,
  birthDate,
  motherName,
  status,
  associationDate,
  terminationDate,
  hideContainer = false,
}: ClienteInfoSectionProps) {
  const formatDate = (date?: string | Date | null) => {
    if (!date) return "---";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const Content = (
    <div className={cn("space-y-6", !hideContainer && "p-5")}>
      {/* Grid de Informações */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
          {/* Nome do Cliente (Destaque) */}
          <div className="col-span-2 md:col-span-3">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
              Cliente
            </label>
            <p className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              {clienteName || "Não informado"}
            </p>
          </div>

          {/* Matrícula */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1 flex items-center gap-1">
              <Fingerprint size={10} /> Matrícula
            </label>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-100">
              {registrationNumber || "---"}
            </p>
          </div>

          {/* Cargo */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
              Cargo
            </label>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-100 truncate" title={position || ""}>
              {position || "---"}
            </p>
          </div>

          {/* Data de Nascimento */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1 flex items-center gap-1">
              <Calendar size={10} /> Nascimento
            </label>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-100">
              {formatDate(birthDate)}
            </p>
          </div>

          {/* Nome da Mãe */}
          <div className="col-span-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1 flex items-center gap-1">
              <Heart size={10} /> Nome da Mãe
            </label>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-100">
              {motherName || "---"}
            </p>
          </div>

          {/* Contrato */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1 flex items-center gap-1">
              <Building size={10} /> Contrato
            </label>
            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {contractName || "---"}
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
              Status
            </label>
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
              status === 'ativo' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
            )}>
              {status === 'ativo' ? <ShieldCheck size={10} /> : <ShieldAlert size={10} />}
              {status || "Inativo"}
            </span>
          </div>

          {/* Datas de Associação / Desligamento */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
              Associação
            </label>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-100">
              {formatDate(associationDate)}
            </p>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1 text-rose-500 dark:text-rose-400">
              Desligamento
            </label>
            <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
              {formatDate(terminationDate)}
            </p>
          </div>
        </div>

        {/* Descrição do Ticket (Se houver) */}
        {ticketDescription && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
              Motivo do Contato
            </label>
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
              <p className="text-sm text-slate-600 dark:text-slate-300 italic">
                "{ticketDescription}"
              </p>
            </div>
          </div>
        )}
      </div>
  );

  if (hideContainer) return Content;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
        <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <User size={16} className="text-indigo-500" /> Cliente / Contrato
        </h3>
      </div>
      {Content}
    </div>
  );
}



