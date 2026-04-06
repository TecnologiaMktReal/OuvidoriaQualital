import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Search, Filter, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { WhatsAppChatSection } from "./WhatsAppChatSection";
import { ClienteInfoSection } from "./ClienteInfoSection";
import { HistoricoSection } from "./HistoricoSection";
import { toast } from "sonner";
import { DeclarationPreviewModal } from "@/components/DeclarationPreviewModal";
import { useAuth } from "@/_core/hooks/useAuth";

interface WhatsAppPanelProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId?: number;
  clienteName?: string | null;
  clienteId?: number | null;
  contractName?: string | null;
  ticketDescription?: string | null;
}

type Ticket = {
  id: number;
  protocol: string;
  clienteName?: string | null;
  contractName?: string | null;
  status: string;
  openedAt: Date | string;
  description?: string | null;
  clientePosition?: string | null;
  clienteStatus?: string | null;
  clienteRegistration?: string | number | null;
  clienteMother?: string | null;
  clienteBirthDate?: string | Date | null;
  ClienteAssociationDate?: string | Date | null;
  ClienteAdmissionDate?: string | Date | null;
  ClienteTerminationDate?: string | Date | null;
  birthDate?: string | Date | null;
};

function formatDate(value?: string | Date | null) {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatTime(value?: string | Date | null) {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function WhatsAppPanel({
  isOpen,
  onClose,
  ticketId: initialTicketId,
  clienteName: initialclienteName,
  clienteId,
  contractName,
  ticketDescription,
}: WhatsAppPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const currentUser = user as any;

  const [isDeclarationOpen, setIsDeclarationOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isEditingBankData, setIsEditingBankData] = useState(false);
  const [bankFormData, setBankFormData] = useState({
    bankCode: "",
    bankName: "",
    accountType: "corrente" as "corrente" | "salario" | "poupanca",
    agency: "",
    accountNumber: "",
    accountDigit: "",
    pixKey: "",
  });
  const [statusFilter, setStatusFilter] = useState<
    | "todos"
    | "aguardando_atendimento"
    | "em_atendimento"
    | "aguardando_resposta"
    | "em_espera"
    | "fechados"
  >("todos");
  const [selectedTicketId, setSelectedTicketId] = useState<number | undefined>(initialTicketId);

  // Buscar lista de tickets
  const { data: ticketsData } = trpc.tickets.list.useQuery(
    {
      search: searchTerm,
      status:
        statusFilter === "todos"
          ? undefined
          : statusFilter === "fechados"
            ? (["atendimento_fechado", "ticket_invalido"] as any)
            : statusFilter,
    },
    { refetchInterval: 10000 }
  );

  const tickets = useMemo(() => {
    const raw = (ticketsData as Ticket[] | undefined) || [];
    // Dedup defensivo por id para evitar warnings de keys duplicadas
    const seen = new Set<number>();
    const out: Ticket[] = [];
    for (const t of raw) {
      if (!t || typeof t.id !== "number") continue;
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      out.push(t);
    }
    return out;
  }, [ticketsData]);
  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);

  const bankDataQuery = trpc.clientes.bankData.get.useQuery(
    { clienteId: selectedTicket?.clienteId as any },
    {
      enabled: isBankModalOpen && !!selectedTicket?.clienteId,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (!isBankModalOpen) {
      setIsEditingBankData(false);
      return;
    }
    const real = bankDataQuery.data as any;
    if (real) {
      setBankFormData({
        bankCode: real.bankCode || "",
        bankName: real.bankName || "",
        accountType: (real.accountType as any) || "corrente",
        agency: real.agency || "",
        accountNumber: real.accountNumber || "",
        accountDigit: real.accountDigit || "",
        pixKey: real.pixKey || "",
      });
      return;
    }
    if (selectedTicket) {
      setBankFormData({
        bankCode: (selectedTicket as any).ClienteBankCode || "",
        bankName: (selectedTicket as any).ClienteBankName || "",
        accountType: ((selectedTicket as any).ClienteAccountType as any) || "corrente",
        agency: (selectedTicket as any).ClienteAgency || "",
        accountNumber: (selectedTicket as any).ClienteAccountNumber || "",
        accountDigit: (selectedTicket as any).ClienteAccountDigit || "",
        pixKey: (selectedTicket as any).ClientePixKey || "",
      });
    }
  }, [isBankModalOpen, bankDataQuery.data, selectedTicket]);

  const upsertBankData = trpc.clientes.bankData.upsert.useMutation({
    onSuccess: () => {
      toast.success("Dados bancários salvos");
      setIsBankModalOpen(false);
      setIsEditingBankData(false);
      bankDataQuery.refetch().catch(() => undefined);
    },
    onError: (err) => toast.error(err.message || "Falha ao salvar dados bancários"),
  });

  const sendTicketMessage = trpc.tickets.messages.create.useMutation({
    onError: (err) => toast.error(err.message || "Falha ao enviar mensagem"),
  });

  const handleShareBankData = () => {
    if (!selectedTicket) return;
    if (!bankFormData.bankName) {
      toast.error("Não há dados bancários completos para compartilhar.");
      return;
    }

    const message =
      `🏦 *DADOS BANCÁRIOS*\n\n` +
      `*Banco:* ${bankFormData.bankCode || "dado não cadastrado"} - ${bankFormData.bankName || "dado não cadastrado"}\n` +
      `*Tipo:* ${bankFormData.accountType || "dado não cadastrado"}\n` +
      `*Agência:* ${bankFormData.agency || "dado não cadastrado"}\n` +
      `*Conta/Dígito:* ${bankFormData.accountNumber || "dado não cadastrado"}${bankFormData.accountDigit ? `-${bankFormData.accountDigit}` : ""}\n` +
      `*Chave PIX:* ${bankFormData.pixKey || "dado não cadastrado"}\n\n` +
      `Por favor, confirme se os dados acima estão corretos?`;

    sendTicketMessage.mutate({ ticketId: selectedTicket.id, message });
    setIsBankModalOpen(false);
  };

  // Atualizar ticket selecionado quando initialTicketId mudar
  useEffect(() => {
    if (initialTicketId) {
      setSelectedTicketId(initialTicketId);
    }
  }, [initialTicketId]);

  // Fechar com ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevenir scroll do body quando painel aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Painel Tela Cheia */}
      <div
        ref={panelRef}
        className={cn(
          "fixed inset-0 top-16 z-50", // top-16 para começar abaixo da linha dos ícones
          "bg-slate-50",
          "transform transition-transform duration-300 ease-in-out",
          "flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold shadow-md">
              W
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">WhatsApp</h2>
              <p className="text-xs text-slate-500">Qualital</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Layout de 3 Colunas */}
        <div className="flex-1 flex overflow-hidden">
          {/* COLUNA 1: Lista de Tickets (Esquerda) */}
          <div className="w-[320px] bg-white border-r border-slate-200 flex flex-col">
            {/* Busca e Filtros */}
            <div className="p-4 border-b border-slate-200 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Filtros de Status */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: "todos", label: "Todos" },
                  { key: "aguardando_atendimento", label: "Aguard. Atendimento" },
                  { key: "em_atendimento", label: "Em Atendimento" },
                  { key: "aguardando_resposta", label: "Aguard. Resposta" },
                  { key: "em_espera", label: "Espera" },
                  { key: "fechados", label: "Fechados" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setStatusFilter(item.key as any)}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-full transition-colors",
                      statusFilter === item.key
                        ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de Tickets */}
            <div className="flex-1 overflow-y-auto">
              {tickets.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">
                  Nenhum ticket encontrado
                </div>
              ) : (
                tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={cn(
                      "p-4 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50",
                      selectedTicketId === ticket.id && "bg-indigo-50 border-l-4 border-l-indigo-600"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-xs font-bold">
                          {ticket.clienteName?.charAt(0).toUpperCase() || "T"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 line-clamp-1">
                            {ticket.clienteName || "Cliente"}
                          </p>
                          <p className="text-xs text-slate-500">#{ticket.protocol}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">{formatDate(ticket.openedAt)}</p>
                        <p className="text-xs text-slate-400">{formatTime(ticket.openedAt)}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {ticket.description || "Sem descrição"}
                    </p>
                    <div className="mt-2">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-medium",
                        ticket.status === "aguardando_atendimento" && "bg-orange-100 text-orange-700",
                        ticket.status === "em_atendimento" && "bg-cyan-100 text-cyan-700",
                        ticket.status === "aguardando_resposta" && "bg-slate-200 text-slate-700",
                        ticket.status === "em_espera" && "bg-amber-100 text-amber-800",
                        (ticket.status === "atendimento_fechado" || ticket.status === "ticket_invalido") && "bg-green-100 text-green-700"
                      )}>
                        {ticket.status === "aguardando_atendimento"
                          ? "Aguardando Atendimento"
                          : ticket.status === "em_atendimento"
                            ? "Em Atendimento"
                            : ticket.status === "aguardando_resposta"
                              ? "Aguardando Resposta"
                              : ticket.status === "em_espera"
                                ? "Espera"
                                : ticket.status === "atendimento_fechado" || ticket.status === "ticket_invalido"
                                  ? "Fechado"
                                  : ticket.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUNA 2: Chat (Centro) */}
          <div className="flex-1 flex flex-col bg-slate-50 p-4">
            {selectedTicketId ? (
              <WhatsAppChatSection
                ticketId={selectedTicketId}
                onOpenDeclaration={() => {
                  if (!selectedTicket?.clienteId) {
                    toast.error("Declaração não pode ser feita para pessoas que não são cooperadas");
                    return;
                  }
                  setIsDeclarationOpen(true);
                }}
                onOpenBankData={() => setIsBankModalOpen(true)}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-slate-400">Selecione um ticket para iniciar o chat</p>
              </div>
            )}
          </div>

          {/* COLUNA 3: Cliente + Histórico (Direita) */}
          <div className="w-[340px] bg-slate-50 border-l border-slate-200 flex flex-col gap-4 p-4 overflow-y-auto">
            {selectedTicket ? (
              <>
                <ClienteInfoSection
                  clienteName={selectedTicket.clienteName}
                  clienteId={clienteId}
                  contractName={selectedTicket.contractName}
                  ticketDescription={selectedTicket.description}
                  registrationNumber={selectedTicket.clienteRegistration}
                  position={selectedTicket.clientePosition}
                  birthDate={selectedTicket.clienteBirthDate}
                  motherName={selectedTicket.clienteMother}
                  status={selectedTicket.clienteStatus}
                  associationDate={selectedTicket.ClienteAssociationDate}
                  terminationDate={selectedTicket.ClienteTerminationDate}
                />
                <HistoricoSection ticketId={selectedTicketId!} />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-slate-400">Selecione um ticket</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedTicketId && (
        <DeclarationPreviewModal
          ticketId={selectedTicketId}
          open={isDeclarationOpen}
          onOpenChange={setIsDeclarationOpen}
          channel="whatsapp"
        />
      )}

      {isBankModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <CreditCard className="text-emerald-500" size={20} />
                Dados Bancários
              </h3>
              <button
                onClick={() => setIsBankModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {!selectedTicket?.clienteId ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-sm font-semibold text-slate-500 italic">Não é um Cliente cadastrado</p>
                  <p className="text-xs text-slate-400">Vincule este ticket a um Cliente para gerenciar dados bancários.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Banco (Código - Nome)</label>
                      {bankDataQuery.isLoading && (
                        <span className="text-[10px] text-indigo-500 animate-pulse font-bold">Carregando...</span>
                      )}
                    </div>
                    {isEditingBankData ? (
                      <div className="grid grid-cols-4 gap-2">
                        <input
                          placeholder="Cod"
                          className="text-sm h-10 px-3 rounded-md border border-slate-200"
                          value={bankFormData.bankCode}
                          onChange={(e) => setBankFormData({ ...bankFormData, bankCode: e.target.value })}
                        />
                        <input
                          placeholder={bankFormData.bankName ? "Nome do Banco" : "dado não cadastrado"}
                          className="col-span-3 text-sm h-10 px-3 rounded-md border border-slate-200"
                          value={bankFormData.bankName}
                          onChange={(e) => setBankFormData({ ...bankFormData, bankName: e.target.value })}
                        />
                      </div>
                    ) : (
                      <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-md text-sm text-slate-700 font-medium">
                        {bankFormData.bankCode || "dado não cadastrado"} - {bankFormData.bankName || "dado não cadastrado"}
                      </div>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Tipo de Conta</label>
                    {isEditingBankData ? (
                      <select
                        className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20"
                        value={bankFormData.accountType}
                        onChange={(e) => setBankFormData({ ...bankFormData, accountType: e.target.value as any })}
                      >
                        <option value="corrente">Conta Corrente</option>
                        <option value="salario">Conta Salário</option>
                        <option value="poupanca">Conta Poupança</option>
                      </select>
                    ) : (
                      <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-md text-sm text-slate-700 font-medium capitalize">
                        {bankFormData.accountType || "dado não cadastrado"}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Agência</label>
                    {isEditingBankData ? (
                      <input
                        placeholder="dado não cadastrado"
                        className="text-sm h-10 px-3 rounded-md border border-slate-200"
                        value={bankFormData.agency}
                        onChange={(e) => setBankFormData({ ...bankFormData, agency: e.target.value })}
                      />
                    ) : (
                      <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-md text-sm text-slate-700 font-medium">
                        {bankFormData.agency || "dado não cadastrado"}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Número da Conta/Dígito</label>
                    {isEditingBankData ? (
                      <div className="flex gap-1">
                        <input
                          placeholder="dado não cadastrado"
                          className="text-sm h-10 px-3 rounded-md border border-slate-200 flex-1"
                          value={bankFormData.accountNumber}
                          onChange={(e) => setBankFormData({ ...bankFormData, accountNumber: e.target.value })}
                        />
                        <input
                          placeholder="D"
                          className="w-12 text-sm h-10 px-2 rounded-md border border-slate-200 text-center uppercase"
                          maxLength={1}
                          value={bankFormData.accountDigit}
                          onChange={(e) => setBankFormData({ ...bankFormData, accountDigit: e.target.value })}
                        />
                      </div>
                    ) : (
                      <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-md text-sm text-slate-700 font-medium">
                        {bankFormData.accountNumber || "dado não cadastrado"}
                        {bankFormData.accountDigit ? `-${bankFormData.accountDigit}` : ""}
                      </div>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Chave PIX (Opcional)</label>
                    {isEditingBankData ? (
                      <input
                        placeholder="dado não cadastrado"
                        className="text-sm h-10 px-3 rounded-md border border-slate-200 italic w-full"
                        value={bankFormData.pixKey}
                        onChange={(e) => setBankFormData({ ...bankFormData, pixKey: e.target.value })}
                      />
                    ) : (
                      <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-md text-sm text-slate-700 font-medium italic">
                        {bankFormData.pixKey || "dado não cadastrado"}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between items-center">
              {selectedTicket?.clienteId && (
                <button
                  onClick={handleShareBankData}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-200/50 uppercase tracking-wider"
                  title="Compartilhar no Chat"
                >
                  Enviar p/ Chat
                </button>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setIsBankModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider"
                >
                  Fechar
                </button>

                {selectedTicket?.clienteId && (
                  <>
                    {isEditingBankData ? (
                      <button
                        onClick={() => {
                          if (!selectedTicket?.clienteId) return;
                          upsertBankData.mutate({
                            clienteId: selectedTicket.clienteId as any,
                            ...bankFormData,
                          } as any);
                        }}
                        disabled={upsertBankData.isPending}
                        className="px-6 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-200/50 uppercase tracking-wider disabled:opacity-50"
                      >
                        {upsertBankData.isPending ? "Salvando..." : "Salvar"}
                      </button>
                    ) : (
                      currentUser?.role &&
                      ["admin", "SuperAdmin", "gerente"].includes(currentUser.role) && (
                        <button
                          onClick={() => setIsEditingBankData(true)}
                          className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-200/50 uppercase tracking-wider"
                        >
                          Editar
                        </button>
                      )
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}



