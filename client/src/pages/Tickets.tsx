import React, { useEffect, useMemo, useState, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useTheme } from "@/components/theme-provider";
import { TicketReportModal } from "@/components/TicketReportModal";
import { DeclarationPreviewModal } from "@/components/DeclarationPreviewModal";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TicketReasonSelector } from "@/components/TicketReasonSelector";
import { TicketCriticitySelector } from "@/components/TicketCriticitySelector";
import { TicketTypeSelector } from "@/components/TicketTypeSelector";
import { TicketFilter, TicketFilters } from "@/components/TicketFilter";
import { WhatsAppPanel } from "@/components/WhatsAppPanel";
import { ClienteInfoSection } from "@/components/ClienteInfoSection";
import { AttendanceReasonsChart } from "@/components/AttendanceReasonsChart";
import { CSATStatsChart } from "@/components/CSATStatsChart";
import { AudioPlayer } from "@/components/AudioPlayer";
import { TicketListView } from "@/components/TicketListView";
import { TicketsStatusKanban } from "@/components/TicketsStatusKanban";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import EmojiPicker, { Theme } from "emoji-picker-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  MessageSquare,
  List,
  Kanban,
  Moon,
  Sun,
  Search,
  Filter,
  MoreVertical,
  Clock,
  ChevronDown,
  Paperclip,
  Mic,
  Send,
  LayoutDashboard,
  User,
  UserPlus,
  UserX,
  History,
  CreditCard,
  X,
  XCircle,
  Smartphone,
  Zap,
  FileText,
  FileSpreadsheet,
  Receipt,
  MessageCircle,
  Trash,
  CheckSquare,
  Square,
  Check,
  Sparkles,
  Plus,
  Mail,
  MapPin,
  Fingerprint,
  Calendar,
  Building,
  Heart,
  Download,
  Lock,
  RotateCcw,
  Smile,
  ImagePlus,
  GitMerge,
  Trash2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Função para formatar o ID do WhatsApp (extrair dígitos e aplicar máscara)
function formatWhatsAppId(id?: string | null) {
  if (!id) return "";
  // Se contiver @lid ou @c.us, extrair apenas a parte numérica
  const digits = id.split('@')[0].replace(/\D/g, "");
  
  if (digits.length >= 12 && digits.startsWith("55")) {
    // Formato com DDI: 5585996297500 -> (85) 99629-7500
    const ddd = digits.slice(2, 4);
    const first = digits.slice(4, -4);
    const last = digits.slice(-4);
    return `(${ddd}) ${first}-${last}`;
  } else if (digits.length >= 10) {
    // Formato local: 85996297500 -> (85) 99629-7500
    const ddd = digits.slice(0, 2);
    const first = digits.slice(2, -4);
    const last = digits.slice(-4);
    return `(${ddd}) ${first}-${last}`;
  }
  
  return digits || id;
}

type TicketListItem = {
  id: number;
  protocol: string;
  status: string;
  priority: "baixa" | "media" | "alta" | "urgente";
  description?: string | null;
  openedAt: string | Date;
  slaDeadline?: string | Date | null;
  clienteName?: string | null;
  clienteId?: number | null;
  contractName?: string | null;
  reasonId?: number | null;
  channel?: string | null;
  currentDepartmentId?: number | null;
  assignedTo?: number | null;
  statusName?: string | null;
  statusColor?: string | null;
  statusSla?: number | null;
  statusStartedAt?: string | Date | null;
  departmentName?: string | null;
  externalIdentifier?: string | null;
  externalName?: string | null;
  lastMessageSenderType?: "Cliente" | "atendente" | "sistema" | "interno" | null;
  closedAt?: string | Date | null;
  ticketTypeId?: number | null;
  ticketTypeName?: string | null;
  ticketTypeColor?: string | null;
  criticityId?: number | null;
  criticityName?: string | null;
  criticityColor?: string | null;
  clientePosition?: string | null;
  clienteStatus?: string | null;
  coordinatorName?: string | null;
  coordinatorId?: number | null;
  createdAt: string | Date;
  reasonName?: string | null;
  clienteBirthDate?: string | Date | null;
  clienteRegistration?: string | number | null;
  clienteMother?: string | null;
  clienteFather?: string | null;
  clienteDocument?: string | null;
  clienteEmail?: string | null;
  ClientesecondaryPhone?: string | null;
  clienteBirthCity?: string | null;
  clienteBirthState?: string | null;
  Clientestreet?: string | null;
  ClienteAddressNumber?: string | null;
  ClienteNeighborhood?: string | null;
  ClienteComplement?: string | null;
  ClienteCity?: string | null;
  Clientestate?: string | null;
  ClienteZipCode?: string | null;
  ClienteAssociationDate?: string | Date | null;
  ClienteAdmissionDate?: string | Date | null;
  ClienteTerminationDate?: string | Date | null;
  ClienteBankCode?: string | null;
  ClienteBankName?: string | null;
  ClienteAccountType?: string | null;
  ClienteAgency?: string | null;
  ClienteAccountNumber?: string | null;
  ClienteAccountDigit?: string | null;
  ClientePixKey?: string | null;
  clienteWhatsApp?: string | null;
  attendantName?: string | null;
  clientePhonePreferred?: string | null;
  externalNumber?: string | null;
  csatRating?: number | null;
  csatStatus?: string | null;
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

// Função auxiliar para badge de prioridade permanece estática por enquanto
const priorityBadge = (priority?: string) => {
  const p = (priority || "").toLowerCase();
  if (p === "urgente") return "bg-red-50 text-red-700 border-red-200";
  if (p === "alta") return "bg-orange-50 text-orange-700 border-orange-200";
  if (p === "media") return "bg-sky-50 text-sky-700 border-sky-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
};

export default function Tickets() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"Chat" | "Interno">("Chat");
  const [messageDraft, setMessageDraft] = useState("");
  const [selectedInternalUser, setSelectedInternalUser] = useState<number | null>(null);
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const [isHistorySearchOpen, setIsHistorySearchOpen] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [isCooperatorModalOpen, setIsCooperatorModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isNonCooperatorModalOpen, setIsNonCooperatorModalOpen] = useState(false);
  const [isCoordinatorChatOpen, setIsCoordinatorChatOpen] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [elapsed, setElapsed] = useState<string>("-");
  const [isWhatsAppPanelOpen, setIsWhatsAppPanelOpen] = useState(false);
  const [coordinatorMessageDraft, setCoordinatorMessageDraft] = useState("");
  const [isDashboardMode, setIsDashboardMode] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDeclarationModalOpen, setIsDeclarationModalOpen] = useState(false);
  const [reportTicketId, setReportTicketId] = useState<number | null>(null);
  const [isQuickMessagesOpen, setIsQuickMessagesOpen] = useState(false);
  
  // State for Attachment Preview
  const [attachmentPreview, setAttachmentPreview] = useState<{
    filename: string;
    base64: string;
    mime: string;
  } | null>(null);
  const [attachmentCaption, setAttachmentCaption] = useState("");
  
  // States for Merge Modal
  const [mergeSearchTerm, setMergeSearchTerm] = useState("");
  const [selectedMergeId, setSelectedMergeId] = useState<number | null>(null);
  const [isSearchingMerge, setIsSearchingMerge] = useState(false);
  
  // List View States
  const [viewMode, setViewMode] = useState<"kanban" | "list" | "board">("kanban");
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50 });
  const [sortConfig, setSortConfig] = useState<{ field: any, direction: 'asc' | 'desc' }>({ field: 'createdAt', direction: 'desc' });

  const { theme, setTheme } = useTheme();

  // Buscar mensagens rápidas
  const { data: quickMessages } = trpc.quickMessages.list.useQuery();
  const quickMessagesList = quickMessages || [];

  // Estados para Gravação de Áudio
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para Dados Bancários
  const [bankFormData, setBankFormData] = useState({
    bankCode: "",
    bankName: "",
    accountType: "corrente" as "corrente" | "salario" | "poupanca",
    agency: "",
    accountNumber: "",
    accountDigit: "",
    pixKey: "",
  });
  const [isEditingBankData, setIsEditingBankData] = useState(false);
  
  // Reopen Logic
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenJustification, setReopenJustification] = useState("");

  const reopenTicket = trpc.tickets.reopenTicket.useMutation({
    onSuccess: async () => {
      setIsReopenModalOpen(false);
      setReopenJustification("");
      toast.success("Ticket reaberto com sucesso!");
      await refetch();
      await refetchMessages();
    },
    onError: (err) => {
      toast.error(`Erro ao reabrir: ${err.message}`);
    }
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTicket) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Extract parts for preview logic if needed, but we store the full data URL
      const mime = base64.split(",")[0].split(":")[1].split(";")[0];
      
      setAttachmentPreview({
        filename: file.name,
        base64: base64,
        mime: mime
      });
      setAttachmentCaption(""); // Reset caption
    };
    reader.readAsDataURL(file);
    // Limpar o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = "";
  };

  const handleSendAttachment = () => {
    if (!selectedTicket || !attachmentPreview) return;

    const finalMessage = attachmentCaption.trim() 
        ? attachmentCaption.trim() 
        : `[Arquivo: ${attachmentPreview.filename}]`;

    sendMessage.mutate({
      ticketId: selectedTicket.id,
      message: finalMessage,
      mediaUrl: attachmentPreview.base64,
      recipientclienteId: null,
    });
    setAttachmentPreview(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/ogg; codecs=opus" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(",")[1];
          handleSendAudio(base64data);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      alert("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSendAudio = async (base64Data: string) => {
    if (!selectedTicket) return;

    try {
      sendMessage.mutate({
        ticketId: selectedTicket.id,
        message: "[Áudio]",
        mediaUrl: `data:audio/ogg;base64,${base64Data}`,
        recipientclienteId: null,
      });
    } catch (err) {
      console.error("Erro ao enviar áudio:", err);
    }
  };

  const [filters, setFilters] = useState<TicketFilters>({
    status: [],
    dateRange: { 
      type: "today",
      from: new Date(new Date().setHours(0, 0, 0, 0)),
      to: new Date(new Date().setHours(23, 59, 59, 999))
    }
  });

  const toggleDashboardMode = () => {
    if (!isDashboardMode) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`);
      });
      setIsDashboardMode(true);
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      setIsDashboardMode(false);
    }
  };

  const utils = trpc.useContext();
  const hardDeleteMany = trpc.tickets.hardDeleteMany.useMutation({
    onSuccess: async () => {
      await utils.tickets.list.invalidate();
      refetch();
      setIsSelectMode(false);
      setSelectedIds([]);
    },
    onError: (error) => {
      alert(`Erro ao excluir: ${error.message}`);
      console.error("Erro na exclusão:", error);
    }
  });

  const { data: tickets, isLoading, refetch } = trpc.tickets.list.useQuery({
    status: filters.status.length > 0 ? filters.status : undefined,
    dateFrom: filters.dateRange.from,
    dateTo: filters.dateRange.to,
    clienteId: filters.clienteId || undefined,
    reasonId: filters.reasonId || undefined,
    search: searchTerm.trim() || undefined,
    page: viewMode === "list" ? pagination.page : undefined,
    pageSize: viewMode === "list" ? pagination.pageSize : undefined,
    orderByField: sortConfig.field,
    orderDirection: sortConfig.direction,
  }, {
    placeholderData: (previousData: any) => previousData,
    refetchOnWindowFocus: false,
    refetchInterval: 4000,
    refetchIntervalInBackground: true,
  });
  const reasonsQuery = trpc.attendanceReasons.list.useQuery();
  const ticketList: TicketListItem[] = (tickets as TicketListItem[]) || [];

  const filteredTickets = useMemo(() => {
    // Agora que o servidor filtra por status, data, Cliente e motivo,
    // e também pelo termo de busca (searchTerm), filteredTickets é apenas o retorno da query.
    // Mantemos o useMemo apenas para garantir estabilidade e se houver algum refinamento local extra.
    return ticketList;
  }, [ticketList]);

  useEffect(() => {
    if (!selectedId && filteredTickets.length > 0) {
      setSelectedId(filteredTickets[0].id);
    }
  }, [filteredTickets, selectedId]);

  useEffect(() => {
    // Bug fix: Somente resetar mini chat se trocar de ticket realmente
    setCoordinatorMessageDraft("");
    setIsCoordinatorChatOpen(false);
  }, [selectedId]);

  const selectedTicket = filteredTickets.find((t) => t.id === selectedId) || filteredTickets[0];
  const hasTickets = filteredTickets.length > 0;

  const { data: messages, refetch: refetchMessages } = trpc.tickets.messages.list.useQuery(
    selectedTicket ? { ticketId: selectedTicket.id, recipientclienteId: null } : (null as any),
    { enabled: !!selectedTicket, refetchInterval: 5000, refetchIntervalInBackground: true }
  );

  const { data: realBankData, refetch: refetchBankData, isLoading: isBankDataLoading } = trpc.clientes.bankData.get.useQuery(
    { clienteId: selectedTicket?.clienteId || 0 },
    { enabled: !!selectedTicket?.clienteId && isBankModalOpen }
  );

  const { data: internalMessages, refetch: refetchInternal } = trpc.internalChat.getMessagesByTicket.useQuery(
    selectedTicket ? { ticketId: selectedTicket.id } : (null as any),
    { enabled: !!selectedTicket, refetchInterval: 5000 }
  );

  const { data: deptUsers } = trpc.internalChat.getUsersByDepartment.useQuery();
  const { data: currentUser } = trpc.users.me.useQuery();

  useEffect(() => {
    const ticket = selectedTicket;
    const opened = ticket ? new Date(ticket.openedAt) : null;
    const isClosed = ticket?.status === "atendimento_fechado";
    const closedAt = isClosed && ticket?.closedAt ? new Date(ticket.closedAt) : null;

    const compute = () => {
      if (!opened) {
        setElapsed("-");
        return;
      }
      // Se fechado, usa a data de fechamento. Se aberto, usa agora.
      const end = closedAt ?? new Date();
      
      const diff = Math.max(0, end.getTime() - opened.getTime());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const pad = (v: number) => v.toString().padStart(2, "0");
      setElapsed(`${pad(h)}:${pad(m)}:${pad(s)}`);
    };

    compute();
    
    // Se estiver fechado, não inicia o intervalo
    if (isClosed) return;

    const id = setInterval(compute, 1000);
    return () => {
      clearInterval(id);
    };
  }, [selectedTicket]);

  useEffect(() => {
    // Resetar modo edição ao fechar ou trocar
    if (!isBankModalOpen) setIsEditingBankData(false);

    // Sincronizar dados bancários ao trocar de ticket ou carregar dados reais
    if (!isBankDataLoading) {
      if (realBankData) {
        setBankFormData({
          bankCode: realBankData.bankCode || "",
          bankName: realBankData.bankName || "",
          accountType: (realBankData.accountType as any) || "corrente",
          agency: realBankData.agency || "",
          accountNumber: realBankData.accountNumber || "",
          accountDigit: realBankData.accountDigit || "",
          pixKey: realBankData.pixKey || "",
        });
      } else if (selectedTicket && !realBankData && !isBankDataLoading) {
        setBankFormData({
          bankCode: selectedTicket.ClienteBankCode || "",
          bankName: selectedTicket.ClienteBankName || "",
          accountType: (selectedTicket.ClienteAccountType as any) || "corrente",
          agency: selectedTicket.ClienteAgency || "",
          accountNumber: selectedTicket.ClienteAccountNumber || "",
          accountDigit: selectedTicket.ClienteAccountDigit || "",
          pixKey: selectedTicket.ClientePixKey || "",
        });
      }
    }
  }, [selectedId, selectedTicket, realBankData, isBankModalOpen, isBankDataLoading]);

  const closeTicketMutation = trpc.tickets.closeTicket.useMutation({
    onSuccess: async () => {
      await refetch();
      await refetchMessages();
    },
  });

  const claimTicket = trpc.tickets.claimTicket.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const sendMessage = trpc.tickets.messages.create.useMutation({
    onSuccess: async () => {
      setMessageDraft("");
      await refetchMessages();
      await refetch();
    },
    onError: (err) => {
      toast.error(`Erro ao enviar mensagem: ${err.message}`);
    }
  });

  const updateDetails = trpc.tickets.updateDetails.useMutation({
    onSuccess: async () => {
      await refetch();
    },
  });

  const startInternalConversation = trpc.internalChat.getOrCreateConversation.useMutation();
  const sendInternalMessageMut = trpc.internalChat.sendMessage.useMutation({
    onSuccess: () => {
      setMessageDraft("");
      refetchInternal();
    }
  });

  const startProcess = trpc.processes.createFromTicket.useMutation({
    onSuccess: () => {
      toast.success("Processo iniciado com sucesso!");
    },
    onError: (err) => {
      toast.error(`Erro ao iniciar processo: ${err.message}`);
    }
  });

  const upsertBankData = trpc.clientes.bankData.upsert.useMutation({
    onSuccess: () => {
      setIsBankModalOpen(false);
      refetch();
      refetchBankData();
    },
    onError: (err) => {
      alert(`Erro ao salvar dados bancários: ${err.message}`);
    }
  });

  const { data: mergeResults, refetch: searchMerge } = trpc.clientes.list.useQuery(
    { search: mergeSearchTerm, pageSize: 5 },
    { enabled: false }
  );

  const updateclienteId = trpc.tickets.updateclienteId.useMutation({
    onSuccess: async () => {
      toast.success("Ticket vinculado com sucesso!");
      setIsMergeModalOpen(false);
      setMergeSearchTerm("");
      setSelectedMergeId(null);
      await refetch();
    },
    onError: (err) => {
      toast.error(`Erro ao vincular: ${err.message}`);
    }
  });

  const handleMergeSearch = async () => {
    if (!mergeSearchTerm.trim()) return;
    setIsSearchingMerge(true);
    await searchMerge();
    setIsSearchingMerge(false);
  };

  const handleShareBankData = () => {
    if (!selectedTicket || !bankFormData.bankName) {
      alert("Não há dados bancários completos para compartilhar.");
      return;
    }

    const message = `🏦 *DADOS BANCÁRIOS*

*Banco:* ${bankFormData.bankCode || 'dado não cadastrado'} - ${bankFormData.bankName || 'dado não cadastrado'}
*Tipo:* ${bankFormData.accountType || 'dado não cadastrado'}
*Agência:* ${bankFormData.agency || 'dado não cadastrado'}
*Conta/Dígito:* ${bankFormData.accountNumber || 'dado não cadastrado'}${bankFormData.accountDigit ? `-${bankFormData.accountDigit}` : ''}
*Chave PIX:* ${bankFormData.pixKey || 'dado não cadastrado'}

Por favor, confirme se os dados acima estão corretos?`;

    sendMessage.mutate({
      ticketId: selectedTicket.id,
      message,
    });
    
    setIsBankModalOpen(false);
  };

  const handleSend = async () => {
    if (!selectedTicket || !messageDraft.trim()) return;

    if (activeTab === "Chat") {
      sendMessage.mutate({
        ticketId: selectedTicket.id,
        message: messageDraft.trim(),
      });
    } else if (activeTab === "Interno") {
      if (!selectedInternalUser) {
        alert("Selecione um destinatário interno para enviar a mensagem.");
        return;
      }

      try {
        const { conversationId } = await startInternalConversation.mutateAsync({
          otherUserId: selectedInternalUser,
          ticketId: selectedTicket.id
        });

        await sendInternalMessageMut.mutateAsync({
          conversationId,
          message: messageDraft.trim(),
        });
      } catch (err: any) {
        alert(`Erro ao enviar mensagem interna: ${err.message}`);
      }
    }
  };

  const { data: contactHistory } = trpc.tickets.listByContact.useQuery(
    selectedTicket ? { 
      clienteId: selectedTicket.clienteId,
      externalIdentifier: selectedTicket.externalIdentifier,
      externalNumber: (selectedTicket as any).externalNumber
    } : (null as any),
    { enabled: !!selectedTicket }
  );

  const { data: attendanceStats, isLoading: isStatsLoading } = trpc.tickets.getAttendanceStats.useQuery(
    selectedTicket ? { 
      clienteId: selectedTicket.clienteId,
      externalIdentifier: selectedTicket.externalIdentifier,
      externalNumber: (selectedTicket as any).externalNumber
    } : (null as any),
    { enabled: !!selectedTicket }
  );

  const { data: csatStats, isLoading: isCsatLoading } = trpc.tickets.getCsatStats.useQuery(
    selectedTicket ? { 
      clienteId: selectedTicket.clienteId,
      externalIdentifier: selectedTicket.externalIdentifier,
      externalNumber: (selectedTicket as any).externalNumber
    } : (null as any),
    { enabled: !!selectedTicket }
  );

  const historyItems = useMemo(() => {
    if (!contactHistory) return [];
    
    return contactHistory.map((h) => ({
      id: h.id,
      protocol: h.protocol,
      date: formatDate(h.openedAt),
      closedDate: h.closedAt ? formatDate(h.closedAt) : "Em aberto",
      reason: h.reasonName || "Não informado",
      attendant: h.attendantName || "Não atribuído",
    }));
  }, [contactHistory]);


  // Helper para calcular duração fixa de tickets fechados
  const getFixedDuration = (ticket: TicketListItem) => {
    if (ticket.status !== "atendimento_fechado" || !ticket.closedAt || !ticket.openedAt) return null;
    const start = new Date(ticket.openedAt);
    const end = new Date(ticket.closedAt);
    const diff = Math.max(0, end.getTime() - start.getTime());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const pad = (v: number) => v.toString().padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const getCoordinatorUser = trpc.clientes.getCoordinatorUser.useQuery(
    { clienteId: selectedTicket?.coordinatorId || null },
    { enabled: !!selectedTicket?.coordinatorId }
  );

  const handleCoordinatorChat = async () => {
    if (!selectedTicket?.coordinatorId) {
      alert("Este contrato não possui um coordenador vinculado.");
      return;
    }
    setIsCoordinatorChatOpen(true);
  };

  // Buscar mensagens do coordenador no mini chat
  const { data: coordinatorMessages, refetch: refetchCoordinatorMessages } = trpc.tickets.messages.list.useQuery(
    { 
      ticketId: selectedTicket?.id || 0, 
      recipientclienteId: selectedTicket?.coordinatorId || null 
    },
    { enabled: !!selectedTicket?.id && isCoordinatorChatOpen && !!selectedTicket?.coordinatorId, refetchInterval: 5000 }
  );

  const sendCoordinatorMessage = trpc.tickets.messages.create.useMutation({
    onSuccess: () => {
      setCoordinatorMessageDraft("");
      refetchCoordinatorMessages();
    }
  });

  const handleSendCoordinator = () => {
    if (!coordinatorMessageDraft.trim() || !selectedTicket?.id || !selectedTicket?.coordinatorId) return;

    sendCoordinatorMessage.mutate({
      ticketId: selectedTicket.id,
      message: coordinatorMessageDraft.trim(),
      recipientclienteId: selectedTicket.coordinatorId
    });
  };

  // List View Handlers
  const handleSort = (field: string) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredTickets.length && filteredTickets.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTickets.map(t => t.id));
    }
  };

  const handleViewHistory = (ticket: any) => {
    setSelectedId(ticket.id);
    setIsHistorySearchOpen(true);
  };

  const handleViewCliente = (ticket: any) => {
    setSelectedId(ticket.id);
    setIsCooperatorModalOpen(true);
  };

  // Helper function to prepare export data
  const prepareExportData = () => {
    const headers = ["Protocolo", "Status", "Cliente", "Contrato", "Motivo", "Telefone", "Data Criação", "Hora Criação", "Data Fechamento", "Hora Fechamento", "Atendente", "SLA (segundos)", "CSAT"];
    const rows = filteredTickets.map(t => {
      const createdDate = new Date(t.createdAt);
      const slaSeconds = t.closedAt 
        ? Math.floor((new Date(t.closedAt).getTime() - new Date(t.createdAt).getTime()) / 1000)
        : null;
      
      const rawPhone = (t.clientePhonePreferred || t.externalNumber || t.externalIdentifier || "").replace('@c.us', '').replace(/\D/g, '');
      const formattedPhone = rawPhone || "-";
      
      const closedDateObj = t.closedAt ? new Date(t.closedAt) : null;
      
      return [
        t.protocol,
        t.statusName || t.status,
        t.clienteName || t.externalName || "Desconhecido",
        t.contractName || "-",
        t.reasonName || "-",
        formattedPhone,
        createdDate.toLocaleDateString("pt-BR"),
        createdDate.toLocaleTimeString("pt-BR"),
        closedDateObj ? closedDateObj.toLocaleDateString("pt-BR") : "-",
        closedDateObj ? closedDateObj.toLocaleTimeString("pt-BR") : "-",
        t.attendantName || "Não atribuído",
        slaSeconds !== null ? slaSeconds.toString() : "-",
        t.csatRating ? (t.csatRating === 3 ? "Ótimo" : t.csatRating === 2 ? "Bom" : "Ruim") : "Sem resposta"
      ];
    });
    return { headers, rows };
  };

  return (
    <Layout>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans overflow-hidden">
        {/* Sidebar ícones */}
        <div className="w-16 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col items-center py-6 gap-6 shadow-sm z-10 hidden sm:flex">
          <div className="flex flex-col gap-4 mt-2">
            <button 
              className={cn(
                "p-2 rounded-lg transition-colors border", 
                viewMode === "kanban" 
                  ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50" 
                  : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border-transparent"
              )}
              title="Modo de Atendimento"
              onClick={() => setViewMode("kanban")}
            >
              <MessageSquare size={20} />
            </button>
            <button 
              className={cn(
                "p-2 rounded-lg transition-colors border", 
                viewMode === "list" 
                  ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50" 
                  : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border-transparent"
              )}
              title="Lista de Tickets"
              onClick={() => setViewMode("list")}
            >
              <List size={20} />
            </button>
            <button 
              className={cn(
                "p-2 rounded-lg transition-colors border", 
                viewMode === "board" 
                  ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50" 
                  : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border-transparent"
              )}
              title="Kanban de Atendimento"
              onClick={() => setViewMode("board")}
            >
              <Kanban size={20} />
            </button>
{/* 
            <button 
              className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" 
              title="WhatsApp"
              onClick={() => setIsWhatsAppPanelOpen(true)}
            >
              <MessageCircle size={20} />
            </button>
            */}
          </div>
          <div className="mt-auto flex flex-col gap-4">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className={cn("flex flex-1 flex-col md:flex-row overflow-hidden transition-all duration-300", isDashboardMode && "fixed inset-0 z-50 bg-slate-50")}>
          {viewMode === "list" ? (
             <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900">
               <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-slate-900 shrink-0">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Lista de Tickets</h2>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-0.5 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700">
                      {filteredTickets.length} registros
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                     {/* Dashboard Mode Toggle */}
                     <Button
                       variant={isDashboardMode ? "default" : "outline"}
                       size="sm"
                       onClick={() => toggleDashboardMode()}
                       className="gap-2"
                     >
                       <LayoutDashboard className="w-4 h-4" />
                       {isDashboardMode ? "Sair Dashboard" : "Modo Dashboard"}
                     </Button>

                     {/* Dark Mode Toggle */}
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                       className="w-9 h-9 p-0"
                     >
                       {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                     </Button>

                     <TicketFilter filters={filters} onFilterChange={setFilters} />
                  </div>
               </div>
               {/* Bulk Action Toolbar */}
               {selectedIds.length > 0 && (
                 <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-indigo-50 dark:bg-indigo-900/20 shrink-0">
                   <div className="flex items-center gap-2 text-sm text-indigo-700 dark:text-indigo-300">
                     <CheckSquare className="w-4 h-4" />
                     <span className="font-medium">{selectedIds.length} ticket(s) selecionado(s)</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <Button 
                       variant="ghost" 
                       size="sm"
                       onClick={() => setSelectedIds([])}
                       className="text-slate-600 dark:text-slate-400"
                     >
                       Cancelar
                     </Button>
                     <Button 
                       variant="destructive" 
                       size="sm"
                       onClick={() => {
                         if (confirm(`Deseja realmente excluir ${selectedIds.length} ticket(s)?`)) {
                           // TODO: Implement bulk delete mutation
                           toast.error("Função de exclusão em massa ainda não implementada");
                         }
                       }}
                       className="gap-2"
                     >
                       <Trash className="w-4 h-4" />
                       Excluir Selecionados
                     </Button>
                   </div>
                 </div>
               )}
               <div className="flex-1 overflow-hidden p-6">
                  <TicketListView 
                     tickets={filteredTickets} 
                     isLoading={isLoading}
                     onOpenChat={(ticket) => {
                       setSelectedId(ticket.id);
                       setViewMode("kanban");
                     }}
                     onViewHistory={handleViewHistory} 
                     onViewCliente={handleViewCliente}
                     pagination={{
                       page: pagination.page,
                       pageSize: pagination.pageSize,
                       total: 0, 
                       onPageChange: (p) => setPagination(prev => ({ ...prev, page: p })),
                       onPageSizeChange: (s) => setPagination(prev => ({ ...prev, pageSize: s, page: 1 })),
                     }}
                     sortConfig={sortConfig}
                     onSort={handleSort}
                     selectedIds={selectedIds}
                     onSelect={handleSelect}
                     onSelectAll={handleSelectAll}
                  />
               </div>
             </div>
          ) : viewMode === "board" ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900">
              <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Kanban de Atendimento</h2>
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-0.5 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700">
                    {filteredTickets.length} tickets
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Busca rápida (mesma do Modo Atendimento) */}
                  <div className="relative hidden md:block">
                    <Search size={18} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar..."
                      className="pl-8 h-9 w-48"
                    />
                  </div>

                  {/* Dashboard Mode Toggle */}
                  <Button
                    variant={isDashboardMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDashboardMode()}
                    className="gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    {isDashboardMode ? "Sair Dashboard" : "Modo Dashboard"}
                  </Button>

                  {/* Export Dropdown (reuso do mesmo export da página) */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <FileText className="w-4 h-4" />
                        Exportar
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start gap-2"
                          onClick={() => {
                            const { headers, rows } = prepareExportData();
                            const csvContent = [headers, ...rows]
                              .map((row) => row.map((cell) => `"${cell}"`).join(","))
                              .join("\n");
                            const blob = new Blob(["\uFEFF" + csvContent], {
                              type: "text/csv;charset=utf-8;",
                            });
                            const link = document.createElement("a");
                            link.href = URL.createObjectURL(blob);
                            link.download = `tickets_${new Date().toISOString().split("T")[0]}.csv`;
                            link.click();
                            toast.success("CSV exportado com sucesso!");
                          }}
                        >
                          <FileText className="w-4 h-4" />
                          Exportar CSV
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start gap-2"
                          onClick={() => {
                            const { headers, rows } = prepareExportData();
                            const xlsContent = `
                              <html xmlns:x="urn:schemas-microsoft-com:office:excel">
                                <head>
                                  <meta charset="UTF-8">
                                  <xml>
                                    <x:ExcelWorkbook>
                                      <x:ExcelWorksheets>
                                        <x:ExcelWorksheet>
                                          <x:Name>Tickets</x:Name>
                                          <x:WorksheetOptions>
                                            <x:DisplayGridlines/>
                                          </x:WorksheetOptions>
                                        </x:ExcelWorksheet>
                                      </x:ExcelWorksheets>
                                    </x:ExcelWorkbook>
                                  </xml>
                                </head>
                                <body>
                                  <table border="1">
                                    <tr>${headers
                                      .map(
                                        (h) =>
                                          `<th style=\"background-color: #4F46E5; color: white; font-weight: bold;\">${h}</th>`
                                      )
                                      .join("")}</tr>
                                    ${rows
                                      .map(
                                        (row) =>
                                          `<tr>${row
                                            .map((cell, idx) => {
                                              if ((idx === 5 || idx === 11) && cell !== "-") {
                                                return `<td style=\"mso-number-format:'0';\">${cell}</td>`;
                                              }
                                              return `<td>${cell}</td>`;
                                            })
                                            .join("")}</tr>`
                                      )
                                      .join("")}
                                  </table>
                                </body>
                              </html>
                            `;
                            const blob = new Blob([xlsContent], {
                              type: "application/vnd.ms-excel",
                            });
                            const link = document.createElement("a");
                            link.href = URL.createObjectURL(blob);
                            link.download = `tickets_${new Date().toISOString().split("T")[0]}.xls`;
                            link.click();
                            toast.success("XLS exportado com sucesso!");
                          }}
                        >
                          <FileSpreadsheet className="w-4 h-4 text-green-600" />
                          Exportar XLS
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Dark Mode Toggle */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="w-9 h-9 p-0"
                    title="Alternar Tema"
                  >
                    {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </Button>

                  <TicketFilter filters={filters} onFilterChange={setFilters} />
                </div>
              </div>

              <TicketsStatusKanban
                tickets={filteredTickets}
                onOpenChat={(ticket) => {
                  setSelectedId(ticket.id);
                  setViewMode("kanban");
                }}
                onViewHistory={handleViewHistory}
                onViewCliente={handleViewCliente}
              />
            </div>
          ) : (
            <>
          {/* Lista de tickets */}
          <div className="w-full md:w-[380px] lg:w-[420px] bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col z-0 shadow-lg md:shadow-none">
            <div className="h-16 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 bg-white dark:bg-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-200">Tickets</span>
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                  Total ({filteredTickets.length})
                </span>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search size={18} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar..."
                    className="pl-8 h-9 w-40"
                  />
                </div>
                {isSelectMode ? (
                  <>
                    <button 
                      onClick={() => {
                        if (!window.confirm(`Tem certeza que deseja excluir ${selectedIds.length} tickets definitivamente?`)) return;
                        hardDeleteMany.mutate({ ids: selectedIds });
                      }}
                      disabled={selectedIds.length === 0}
                      className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-full transition-colors disabled:opacity-50" 
                      title="Excluir Selecionados"
                    >
                      <Trash size={18} />
                    </button>
                    <button 
                      onClick={() => { setIsSelectMode(false); setSelectedIds([]); }}
                      className="p-2 hover:bg-slate-100 rounded-full text-slate-500" 
                      title="Cancelar Seleção"
                    >
                      <X size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => setIsSelectMode(true)}
                      className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-indigo-600" 
                      title="Selecionar Tickets"
                    >
                      <CheckSquare size={18} />
                    </button>
                    <TicketFilter filters={filters} onFilterChange={setFilters} />
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
              {isLoading ? (
                <p className="text-sm text-slate-500">Carregando...</p>
              ) : filteredTickets.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum ticket encontrado</p>
              ) : (
                filteredTickets.map((ticket, idx) => (
                  <div
                    key={ticket.id ?? ticket.protocol ?? `ticket-list-${idx}`}
                    onClick={() => !isSelectMode && setSelectedId(ticket.id)}
      className={cn(
                      "group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99]",
                      selectedTicket?.id === ticket.id
                        ? "bg-white dark:bg-slate-800 border-indigo-500 ring-1 ring-indigo-500 shadow-sm"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700"
                    )}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        {isSelectMode && (
                          <div 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setSelectedIds(prev => 
                                prev.includes(ticket.id) ? prev.filter(i => i !== ticket.id) : [...prev, ticket.id]
                              );
                            }}
                            className="text-slate-400 hover:text-indigo-600"
                          >
                            {selectedIds.includes(ticket.id) ? (
                              <CheckSquare size={16} className="text-indigo-600" />
                            ) : (
                              <Square size={16} />
                            )}
                          </div>
                        )}
                        <span className="text-xs font-bold text-indigo-600">#{ticket.protocol}</span>
                        {ticket.channel === 'whatsapp' && (
                          <MessageCircle size={14} className="text-green-500 fill-green-500/10" />
                        )}
                        {ticket.channel === 'email' && (
                          <Mail size={14} className="text-blue-500 fill-blue-500/10" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {ticket.csatRating && (
                          <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded-full border border-slate-200 flex items-center gap-1 shadow-sm" title={`Avaliação: ${ticket.csatRating === 3 ? 'Excelente' : ticket.csatRating === 2 ? 'Bom' : 'Ruim'}`}>
                            <span>{ticket.csatRating === 3 ? "🤩" : ticket.csatRating === 2 ? "🙂" : "😡"}</span>
                            <span className={cn(
                              ticket.csatRating === 3 ? "text-green-600" : ticket.csatRating === 2 ? "text-amber-600" : "text-red-600"
                            )}>
                              {ticket.csatRating === 3 ? 'Excelente' : ticket.csatRating === 2 ? 'Bom' : 'Ruim'}
                            </span>
                          </span>
                        )}
                        {ticket.csatStatus === "expired" && (
                           <span className="text-xs text-slate-300 cursor-help" title="Pesquisa expirada (sem resposta)">⏳</span>
                        )}
                        <span
                          className="px-2 py-0.5 rounded-full text-[9px] uppercase font-bold border"
                          style={{ 
                            backgroundColor: ticket.statusColor || "#f1f5f9",
                            color: ticket.statusColor ? "#fff" : "#475569",
                            borderColor: ticket.statusColor ? "transparent" : "#cbd5e1"
                          }}
                        >
                          {ticket.status === "em_espera" && ticket.departmentName 
                            ? `Em Espera + ${ticket.departmentName}` 
                            : ticket.statusName || ticket.status.replace(/_/g, " ")}
                        </span>
                        
                      </div>
                    </div>
                    <div className="mb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-sm text-slate-800 dark:text-slate-200 line-clamp-1">
                          {ticket.clienteName || formatWhatsAppId((ticket as any).externalNumber || ticket.externalIdentifier) || "Não Cliente"}
                        </div>
                        
                        {/* Botão Puxar Atendimento */}
                        {ticket.status === "em_espera" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              claimTicket.mutate({ id: ticket.id });
                            }}
                            title="Puxar para mim"
                          >
                            <Plus size={14} />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center text-[11px] text-slate-400 font-medium mt-0.5 overflow-hidden">
                        <span className="truncate flex items-center gap-1.5">
                          {ticket.clienteId ? (
                            <>
                              <span>{ticket.contractName || "Contrato não informado"}</span>
                              {ticket.clientePosition && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span>{ticket.clientePosition}</span>
                                </>
                              )}
                              {ticket.clienteStatus && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className={cn(
                                    "font-medium lowercase first-letter:uppercase",
                                    ticket.clienteStatus === 'ativo' ? "text-blue-500" : "text-red-500"
                                  )}>
                                    {ticket.clienteStatus}
                                  </span>
                                </>
                              )}
                            </>
                          ) : (
                             ticket.externalName || "Não Cliente"
                          )}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      <TicketReasonSelector ticket={ticket} />
                      <TicketTypeSelector ticket={ticket} />
                      <TicketCriticitySelector ticket={ticket} />
                    </div>

                    <div className="flex items-end justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        <Clock size={12} />
                        <span>{formatDate(ticket.openedAt)}</span>
                        {selectedTicket && selectedTicket.id === ticket.id ? (
                          <span className="text-indigo-600 font-bold ml-2">{elapsed}</span>
                        ) : ticket.status === "atendimento_fechado" ? (
                          <span className="text-slate-500 font-medium ml-2">{getFixedDuration(ticket)}</span>
                        ) : null}
        </div>
        <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          {ticket.status !== "atendimento_fechado" && (
                            <span className="relative flex h-2 w-2">
                              {ticket.lastMessageSenderType === "Cliente" ? (
                                <>
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                                </>
                              ) : (
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600" />
                              )}
                            </span>
                          )}
                          
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-slate-400 hover:text-slate-600 p-1">
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Workspace */}
          <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 h-full overflow-hidden relative">
            {/* Top Bar */}
            <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    {selectedTicket?.channel === 'whatsapp' && <MessageCircle size={20} className="text-green-500 fill-green-500/10" />}
                    {selectedTicket?.channel === 'email' && <Mail size={20} className="text-blue-500 fill-blue-500/10" />}
                    Ticket {selectedTicket ? `#${selectedTicket.protocol}` : "--"}
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border"
                      style={{ 
                        backgroundColor: selectedTicket?.statusColor || "#f1f5f9",
                        color: selectedTicket?.statusColor ? "#fff" : "#475569",
                        borderColor: selectedTicket?.statusColor ? "transparent" : "#cbd5e1"
                      }}
                    >
                      {selectedTicket?.statusName || selectedTicket?.status.replace(/_/g, " ")}
                    </span>
                    {selectedTicket?.csatRating && (
                       <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-slate-200 shadow-sm ml-2">
                         <span>{selectedTicket.csatRating === 3 ? "🤩" : selectedTicket.csatRating === 2 ? "🙂" : "😡"}</span>
                         <span className={cn(
                            "font-bold",
                            selectedTicket.csatRating === 3 ? "text-green-600" : selectedTicket.csatRating === 2 ? "text-amber-600" : "text-red-600"
                          )}>
                            {selectedTicket.csatRating === 3 ? 'Excelente' : selectedTicket.csatRating === 2 ? 'Bom' : 'Ruim'}
                          </span>
                       </span>
                    )}
                    {selectedTicket?.csatStatus === 'expired' && (
                       <span className="text-xs bg-slate-50 px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-slate-200 text-slate-400 ml-2 italic">
                         <span>😶</span> Sem Resposta
                       </span>
                    )}
                  </h1>
                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="font-semibold">{selectedTicket?.clienteName || formatWhatsAppId((selectedTicket as any)?.externalNumber || selectedTicket?.externalIdentifier) || "Cliente não informado"}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span>{(selectedTicket?.description || "Sem contrato").replace(/Atendimento via WhatsApp \(QR\):.*/, "Atendimento via WhatsApp (QR)")}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                 <button
                   onClick={() => {
                     if (selectedTicket) {
                       if (window.confirm("Deseja iniciar um processo administrativo para este ticket?")) {
                         startProcess.mutate({ ticketId: selectedTicket.id });
                       }
                     }
                   }}
                   disabled={!selectedTicket || startProcess.isPending}
                   className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
                   title="Iniciar Processo"
                 >
                   <GitMerge className="w-4 h-4" />
                   <span className="hidden sm:inline">Iniciar Processo</span>
                 </button>

                 <button
                   onClick={() => {
                     if (selectedTicket) {
                       setReportTicketId(selectedTicket.id);
                       setIsReportModalOpen(true);
                     }
                   }}
                   disabled={!selectedTicket}
                   className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                   title="Gerar Relatório"
                 >
                   <span className="hidden sm:inline">Relatório</span>
                 </button>

                 {/* Export Dropdown */}
                 <Popover>
                   <PopoverTrigger asChild>
                     <Button variant="outline" size="sm" className="gap-2">
                       <FileText className="w-4 h-4" />
                       Exportar
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-48 p-2">
                     <div className="flex flex-col gap-1">
                       <Button
                         variant="ghost"
                         size="sm"
                         className="justify-start gap-2"
                         onClick={() => {
                            const { headers, rows } = prepareExportData();
                            const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
                            const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
                            const link = document.createElement("a");
                            link.href = URL.createObjectURL(blob);
                            link.download = `tickets_${new Date().toISOString().split('T')[0]}.csv`;
                            link.click();
                            toast.success("CSV exportado com sucesso!");
                          }}
                        >
                          <FileText className="w-4 h-4" />
                          Exportar CSV
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start gap-2"
                          onClick={() => {
                            // Enhanced XLS format with proper cell types
                            const { headers, rows } = prepareExportData();
                            const xlsContent = `
                              <html xmlns:x="urn:schemas-microsoft-com:office:excel">
                                <head>
                                  <meta charset="UTF-8">
                                  <xml>
                                    <x:ExcelWorkbook>
                                      <x:ExcelWorksheets>
                                        <x:ExcelWorksheet>
                                          <x:Name>Tickets</x:Name>
                                          <x:WorksheetOptions>
                                            <x:DisplayGridlines/>
                                          </x:WorksheetOptions>
                                        </x:ExcelWorksheet>
                                      </x:ExcelWorksheets>
                                    </x:ExcelWorkbook>
                                  </xml>
                                </head>
                                <body>
                                  <table border="1">
                                    <tr>${headers.map(h => `<th style="background-color: #4F46E5; color: white; font-weight: bold;">${h}</th>`).join('')}</tr>
                                    ${rows.map(row => `<tr>${row.map((cell, idx) => {
                                      if ((idx === 5 || idx === 11) && cell !== "-") {
                                        return `<td style="mso-number-format:'0';">${cell}</td>`;
                                      }
                                      return `<td>${cell}</td>`;
                                    }).join('')}</tr>`).join('')}
                                  </table>
                                </body>
                              </html>
                            `;
                            const blob = new Blob([xlsContent], { type: "application/vnd.ms-excel" });
                            const link = document.createElement("a");
                            link.href = URL.createObjectURL(blob);
                            link.download = `tickets_${new Date().toISOString().split('T')[0]}.xls`;
                            link.click();
                            toast.success("XLS exportado com sucesso!");
                          }}
                        >
                          <FileSpreadsheet className="w-4 h-4 text-green-600" />
                           Exportar XLS
                        </Button>
                     </div>
                   </PopoverContent>
                 </Popover>

                 <button
                   onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                   className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                   title="Alternar Tema"
                 >
                   {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                 </button>
                 <button
                   onClick={toggleDashboardMode}
                   className={cn(
                     "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                     isDashboardMode
                       ? "text-white bg-indigo-600 hover:bg-indigo-700"
                       : "text-slate-600 bg-slate-100 hover:bg-slate-200"
                   )}
                 >
                   <LayoutDashboard size={16} />
                   <span className="hidden sm:inline">{isDashboardMode ? "Voltar" : "Modo Dashboard"}</span>
                 </button>
              </div>
            </header>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 relative">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
                {/* Chat */}
                <div className="xl:col-span-2 flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden h-[600px] xl:h-auto order-1 xl:order-1">
                  <div className="flex border-b border-slate-200 dark:border-slate-700">
                    {["Chat", "Interno"].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={cn(
                          "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                          activeTab === tab
                            ? "border-indigo-600 text-indigo-600 bg-indigo-50/50"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        {tab}
                        {tab === "Interno" && internalMessages && internalMessages.length > 0 && (
                          <span className="ml-2 bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                            {internalMessages.length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/30 dark:bg-slate-900/30">
                    <div className="flex justify-center">
                      <span className="text-xs bg-slate-200 text-slate-500 px-3 py-1 rounded-full flex items-center gap-2">
                        {selectedTicket ? formatDate(selectedTicket.openedAt).split(",")[0] : ""}
                        {selectedTicket ? <span className="text-indigo-600 font-semibold">{elapsed}</span> : null}
                      </span>
                    </div>

                    {activeTab === "Chat" ? (
                      (messages as TicketMessage[] | undefined)?.map((msg) => {
                        const isOut = msg.senderType !== "Cliente";
                        return (
                          <div key={msg.id} className={cn("flex flex-col", isOut ? "items-end" : "items-start")}>
                            <div className="flex items-end gap-2 max-w-[80%]">
                              {!isOut && (
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">
                                  C
                                </div>
                              )}
                              <div
                                className={cn(
                                  "px-4 py-3 rounded-2xl shadow-sm text-sm",
                                  isOut
                                    ? "bg-indigo-600 text-white rounded-br-none"
                                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-bl-none"
                                )}
                              >
                                  <div className={cn("text-[10px] font-bold mb-1", isOut ? "text-indigo-200" : "text-slate-400")}>
                                    {isOut ? "Atendente" : "Cliente"}
                                  </div>
                                  {msg.mediaUrl ? (
                                    <>
                                      {/* Áudio */}
                                      {(msg.mediaUrl.includes('.ogg') || msg.mediaUrl.includes('.mp3') || msg.mediaUrl.includes('.wav') || msg.mediaUrl.includes('.m4a') || msg.mediaUrl.includes('data:audio')) ? (
                                        <AudioPlayer url={msg.mediaUrl} isOut={isOut} />
                                      ) : (
                                        <div className="space-y-2">
                                          {/* Imagem */}
                                          {(msg.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) || msg.mediaUrl.includes('data:image')) ? (
                                            <div className="rounded-lg overflow-hidden border border-slate-100 bg-slate-50 max-w-[200px]">
                                              <img
                                                src={msg.mediaUrl}
                                                alt="Mídia"
                                                className="w-full h-auto cursor-zoom-in hover:opacity-95 transition-opacity object-contain max-h-[200px]"
                                                onClick={() => setZoomImage(msg.mediaUrl!)}
                                              />
                                            </div>
                                          ) : (
                                            /* Documento / Arquivo Genérico */
                                            <div
                                              className={cn(
                                                "flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-opacity-80 transition-all",
                                                isOut ? "bg-indigo-700/50 border-indigo-400/30" : "bg-slate-50 border-slate-200"
                                              )}
                                              onClick={() => window.open(msg.mediaUrl!, '_blank')}
                                            >
                                              <div className={cn("p-2 rounded-lg", isOut ? "bg-indigo-500" : "bg-indigo-100")}>
                                                <FileText size={20} className={isOut ? "text-white" : "text-indigo-600"} />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className={cn("text-xs font-bold truncate", isOut ? "text-white" : "text-slate-700")}>
                                                  {msg.message.replace(/\[Arquivo: |\]/g, '') || 'Documento'}
                                                </p>
                                                <p className={cn("text-[10px]", isOut ? "text-indigo-200" : "text-slate-400")}>Clique para baixar/abrir</p>
                                              </div>
                                            </div>
                                          )}
                                          {/* Legenda opcional se houver texto além do marcador de arquivo */}
                                          {msg.message && !msg.message.startsWith('[Arquivo:') && !msg.message.match(/^\[(Imagem|Áudio|Vídeo|PDF|Mídia)\]$/) && (
                                            <p className="whitespace-pre-wrap">{msg.message}</p>
                                          )}
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <p className="whitespace-pre-wrap">{msg.message}</p>
                                  )}
                                  <div className={cn("text-[10px] mt-1 text-right", isOut ? "text-indigo-200" : "text-slate-400")}>
                                  {formatDate(msg.createdAt).split(" ")[1]?.slice(0, 5)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="space-y-6">
                        {/* Selector Interno */}
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-amber-200 dark:border-amber-900/30 shadow-sm mb-4">
                          <label className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase mb-2 block">Destinatário Interno</label>
                          <Select
                            value={selectedInternalUser?.toString()}
                            onValueChange={(val) => setSelectedInternalUser(Number(val))}
                          >
                            <SelectTrigger className="w-full h-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                              <SelectValue placeholder="Selecione um atendente..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {deptUsers?.map((dept) => (
                                <SelectGroup key={dept.id}>
                                  <SelectLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-950/50">{dept.name}</SelectLabel>
                                  {dept.users.map((u) => {
                                    const isManager = u.isDepartmentManager || u.isManager;
                                    return (
                                      <SelectItem
                                        key={u.id}
                                        value={u.id.toString()}
                                        className={cn(
                                          "cursor-pointer",
                                          isManager && "font-bold"
                                        )}
                                      >
                                        <span className="flex items-center gap-2">
                                          <span className={cn(isManager && "text-amber-600 dark:text-amber-500")}>
                                            {u.name} <span className="text-slate-400 dark:text-slate-500 font-normal"> - {u.position}</span>
                                          </span>
                                          {isManager && (
                                            <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-500 px-1.5 py-0.5 rounded font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                              ⭐ GESTOR
                                            </span>
                                          )}
                                        </span>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectGroup>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {internalMessages?.map((msg) => {
                          const isMine = msg.senderId === currentUser?.id;
                          return (
                            <div key={msg.id} className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>
                              <div className="flex items-end gap-2 max-w-[80%]">
                                <div
                                  className={cn(
                                    "px-4 py-3 rounded-2xl shadow-sm text-sm border",
                                    isMine
                                      ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100 rounded-br-none"
                                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-bl-none"
                                  )}
                                >
                                  <div className={cn("text-[10px] font-bold mb-1", isMine ? "text-amber-600 dark:text-amber-400" : "text-amber-600 dark:text-amber-500")}>
                                    {msg.senderName || "Interno"}
                                  </div>
                                  <p className="whitespace-pre-wrap">{msg.message}</p>
                                  <div className="text-[10px] mt-1 text-right text-slate-400 dark:text-slate-500">
                                    {formatDate(msg.createdAt).split(" ")[1]?.slice(0, 5)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {internalMessages?.length === 0 && (
                          <div className="text-center py-10 opacity-50 space-y-2">
                            <History size={40} className="mx-auto text-slate-300" />
                            <p className="text-sm">Nenhuma mensagem interna ainda.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                    {selectedTicket?.status === "atendimento_fechado" ? (
                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center mb-2">
                        <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm flex items-center justify-center gap-2">
                          <Lock size={16} /> Este ticket está fechado. O envio de mensagens está desabilitado.
                        </p>
                      </div>
                    ) : (
                      <>
                    {isRecording ? (
                      <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl p-3 mb-2 animate-pulse">
                        <div className="flex items-center gap-3 text-red-600">
                          <div className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
                          <span className="text-sm font-bold">Gravando Áudio... {formatRecordingTime(recordingTime)}</span>
                        </div>
                        <div className="flex gap-2">
                           <button
                             onClick={() => { setIsRecording(false); if(timerRef.current) clearInterval(timerRef.current); }}
                             className="p-1 px-3 text-xs bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"
                           >
                             Cancelar
                           </button>
                           <button
                             onClick={stopRecording}
                             className="p-1 px-3 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700"
                           >
                             Parar e Enviar
                           </button>
                        </div>
                      </div>
                    ) : null}
                     <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                        title="Anexar arquivo"
                      >
                        <Paperclip size={20} />
                      </button>
                      <button
                        onClick={startRecording}
                        disabled={isRecording}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          isRecording ? "text-red-500 bg-red-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                        )}
                        title="Gravar áudio"
                      >
                        <Mic size={20} />
                      </button>

                       <Popover>
                         <PopoverTrigger asChild>
                           <button
                             className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                             title="Emoticons e Figurinhas"
                           >
                             <Smile size={20} />
                           </button>
                         </PopoverTrigger>
                         <PopoverContent className="w-[350px] p-0 border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden" side="top" align="start" sideOffset={12}>
                           <Tabs defaultValue="emojis" className="w-full">
                             <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                               <TabsTrigger value="emojis" className="rounded-none data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">Emojis</TabsTrigger>
                               <TabsTrigger value="figurinhas" className="rounded-none data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">Figurinhas</TabsTrigger>
                             </TabsList>
                             
                             <TabsContent value="emojis" className="p-0 m-0">
                               <EmojiPicker
                                 onEmojiClick={(emojiData) => {
                                   const textarea = document.querySelector('textarea[placeholder*="Responder"]') as HTMLTextAreaElement;
                                   if (textarea) {
                                     const start = textarea.selectionStart;
                                     const end = textarea.selectionEnd;
                                     const text = messageDraft;
                                     const before = text.substring(0, start);
                                     const after = text.substring(end, text.length);
                                     setMessageDraft(before + emojiData.emoji + after);
                                     
                                     // Reset selection after state update
                                     setTimeout(() => {
                                       textarea.focus();
                                       textarea.setSelectionRange(start + emojiData.emoji.length, start + emojiData.emoji.length);
                                     }, 0);
                                   } else {
                                     setMessageDraft(prev => prev + emojiData.emoji);
                                   }
                                 }}
                                 theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                                 autoFocusSearch={false}
                                 searchPlaceholder="Pesquisar emoji..."
                                 previewConfig={{ showPreview: false }}
                                 skinTonesDisabled
                                 height={350}
                                 width="100%"
                               />
                             </TabsContent>
                             
                             <TabsContent value="figurinhas" className="p-0 m-0">
                               <StickersTab 
                                 ticketId={selectedTicket?.id} 
                                 onSelect={(url) => {
                                   if (selectedTicket) {
                                     sendMessage.mutate({
                                       ticketId: selectedTicket.id,
                                       message: "Figurinha",
                                       mediaUrl: url
                                     });
                                   }
                                 }}
                               />
                             </TabsContent>
                           </Tabs>
                         </PopoverContent>
                       </Popover>
                      <Textarea
                        value={messageDraft}
                        onChange={(e) => setMessageDraft(e.target.value)}
                        placeholder={activeTab === "Chat" ? "Responder Cliente (WhatsApp/e-mail)..." : "Mensagem Interna Privada..."}
                        className="flex-1 bg-transparent border-none resize-none focus-visible:ring-0 text-sm py-2 max-h-32 min-h-[44px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        rows={1}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                      />
                      <button
                        onClick={handleSend}
                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-2 px-4"
                      >
                        <span className="font-semibold text-sm">Enviar</span>
                        <Send size={16} />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-slate-100">
                      <button className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-lg transition-colors" title="Demonstrativo Pagamento">
                        <Receipt size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (selectedTicket) {
                            if (!selectedTicket.clienteId) {
                              toast.error("Declaração não pode ser feita para pessoas que não são cooperadas");
                            } else {
                              setIsDeclarationModalOpen(true);
                            }
                          }
                        }}
                        className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-colors"
                        title="Declaração"
                      >
                        <FileText size={18} />
                      </button>
                      <Popover open={isQuickMessagesOpen} onOpenChange={setIsQuickMessagesOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-100 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                            title="Resposta Rápida"
                          >
                            <Zap size={18} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0 shadow-xl border-slate-200" align="start" side="top" sideOffset={8}>
                          <Command>
                            <CommandInput placeholder="Buscar mensagem rápida..." />
                            <CommandList>
                              <CommandEmpty>Nenhuma mensagem encontrada.</CommandEmpty>
                              <CommandGroup heading="Mensagens Disponíveis">
                                {quickMessagesList
                                  .filter(m => m.category === "MENSAGEM" || !m.category?.startsWith("BOT-"))
                                  .map((msg) => (
                                  <CommandItem
                                    key={msg.id}
                                    onSelect={() => {
                                      if (selectedTicket) {
                                        sendMessage.mutate({
                                          ticketId: selectedTicket.id,
                                          message: msg.content,
                                        });
                                      }
                                      setIsQuickMessagesOpen(false);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-semibold text-xs">{msg.title}</span>
                                      <span className="text-[10px] text-slate-500 line-clamp-1">{msg.content}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <button className="p-2 bg-violet-50 hover:bg-violet-100 text-violet-600 border border-violet-100 rounded-lg transition-colors" title="Ativar APP">
                        <Smartphone size={18} />
                      </button>
                      <button
                        onClick={() => setIsBankModalOpen(true)}
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-lg transition-colors"
                        title="Dados Bancários"
                      >
                        <CreditCard size={18} />
                      </button>

                      <div className="flex-1 min-w-[20px]" />
                      
                      {selectedTicket?.status === "atendimento_fechado" ? (
                         (currentUser?.role === 'SuperAdmin') && (
                           <button
                             onClick={() => setIsReopenModalOpen(true)}
                             className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-lg transition-colors"
                           >
                             <RotateCcw size={14} />
                             <span className="font-semibold">Reabrir Ticket</span>
                           </button>
                         )
                      ) : (
                        <button
                          onClick={() => selectedTicket && closeTicketMutation.mutate({ ticketId: selectedTicket.id })}
                          className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg transition-colors"
                          disabled={closeTicketMutation.isPending}
                        >
                          <XCircle size={14} />
                          <span className="font-semibold">
                            {closeTicketMutation.isPending ? "Fechando..." : "Fechar Ticket"}
                          </span>
                        </button>
                      )}
                    </div>
                  </>
                  )}
                 </div>
                </div>

                {/* Painel lateral */}
                <div className="xl:col-span-1 flex flex-col gap-6 order-2 xl:order-2">
                  {/* Cliente / Contrato */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                      <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <User size={16} className="text-indigo-500" /> Cliente / Contrato
                      </h3>
                      <div className="text-right">
                        <label className="text-xs font-semibold text-slate-400 uppercase">Coordenador</label>
                        <div
                          className="flex items-center justify-end gap-1.5 cursor-pointer group mt-0.5"
                          onClick={handleCoordinatorChat}
                          title={selectedTicket?.coordinatorName ? `Falar com ${selectedTicket.coordinatorName}` : "Nenhum coordenador vinculado"}
                        >
                          <p className="text-xs text-slate-700 group-hover:text-indigo-600 transition-colors">
                            {selectedTicket?.coordinatorName || "Não informado"}
                          </p>
                          {/* 
                          <div className="bg-emerald-100 text-emerald-600 p-1 rounded-full hover:bg-emerald-200 transition-colors">
                            <MessageCircle size={12} fill="currentColor" />
                          </div>
                          */}
                        </div>
                      </div>
                    </div>

                    <div className="p-5">
                      <ClienteInfoSection
                        clienteName={selectedTicket?.clienteName}
                        clienteId={selectedTicket?.clienteId}
                        contractName={selectedTicket?.contractName}
                        registrationNumber={selectedTicket?.clienteRegistration}
                        position={selectedTicket?.clientePosition}
                        birthDate={selectedTicket?.clienteBirthDate}
                        motherName={selectedTicket?.clienteMother}
                        status={selectedTicket?.clienteStatus}
                        associationDate={selectedTicket?.ClienteAssociationDate}
                        terminationDate={selectedTicket?.ClienteTerminationDate}
                        hideContainer={true}
                      />

                      <div className="mt-6 grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => setIsCooperatorModalOpen(true)}
                            className="col-span-2 px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                          >
                            Ver Cliente
                          </Button>
                          <Button
                            onClick={() => setIsMergeModalOpen(true)}
                            disabled={!!selectedTicket?.clienteId}
                            className={cn(
                              "flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium border rounded-lg transition-colors",
                              selectedTicket?.clienteId
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                            )}
                          >
                            <UserPlus size={14} /> Mesclar
                          </Button>
                          <Button
                            onClick={() => setIsNonCooperatorModalOpen(true)}
                            disabled={!!selectedTicket?.clienteId}
                            className={cn(
                              "flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium border rounded-lg transition-colors",
                              selectedTicket?.clienteId
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            )}
                          >
                            <UserX size={14} /> Não Coop.
                          </Button>
                      </div>
                    </div>
                  </div>

                  {/* Gráfico de Motivos */}
                  <AttendanceReasonsChart
                    data={attendanceStats || []}
                    isLoading={isStatsLoading}
                  />

                  {/* Gráfico de CSAT */}
                  <CSATStatsChart
                    data={csatStats || []}
                    isLoading={isCsatLoading}
                  />

                  {/* Histórico */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex-1 flex flex-col min-h-[250px]">
                    <div className="px-5 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                      <h3 className="font-semibold text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <History size={14} className="text-slate-400 dark:text-slate-500" /> Histórico
                      </h3>
                      <button
                        onClick={() => setIsHistorySearchOpen(!isHistorySearchOpen)}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          isHistorySearchOpen ? "bg-indigo-100 text-indigo-600" : "hover:bg-slate-200 text-slate-400"
                        )}
                      >
                        <Search size={14} />
                      </button>
                    </div>

                    {isHistorySearchOpen && (
                      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                        <Input
                          type="text"
                          placeholder="Buscar por data, motivo..."
                          value={historySearchQuery}
                          onChange={(e) => setHistorySearchQuery(e.target.value)}
                          className="w-full text-xs px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                      </div>
                    )}

                    <div className="flex-1 overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Ticket / Data</th>
                            <th className="px-4 py-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Motivo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {historyItems
                            .filter((h) => {
                              const q = historySearchQuery.trim().toLowerCase();
                              if (!q) return true;
                              return (
                                h.protocol.toLowerCase().includes(q) ||
                                h.reason.toLowerCase().includes(q) ||
                                h.date.toLowerCase().includes(q) ||
                                h.attendant.toLowerCase().includes(q)
                              );
                            })
                            .map((log) => (
                              <tr
                                key={log.id}
                                className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 cursor-pointer transition-colors group"
                                onClick={() => {
                                  setReportTicketId(log.id);
                                  setIsReportModalOpen(true);
                                }}
                              >
                                <td className="px-4 py-3">
                                  <div className="font-bold text-xs text-indigo-600 dark:text-indigo-400">#{log.protocol}</div>
                                  <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                    {log.date}{log.closedDate !== "Em aberto" ? ` / ${log.closedDate}` : " (Em aberto)"}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{log.reason}</div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <User size={10} /> {log.attendant}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          {historyItems.length === 0 && (
                            <tr>
                              <td colSpan={2} className="px-4 py-8 text-center text-xs text-slate-400 italic">
                                Nenhum histórico encontrado.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
            </>
          )}
        </div>

        {/* Modal Dados Bancários */}
        {isBankModalOpen && (
          <div className="absolute inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <CreditCard className="text-emerald-500" size={20} />
                  Dados Bancários
                </h3>
                <button onClick={() => setIsBankModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {!selectedTicket?.clienteId ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                      <UserX size={32} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-semibold text-slate-500 italic">Não é um Cliente cadastrado</p>
                    <p className="text-xs text-slate-400">Vincule este ticket a um Cliente para gerenciar dados bancários.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <div className="flex justify-between items-center mb-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">Banco (Código - Nome)</Label>
                        {isBankDataLoading && <span className="text-[10px] text-indigo-500 animate-pulse font-bold">Carregando...</span>}
                      </div>

                      {isEditingBankData ? (
                        <div className="grid grid-cols-4 gap-2">
                          <Input
                            placeholder="Cod"
                            className="text-sm h-10"
                            value={bankFormData.bankCode}
                            onChange={(e) => setBankFormData({ ...bankFormData, bankCode: e.target.value })}
                          />
                          <Input
                            placeholder={bankFormData.bankName ? "Nome do Banco" : "dado não cadastrado"}
                            className="col-span-3 text-sm h-10"
                            value={bankFormData.bankName}
                            onChange={(e) => setBankFormData({ ...bankFormData, bankName: e.target.value })}
                          />
                        </div>
                      ) : (
                        <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-md text-sm text-slate-700 font-medium">
                          {bankFormData.bankCode || 'dado não cadastrado'} - {bankFormData.bankName || 'dado não cadastrado'}
                        </div>
                      )}
                    </div>

                    <div className="col-span-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Tipo de Conta</Label>
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
                          {bankFormData.accountType || 'dado não cadastrado'}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Agência</Label>
                      {isEditingBankData ? (
                        <Input
                          placeholder="dado não cadastrado"
                          className="text-sm h-10"
                          value={bankFormData.agency}
                          onChange={(e) => setBankFormData({ ...bankFormData, agency: e.target.value })}
                        />
                      ) : (
                        <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-md text-sm text-slate-700 font-medium">
                          {bankFormData.agency || 'dado não cadastrado'}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Número da Conta/Dígito</Label>
                      {isEditingBankData ? (
                        <div className="flex gap-1">
                          <Input
                            placeholder="dado não cadastrado"
                            className="text-sm h-10"
                            value={bankFormData.accountNumber}
                            onChange={(e) => setBankFormData({ ...bankFormData, accountNumber: e.target.value })}
                          />
                          <Input
                            placeholder="D"
                            className="w-12 text-sm h-10 text-center uppercase"
                            maxLength={1}
                            value={bankFormData.accountDigit}
                            onChange={(e) => setBankFormData({ ...bankFormData, accountDigit: e.target.value })}
                          />
                        </div>
                      ) : (
                        <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-md text-sm text-slate-700 font-medium">
                          {bankFormData.accountNumber || 'dado não cadastrado'}{bankFormData.accountDigit ? `-${bankFormData.accountDigit}` : ''}
                        </div>
                      )}
                    </div>

                    <div className="col-span-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Chave PIX (Opcional)</Label>
                      {isEditingBankData ? (
                        <Input
                          placeholder="dado não cadastrado"
                          className="text-sm h-10 italic"
                          value={bankFormData.pixKey}
                          onChange={(e) => setBankFormData({ ...bankFormData, pixKey: e.target.value })}
                        />
                      ) : (
                        <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-md text-sm text-slate-700 font-medium italic">
                          {bankFormData.pixKey || 'dado não cadastrado'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-3">
                {selectedTicket?.clienteId && (
                  <button
                    onClick={handleShareBankData}
                    className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-all uppercase tracking-wider"
                    title="Compartilhar no Chat"
                  >
                    <Send size={14} />
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
                          onClick={() => upsertBankData.mutate({
                            clienteId: selectedTicket.clienteId!,
                            ...bankFormData
                          })}
                          disabled={upsertBankData.isPending}
                          className="px-6 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-200/50 uppercase tracking-wider disabled:opacity-50"
                        >
                          {upsertBankData.isPending ? "Salvando..." : "Salvar"}
                        </button>
                      ) : (
                         // Botão Editar visível apenas para Admin, SuperAdmin e Gerente
                         (currentUser?.role && ['admin', 'SuperAdmin', 'gerente'].includes(currentUser.role)) && (
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

        {/* Modal Detalhes do Cliente */}
        {isCooperatorModalOpen && (
          <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 p-2.5 rounded-xl">
                    <User className="text-indigo-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-slate-900 leading-tight">
                      Ficha Cadastral do Cliente
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Consulta completa de dados do Cliente</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCooperatorModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Conteúdo com Scroll */}
              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                
                {/* Seção 1: Informações Pessoais e Funcionais */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"></div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Informações Pessoais e Funcionais</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    <div className="md:col-span-2">
                       <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nome Completo</label>
                       <p className="text-lg font-bold text-slate-900">{selectedTicket?.clienteName || "---"}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Status</label>
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase",
                        selectedTicket?.clienteStatus === 'ativo' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      )}>
                        <div className={cn("w-2 h-2 rounded-full animate-pulse", selectedTicket?.clienteStatus === 'ativo' ? "bg-emerald-500" : "bg-rose-500")}></div>
                        {selectedTicket?.clienteStatus || "Inativo"}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 flex items-center gap-1"><Fingerprint size={12}/> CPF / Documento</label>
                      <p className="text-sm font-semibold text-slate-700">{selectedTicket?.clienteDocument || "---"}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 flex items-center gap-1"><Fingerprint size={12}/> Matrícula</label>
                      <p className="text-sm font-semibold text-slate-700">{selectedTicket?.clienteRegistration || "---"}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Cargo</label>
                      <p className="text-sm font-semibold text-slate-700">{selectedTicket?.clientePosition || "---"}</p>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 flex items-center gap-1"><Calendar size={12}/> Data de Nascimento</label>
                      <p className="text-sm font-semibold text-slate-700">
                        {selectedTicket?.clienteBirthDate ? new Date(selectedTicket.clienteBirthDate).toLocaleDateString('pt-BR') : "---"}
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Naturalidade</label>
                      <p className="text-sm font-semibold text-slate-700">
                        {selectedTicket?.clienteBirthCity ? `${selectedTicket.clienteBirthCity} - ${selectedTicket.clienteBirthState || ""}` : "---"}
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 flex items-center gap-1"><Building size={12}/> Contrato Atual</label>
                      <p className="text-sm font-bold text-indigo-600">{selectedTicket?.contractName || "---"}</p>
                    </div>
                  </div>
                </section>

                {/* Seção 2: Filiação e Datas */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"></div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filiação e Histórico na Coleta</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 flex items-center gap-1"><Heart size={12}/> Nome da Mãe</label>
                      <p className="text-sm font-semibold text-slate-700">{selectedTicket?.clienteMother || "---"}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nome do Pai</label>
                      <p className="text-sm font-semibold text-slate-700">{selectedTicket?.clienteFather || "---"}</p>
                    </div>
                    <div className="grid grid-cols-3 col-span-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Data Associação</label>
                        <p className="text-sm font-semibold text-slate-700">
                          {selectedTicket?.ClienteAssociationDate ? new Date(selectedTicket.ClienteAssociationDate).toLocaleDateString('pt-BR') : "---"}
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Data Admissão</label>
                        <p className="text-sm font-semibold text-slate-700">
                          {selectedTicket?.ClienteAdmissionDate ? new Date(selectedTicket.ClienteAdmissionDate).toLocaleDateString('pt-BR') : "---"}
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-rose-400 uppercase block mb-1">Data Desligamento</label>
                        <p className="text-sm font-semibold text-rose-600">
                          {selectedTicket?.ClienteTerminationDate ? new Date(selectedTicket.ClienteTerminationDate).toLocaleDateString('pt-BR') : "---"}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Seção 3: Contato e Localização */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"></div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contato e Localização</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 flex items-center gap-1"><Smartphone size={12}/> WhatsApp / Principal</label>
                       <p className="text-sm font-bold text-indigo-600">{selectedTicket?.clienteWhatsApp || "---"}</p>
                    </div>
                    <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Telefone Secundário</label>
                       <p className="text-sm font-semibold text-slate-700">{selectedTicket?.ClientesecondaryPhone || "---"}</p>
                    </div>
                    <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 flex items-center gap-1"><Mail size={12}/> E-mail</label>
                       <p className="text-sm font-semibold text-slate-700 truncate" title={selectedTicket?.clienteEmail || ""}>{selectedTicket?.clienteEmail || "---"}</p>
                    </div>

                    <div className="md:col-span-3">
                       <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 flex items-center gap-1"><MapPin size={12}/> Endereço Completo</label>
                       <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                          {selectedTicket?.Clientestreet ? (
                            `${selectedTicket.Clientestreet}, ${selectedTicket.ClienteAddressNumber || 'S/N'}${selectedTicket.ClienteComplement ? ` (${selectedTicket.ClienteComplement})` : ''} - ${selectedTicket.ClienteNeighborhood || ''}, ${selectedTicket.ClienteCity || ''} / ${selectedTicket.Clientestate || ''} - CEP: ${selectedTicket.ClienteZipCode || ''}`
                          ) : "---"}
                       </p>
                    </div>
                  </div>
                </section>

                {/* Seção 4: Dados Bancários */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dados Bancários (Conta Ativa)</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-emerald-50/30 p-6 rounded-2xl border border-emerald-100">
                    <div className="md:col-span-2">
                       <label className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Banco</label>
                       <p className="text-sm font-bold text-slate-900">
                         {selectedTicket?.ClienteBankCode ? `${selectedTicket.ClienteBankCode} - ${selectedTicket.ClienteBankName || ""}` : "---"}
                       </p>
                    </div>
                    <div>
                       <label className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Tipo de Conta</label>
                       <p className="text-sm font-semibold text-slate-700 capitalize">{selectedTicket?.ClienteAccountType || "---"}</p>
                    </div>
                    <div>
                       <label className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Agência</label>
                       <p className="text-sm font-semibold text-slate-700">{selectedTicket?.ClienteAgency || "---"}</p>
                    </div>

                    <div>
                       <label className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Número da Conta</label>
                       <p className="text-sm font-bold text-slate-900">
                         {selectedTicket?.ClienteAccountNumber || "---"}
                         {selectedTicket?.ClienteAccountDigit ? `-${selectedTicket.ClienteAccountDigit}` : ""}
                       </p>
                    </div>
                    <div className="md:col-span-3">
                       <label className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Chave PIX</label>
                       <p className="text-sm font-semibold text-slate-700">{selectedTicket?.ClientePixKey || "---"}</p>
                    </div>
                  </div>
                </section>

              </div>

              {/* Footer */}
              <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0">
                <button 
                  onClick={() => setIsCooperatorModalOpen(false)} 
                  className="px-6 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Fechar Consulta
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal Mesclar */}
        {isMergeModalOpen && (
          <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <UserPlus className="text-indigo-600" size={20} /> Vincular Cliente
                </h3>
                <button 
                  onClick={() => {
                    setIsMergeModalOpen(false);
                    setMergeSearchTerm("");
                    setSelectedMergeId(null);
                  }}
                  className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Pesquisar Cliente (Nome ou CPF)</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Nome, CPF ou Matrícula..." 
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        value={mergeSearchTerm}
                        onChange={(e) => setMergeSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleMergeSearch()}
                      />
                    </div>
                    <button 
                      onClick={handleMergeSearch}
                      disabled={isSearchingMerge || !mergeSearchTerm.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                      {isSearchingMerge ? "..." : "Buscar"}
                    </button>
                  </div>
                </div>

                <div className="min-h-[120px] max-h-[240px] overflow-y-auto border border-slate-100 rounded-xl bg-slate-50/30 p-1">
                  {mergeResults && mergeResults.length > 0 ? (
                    <div className="space-y-1">
                      {mergeResults.map((cop) => (
                        <div 
                          key={cop.id}
                          onClick={() => setSelectedMergeId(cop.id)}
                          className={cn(
                            "p-3 rounded-lg cursor-pointer transition-all border",
                            selectedMergeId === cop.id 
                              ? "bg-indigo-50 border-indigo-200 shadow-sm" 
                              : "hover:bg-white border-transparent text-slate-600"
                          )}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className={cn("text-xs font-bold", selectedMergeId === cop.id ? "text-indigo-700" : "text-slate-800")}>
                                {cop.name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium">
                                Doc: {cop.document || "N/A"} • Matrícula: {cop.registrationNumber || "N/A"} • <span className={cn(cop.status === 'ativo' ? "text-emerald-500" : "text-rose-500", "font-bold uppercase")}>{cop.status}</span> • Contrato: <span className="text-indigo-500 font-bold">{(cop as any).contractName || "NENHUM"}</span>
                              </p>
                            </div>
                            {selectedMergeId === cop.id && <Check size={14} className="text-indigo-600 animate-in zoom-in" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : mergeResults ? (
                    <div className="py-10 text-center space-y-2">
                      <p className="text-xs text-slate-400 font-medium italic">Nenhum Cliente encontrado.</p>
                    </div>
                  ) : (
                    <div className="py-10 text-center space-y-2">
                      <p className="text-xs text-slate-400 font-medium">Digite o nome ou CPF acima para iniciar a busca.</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={() => {
                    setIsMergeModalOpen(false);
                    setMergeSearchTerm("");
                    setSelectedMergeId(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => selectedTicket && selectedMergeId && updateclienteId.mutate({ ticketId: selectedTicket.id, clienteId: selectedMergeId })}
                  disabled={!selectedMergeId || updateclienteId.isPending}
                  className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-200/50 uppercase tracking-widest disabled:opacity-50"
                >
                  {updateclienteId.isPending ? "Vinculando..." : "Confirmar Vínculo"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Não Cliente */}
        {isNonCooperatorModalOpen && (
          <div className="absolute inset-0 z-50 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <UserX className="text-slate-500" size={20} /> Cadastrar Não Cliente
                </h3>
                <button onClick={() => setIsNonCooperatorModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs text-slate-500 uppercase">Nome</label>
                  <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase">Número</label>
                  <input
                    type="text"
                    value={selectedTicket?.channel || ""}
                    disabled
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase">Descrição</label>
                  <textarea className="w-full px-3 py-2 border rounded-lg text-sm" rows={3}></textarea>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 rounded-b-xl border-t border-slate-100 flex justify-end gap-3">
                <button onClick={() => setIsNonCooperatorModalOpen(false)} className="px-4 py-2 text-sm text-white bg-slate-700 rounded-lg">
                  Salvar como Não Cliente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mini chat coordenador */}
        {isCoordinatorChatOpen && (
          <div className="absolute bottom-4 right-4 z-50 w-80 bg-white rounded-xl shadow-2xl border border-indigo-200 animate-in slide-in-from-bottom-5 duration-200 flex flex-col overflow-hidden">
            <div className="px-4 py-3 bg-indigo-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                  {selectedTicket?.coordinatorName?.charAt(0) || "C"}
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight">
                    {selectedTicket?.coordinatorName || "Coordenador"}
                  </h4>
                  <span className="text-[10px] opacity-80">WhatsApp Integração</span>
                </div>
              </div>
              <button onClick={() => setIsCoordinatorChatOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="h-64 bg-slate-50 p-4 overflow-y-auto flex flex-col gap-3">
              {coordinatorMessages?.length === 0 && (
                <div className="text-center text-[10px] text-slate-400 mt-10">
                  Nenhuma mensagem trocada com o coordenador neste ticket.
                </div>
              )}
              {coordinatorMessages?.map((msg) => {
                const isOut = msg.senderType === "atendente" || msg.senderType === "sistema";
                return (
                  <div key={msg.id} className={cn("flex", isOut ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[85%] px-3 py-2 rounded-lg text-xs shadow-sm",
                      isOut ? "bg-indigo-600 text-white rounded-br-none" : "bg-white border border-slate-200 text-slate-700 rounded-bl-none"
                    )}>
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                      <div className={cn("text-[9px] mt-1 text-right", isOut ? "text-indigo-200" : "text-slate-400")}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-2 bg-white border-t border-slate-100 flex gap-2">
              <input 
                type="text" 
                placeholder="Digite para o coordenador..." 
                className="flex-1 px-3 py-1.5 text-sm border rounded-full focus:ring-1 focus:ring-indigo-500 outline-none" 
                value={coordinatorMessageDraft}
                onChange={(e) => setCoordinatorMessageDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendCoordinator();
                }}
              />
              <button 
                onClick={handleSendCoordinator}
                disabled={!coordinatorMessageDraft.trim() || sendCoordinatorMessage.isPending}
                className="p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        )}
        </div>

      {/* Painel WhatsApp Embarcado */}
      <WhatsAppPanel
        isOpen={isWhatsAppPanelOpen}
        onClose={() => setIsWhatsAppPanelOpen(false)}
        ticketId={selectedTicket?.id}
        clienteName={selectedTicket?.clienteName}
        clienteId={selectedTicket?.clienteId}
        contractName={selectedTicket?.contractName}
        ticketDescription={selectedTicket?.description}
      />
      <TicketReportModal 
         ticketId={reportTicketId || 0}
         open={isReportModalOpen}
         onOpenChange={setIsReportModalOpen}
      />

        {/* Modal de Zoom de Imagem */}
        <Dialog open={!!zoomImage} onOpenChange={(open) => !open && setZoomImage(null)}>
          <DialogContent className="max-w-none w-fit h-auto p-0 bg-transparent border-none shadow-none flex items-center justify-center overflow-visible">
            {zoomImage && (
              <div className="relative group">
                <img 
                  src={zoomImage} 
                  alt="Zoom" 
                  className="w-auto h-auto max-w-[80vw] max-h-[80vh] rounded-lg shadow-2xl"
                />
                <a
                  href={zoomImage}
                  download={`imagem_chat_${new Date().getTime()}.png`}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute bottom-4 right-4 p-3 bg-white/90 text-slate-800 rounded-full shadow-lg hover:bg-white hover:text-indigo-600 hover:scale-105 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Baixar imagem"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download size={24} />
                </a>
              </div>
            )}
          </DialogContent>
        </Dialog>

       {selectedTicket && (
         <DeclarationPreviewModal
           ticketId={selectedTicket.id}
           open={isDeclarationModalOpen}
           onOpenChange={setIsDeclarationModalOpen}
           channel={selectedTicket.channel || "whatsapp"}
         />
       )}
        {/* Modal De Reabertura */}
        <Dialog open={isReopenModalOpen} onOpenChange={setIsReopenModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
             <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-indigo-600">
                   <RotateCcw size={24} />
                   <h2 className="text-lg font-bold">Reabrir Ticket</h2>
                </div>
                <p className="text-sm text-slate-500">
                   Informe uma justificativa para reabrir este ticket. Esta ação será registrada no histórico.
                </p>
                
                <Textarea 
                   placeholder="Digite a justificativa..."
                   value={reopenJustification}
                   onChange={(e) => setReopenJustification(e.target.value)}
                   className="min-h-[100px]"
                />

                <div className="flex justify-end gap-2 mt-2">
                   <Button variant="outline" onClick={() => setIsReopenModalOpen(false)}>Cancelar</Button>
                   <Button 
                      onClick={() => selectedTicket && reopenTicket.mutate({ ticketId: selectedTicket.id, justification: reopenJustification })}
                      disabled={reopenTicket.isPending || reopenJustification.length < 5}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                   >
                      {reopenTicket.isPending ? "Reabrindo..." : "Confirmar Reabertura"}
                   </Button>
                </div>
             </div>
          </DialogContent>
        </Dialog>
        {/* Modal de Preview de Anexo */}
        <Dialog open={!!attachmentPreview} onOpenChange={(open) => !open && setAttachmentPreview(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <div className="flex flex-col gap-4">
               <div className="flex items-center gap-2 text-indigo-600">
                  <Paperclip size={24} />
                  <h2 className="text-lg font-bold">Enviar Anexo</h2>
               </div>
               
               <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-slate-700 min-h-[150px]">
                 {attachmentPreview?.mime.startsWith("image/") ? (
                    <img 
                      src={attachmentPreview.base64} 
                      alt="Preview" 
                      className="max-h-[300px] max-w-full object-contain rounded-md shadow-sm"
                    />
                 ) : (
                    <div className="flex flex-col items-center text-slate-500">
                       <FileText size={48} className="mb-2" />
                       <span className="font-medium">{attachmentPreview?.filename}</span>
                    </div>
                 )}
               </div>

               <div className="space-y-2">
                 <Label>Adicionar legenda (opcional)</Label>
                 <Input 
                   placeholder="Digite uma mensagem para acompanhar o arquivo..."
                   value={attachmentCaption}
                   onChange={(e) => setAttachmentCaption(e.target.value)}
                   onKeyDown={(e) => {
                     if (e.key === "Enter") handleSendAttachment();
                   }}
                 />
               </div>

               <div className="flex justify-end gap-2 mt-2">
                  <Button variant="outline" onClick={() => setAttachmentPreview(null)}>Cancelar</Button>
                  <Button 
                     onClick={handleSendAttachment}
                     disabled={sendMessage.isPending}
                     className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                  >
                     <Send size={16} />
                     {sendMessage.isPending ? "Enviando..." : "Enviar"}
                  </Button>
               </div>
            </div>
          </DialogContent>
        </Dialog>
    </Layout>
  );
}

// ============================================================================
// STICKERS TAB COMPONENT
// ============================================================================

interface StickersTabProps {
  ticketId?: number;
  onSelect: (url: string) => void;
}

const StickersTab = ({ ticketId, onSelect }: StickersTabProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: stickers, refetch } = trpc.stickers.list.useQuery();
  const uploadSticker = trpc.stickers.upload.useMutation({
    onSuccess: () => {
      toast.success("Figurinha enviada!");
      refetch();
    },
    onError: (err) => {
      toast.error(`Erro ao subir figurinha: ${err.message}`);
    }
  });
  const deleteSticker = trpc.stickers.delete.useMutation({
    onSuccess: () => {
      toast.success("Figurinha removida!");
      refetch();
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande! Máximo 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const base64Content = base64.split(',')[1];
      
      uploadSticker.mutate({
        name: file.name.split('.')[0],
        fileName: file.name,
        fileContent: base64Content,
        contentType: file.type
      });
    };
    reader.readAsDataURL(file);
    
    // Limpar input para permitir subir o mesmo arquivo se deletado
    e.target.value = "";
  };

  return (
    <div className="flex flex-col h-[350px] bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Minhas Figurinhas</span>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadSticker.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg transition-all shadow-sm disabled:opacity-50"
        >
          {uploadSticker.isPending ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Enviando...</span>
            </div>
          ) : (
            <>
              <ImagePlus size={12} />
              <span>Nova Figurinha</span>
            </>
          )}
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileUpload}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {stickers && stickers.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 pb-4">
            {stickers.map((sticker) => (
              <div 
                key={sticker.id} 
                className="group relative aspect-square rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5"
                onClick={() => onSelect(sticker.url)}
              >
                <img 
                  src={sticker.url} 
                  alt={sticker.name} 
                  className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Deseja remover esta figurinha?")) {
                      deleteSticker.mutate({ id: sticker.id });
                    }
                  }}
                  className="absolute top-1.5 right-1.5 p-1.5 bg-white/90 dark:bg-slate-800/90 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 dark:hover:bg-red-900/20 shadow-sm border border-slate-100 dark:border-slate-700"
                  title="Excluir figurinha"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 py-10 opacity-60">
            <div className="bg-slate-100 dark:bg-slate-800 p-5 rounded-full border border-slate-200 dark:border-slate-700">
              <Smile size={40} className="text-slate-300 dark:text-slate-600" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Nenhuma figurinha</p>
              <p className="text-[10px] max-w-[180px] mx-auto leading-relaxed">
                Personalize seu atendimento! Suba imagens PNG ou JPG para usar como figurinhas.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};



