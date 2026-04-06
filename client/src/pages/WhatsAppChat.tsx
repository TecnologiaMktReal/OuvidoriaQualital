import React, { useEffect, useMemo, useState, useRef } from "react";
import { Layout } from "@/components/Layout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Search, 
  Send, 
  Smile, 
  MessageSquare, 
  Zap, 
  Mic, 
  Loader2, 
  XCircle, 
  CheckCircle, 
  Paperclip, 
  Square,
  Settings,
  Plus,
  DollarSign,
  FileText,
  CreditCard,
  CheckCheck,
  ArrowRightLeft,
  Building,
  Maximize2,
  Minimize2,
  Menu,
  Timer,
  X,
  User,
  History,
  LayoutDashboard,
  UserPlus,
  UserX
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const renderTime = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
};

const formatPhone = (digits?: string | null) => {
  if (!digits) return undefined;
  const just = digits.replace(/\\D/g, "");
  if (just.length >= 13) {
    const cc = just.slice(0, 2);
    const ddd = just.slice(2, 4);
    const rest = just.slice(4);
    return `+${cc} (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  }
  if (just.length === 11) {
    return `+55 (${just.slice(0, 2)}) ${just.slice(2, 7)}-${just.slice(7)}`;
  }
  if (just.length === 10) {
    return `+55 (${just.slice(0, 2)}) ${just.slice(2, 6)}-${just.slice(6)}`;
  }
  return `+${just}`;
};

const maskclienteName = (name?: string | null) => {
  if (!name) return undefined;
  const parts = name.trim().split(/\\s+/);
  if (parts.length <= 3) return name.trim();
  return `${parts[0]} ${parts[parts.length - 2]} ${parts[parts.length - 1]}`;
};

const extractPhoneFromDescription = (desc?: string | null) => {
  if (!desc) return undefined;
  const wa = desc.match(/wa_id:(\\d{10,15})/i);
  if (wa) return wa[1];
  const tel = desc.match(/tel:(\\d{10,15})/i);
  return tel ? tel[1] : undefined;
};

const extractDisplayPhone = (desc?: string | null) => {
  if (!desc) return undefined;
  const dp = desc.match(/display:([+\\d\\-\\s\\(\\)]{6,})/i);
  if (dp) return dp[1].replace(/[^\\d]/g, "");
  return undefined;
};

const extractVerifiedName = (desc?: string | null) => {
  if (!desc) return undefined;
  const vn = desc.match(/verified:([^-\\|]+?)(?:-|$)/i);
  return vn ? vn[1].trim() : undefined;
};

const getStatusColor = (status?: string) => {
  const normalized = (status || "").toLowerCase();
  if (normalized.includes("atendimento_fechado") || normalized.includes("ticket_invalido")) {
    return "bg-emerald-500 shadow-emerald-500/50";
  }
  if (normalized.includes("aguardando_atendimento")) return "bg-orange-500 shadow-orange-500/50";
  if (normalized.includes("aguardando_resposta")) return "bg-slate-500 shadow-slate-500/50";
  if (normalized.includes("em_espera")) return "bg-amber-500 shadow-amber-500/50";
  if (normalized.includes("em_atendimento")) return "bg-cyan-500 shadow-cyan-500/50";
  return "bg-slate-500";
};

const getStatusLabel = (status?: string) => {
  const normalized = (status || "").toLowerCase();
  if (normalized.includes("atendimento_fechado") || normalized.includes("ticket_invalido")) return "Fechado";
  if (normalized.includes("aguardando_atendimento")) return "Aguardando Atendimento";
  if (normalized.includes("aguardando_resposta")) return "Aguardando Resposta";
  if (normalized.includes("em_espera")) return "Espera";
  if (normalized.includes("em_atendimento")) return "Em Atendimento";
  return "-";
};

const getReasonColor = (reason?: string) => {
  const r = (reason || "").toLowerCase();
  if (r.includes("financeiro")) return "from-rose-500 to-pink-600";
  if (r.includes("suporte")) return "from-cyan-500 to-blue-600";
  if (r.includes("comercial")) return "from-amber-400 to-orange-500";
  if (r.includes("dúvida") || r.includes("duvida")) return "from-purple-500 to-indigo-600";
  return "from-emerald-400 to-green-600";
};

const DEPARTAMENTOS = ["Financeiro", "Comercial", "Suporte Técnico N2", "Jurídico", "Ouvidoria"];

type Conversation = {
  id: number;
  title: string;
  ticketLine?: string;
  contractName?: string | null;
  phoneLine?: string;
  statusLine?: string;
  displayPhoneLine?: string;
  verifiedLine?: string;
  updatedAt?: string;
  status?: string;
  clienteName?: string | null;
  clienteWhatsApp?: string | null;
  clienteId?: number | null;
  description?: string | null;
  phoneRaw?: string | null;
  phoneFromDesc?: string | null;
  protocol?: string | null;
  displayPhone?: string | null;
  verifiedName?: string | null;
};

export default function WhatsAppChat() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showQuickMessages, setShowQuickMessages] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"abertos" | "fechados" | "todos" | "aguardando">("abertos");
  const [showDebug, setShowDebug] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const appContainerRef = useRef<HTMLDivElement>(null);

  // Tickets como conversas
  const ticketsQuery = trpc.tickets.list.useQuery(
    { onlyOpen: showAll ? undefined : true },
    {
      refetchOnWindowFocus: true,
      refetchInterval: 4000,
      refetchIntervalInBackground: true,
    }
  );

  const quickMessagesQuery = trpc.quickMessages.list.useQuery();

  // Mensagens do ticket selecionado
  const messagesQuery = trpc.tickets.messages.list.useQuery(
    selectedConversation ? { ticketId: selectedConversation.id } : undefined as any,
    { enabled: Boolean(selectedConversation), refetchInterval: 4000, refetchIntervalInBackground: true }
  );

  const sendMessageMutation = trpc.whatsapp.sendMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      messagesQuery.refetch();
      ticketsQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Falha ao enviar mensagem");
    },
  });

  const closeChatMutation = trpc.tickets.closeChat.useMutation({
    onSuccess: () => {
      ticketsQuery.refetch();
      messagesQuery.refetch();
    },
    onError: (error) => toast.error(error.message || "Falha ao encerrar chat"),
  });

  const closeTicketMutation = trpc.tickets.closeTicket.useMutation({
    onSuccess: () => {
      ticketsQuery.refetch();
      messagesQuery.refetch();
    },
    onError: (error) => toast.error(error.message || "Falha ao fechar ticket"),
  });

  const sendMediaMutation = trpc.whatsapp.sendMedia.useMutation({
    onSuccess: () => {
      toast.success("Arquivo enviado");
      messagesQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Falha ao enviar arquivo");
    },
  });

  const handleUploadFile = async (file: File) => {
    if (!selectedConversation) return;
    if (!file) return;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("Arquivo excede 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string)?.split(",")[1];
      if (!base64) {
        toast.error("Falha ao ler arquivo");
        return;
      }
      sendMediaMutation.mutate({
        ticketId: selectedConversation.id,
        mimeType: file.type || "application/octet-stream",
        base64,
        fileName: file.name,
      });
    };
    reader.onerror = () => toast.error("Falha ao ler arquivo");
    reader.readAsDataURL(file);
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      mediaRecorder?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setMediaRecorder(null);
        setAudioChunks([]);
        if (!selectedConversation) return;
        const blob = new Blob(chunks, { type: "audio/ogg" });
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string)?.split(",")[1];
          if (!base64) {
            toast.error("Falha ao processar áudio");
            return;
          }
          sendMediaMutation.mutate({
            ticketId: selectedConversation.id,
            mimeType: "audio/ogg",
            base64,
            fileName: `audio-${Date.now()}.ogg`,
          });
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);
    } catch (error) {
      toast.error("Não foi possível iniciar gravação de áudio");
    }
  };

  const filteredConversations = useMemo(() => {
    const items =
      ticketsQuery.data?.map((t: any) => {
        const rawName = t.clienteName?.trim();
        const masked = maskclienteName(rawName);
        const name = rawName?.startsWith("WhatsApp ") ? undefined : masked;
        const phoneRaw = (t.clientePhonePreferred ?? t.clienteWhatsApp)?.trim();
        const phoneFromDesc = extractPhoneFromDescription(t.description);
        const displayPhoneDesc = extractDisplayPhone(t.description);
        const verifiedNameDesc = extractVerifiedName(t.description);
        const phone = phoneFromDesc || phoneRaw || displayPhoneDesc;
        const phoneFormatted = phone ? formatPhone(phone) : undefined;
        const displayPhoneFormatted = displayPhoneDesc ? formatPhone(displayPhoneDesc) : undefined;
        const contractLabel = t.clienteId
          ? t.contractName || (t.contractId ? `Contrato #${t.contractId}` : "Contrato não informado")
          : "Não Cliente";
        const display = verifiedNameDesc || name || phoneFormatted || (t.protocol ? `Ticket ${t.protocol}` : `Ticket #${t.id}`);
        const ticketLine = t.protocol ? `Nrº${t.protocol}` : "";
        const phoneLine = phoneFormatted ?? "";
        const statusLine = t.status ? `${t.status}` : "";
        const verifiedLine = verifiedNameDesc ? `${verifiedNameDesc}` : "";
        const displayPhoneLine = displayPhoneFormatted ? `${displayPhoneFormatted}` : "";

        return {
          id: t.id,
          title: display,
          ticketLine,
          contractName: contractLabel,
          phoneLine,
          displayPhoneLine,
          verifiedLine,
          statusLine,
          updatedAt: t.updatedAt,
          status: t.status,
          clienteName: name,
          clienteWhatsApp: phoneFormatted ?? phone,
          clienteId: t.clienteId ?? null,
          description: t.description,
          phoneRaw: phoneRaw ?? null,
          phoneFromDesc: phoneFromDesc ?? null,
          protocol: t.protocol ?? null,
          displayPhone: displayPhoneFormatted ?? null,
          verifiedName: verifiedNameDesc ?? null,
        };
      }) ?? [];

    const applyStatus = (c: Conversation) => {
      if (filterStatus === "todos") return true;
      if (filterStatus === "abertos") return c.status !== "atendimento_fechado" && c.status !== "ticket_invalido";
      if (filterStatus === "fechados") return c.status === "atendimento_fechado" || c.status === "ticket_invalido";
      if (filterStatus === "aguardando") return c.status === "em_espera";
      return true;
    };

    let filtered = items.filter(applyStatus);

    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((c) => {
      return (
        c.title.toLowerCase().includes(q) ||
        (c.ticketLine ?? "").toLowerCase().includes(q) ||
        (c.phoneLine ?? "").toLowerCase().includes(q) ||
        (c.clienteWhatsApp ?? "").toLowerCase().includes(q)
      );
    });
    return filtered;
  }, [ticketsQuery.data, searchQuery, filterStatus]);

  useEffect(() => {
    if (!selectedConversation && filteredConversations.length > 0) {
      setSelectedConversation(filteredConversations[0]);
    }
  }, [filteredConversations, selectedConversation]);

  const handleSendMessage = () => {
    if (!selectedConversation) return;
    if (!message.trim()) return;
    if (
      ["atendimento_fechado", "ticket_invalido"].includes(
        selectedConversation.status || ""
      )
    )
      return;
    sendMessageMutation.mutate({ ticketId: selectedConversation.id, message: message.trim() });
  };

  const handleQuickAction = (action: string) => {
    const msgs: Record<string, string> = {
      'declaracao': "Enviando arquivo: Declaração de Vínculo.pdf",
      'demonstrativo': "Enviando arquivo: Demonstrativo_2024.pdf",
      'respostas': "Olá! Como posso ajudar você hoje?",
      'dados': "Nossos dados bancários: Banco XYZ, Ag: 0001, CC: 12345-6"
    };
    if (msgs[action]) {
      setMessage(msgs[action]);
      setTimeout(() => handleSendMessage(), 100);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      appContainerRef.current?.requestFullscreen().catch(err => console.log(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Forçar tema claro ao montar componente
  useEffect(() => {
    // Salvar tema atual
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const previousTheme = sessionStorage.getItem('previousTheme');
    
    // Se já salvamos o tema, não sobrescrever
    if (!previousTheme) {
      sessionStorage.setItem('previousTheme', currentTheme);
    }
    
    // Forçar tema claro
    document.documentElement.classList.remove('dark');
    
    // Cleanup: restaurar tema anterior ao desmontar
    return () => {
      const savedTheme = sessionStorage.getItem('previousTheme');
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      sessionStorage.removeItem('previousTheme');
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesQuery.data, selectedConversation]);

  const msgs = useMemo(
    () =>
      (messagesQuery.data ?? []).sort(
        (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [messagesQuery.data]
  );

  return (
    <Layout>
      <div 
        ref={appContainerRef}
        className="w-full h-screen bg-[#090e17] text-slate-200 font-sans overflow-hidden flex items-center justify-center relative transition-all duration-500"
      >
        {/* Dynamic Background with Triangles */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {/* Blobs */}
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-500/10 rounded-full blur-[120px] animate-pulse-slow delay-1000"></div>
          
          {/* Floating Triangles */}
          <div className="absolute top-[20%] left-[10%] animate-float-slow opacity-80">
            <svg width="120" height="120" viewBox="0 0 100 100" className="text-emerald-500 fill-current drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
              <polygon points="50,0 100,100 0,100" />
            </svg>
          </div>
          <div className="absolute bottom-[20%] left-[20%] animate-float-reverse opacity-70">
            <svg width="180" height="180" viewBox="0 0 100 100" className="text-blue-600 fill-current rotate-45 drop-shadow-[0_0_15px_rgba(37,99,235,0.5)]">
              <polygon points="50,0 100,100 0,100" />
            </svg>
          </div>
          <div className="absolute top-[15%] right-[25%] animate-float-slow opacity-60 delay-700">
            <svg width="100" height="100" viewBox="0 0 100 100" className="text-cyan-500 fill-current -rotate-12 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
              <polygon points="50,0 100,100 0,100" />
            </svg>
          </div>
          <div className="absolute bottom-[30%] right-[10%] animate-float-slow opacity-80 delay-1000">
            <svg width="140" height="140" viewBox="0 0 100 100" className="text-emerald-600 fill-current rotate-90 drop-shadow-[0_0_15px_rgba(5,150,105,0.5)]">
              <polygon points="50,0 100,100 0,100" />
            </svg>
          </div>

          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
        </div>

        {/* Main App Container */}
        <div className={`relative z-10 flex w-full h-full ${!isFullscreen ? 'md:w-[95%] md:h-[92%] md:rounded-[2rem] md:border md:border-slate-700/50 md:shadow-2xl md:shadow-black/50' : ''} bg-[#0f172a]/60 backdrop-blur-2xl overflow-hidden transition-all duration-500`}>
          
          {/* Sidebar */}
          <div className={`${isSidebarOpen ? 'w-full md:w-[380px]' : 'w-0 hidden'} flex-shrink-0 flex flex-col border-r border-white/5 bg-[#131b2e]/40 transition-all duration-300`}>
            {/* Sidebar Header */}
            <div className="p-5 flex justify-between items-center bg-gradient-to-b from-white/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold text-lg">W</div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-[#131b2e] rounded-full"></div>
                </div>
                <div>
                  <h1 className="font-bold text-sm text-white tracking-wide">WhatsApp</h1>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider bg-white/5 px-1.5 py-0.5 rounded">Qualital</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button className="p-2 hover:bg-white/10 rounded-lg text-emerald-400 transition-colors">
                  <Plus size={18} />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-lg text-slate-400 transition-colors">
                  <Settings size={18} />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-5 pb-2">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Pesquisar..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0a0f1c]/60 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs focus:outline-none focus:border-emerald-500/50 focus:bg-[#0a0f1c]/80 transition-all placeholder-slate-600 text-slate-200"
                />
              </div>
            </div>

            {/* Filter Pills */}
            <div className="px-5 py-3 flex gap-2 overflow-x-auto no-scrollbar">
              {[
                { key: "abertos", label: "Abertos" },
                { key: "aguardando", label: "Espera" },
                { key: "fechados", label: "Fechados" },
                { key: "todos", label: "Todos" },
              ].map(f => (
                <button 
                  key={f.key} 
                  onClick={() => setFilterStatus(f.key as any)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all border ${filterStatus === f.key ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-slate-400 border-transparent hover:bg-white/10'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Conversation Cards List */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 custom-scrollbar">
              {filteredConversations.map(conversation => (
                <div 
                  key={conversation.id}
                  onClick={() => { setSelectedConversation(conversation); if(window.innerWidth<768) setIsSidebarOpen(false); }}
                  className={`group relative p-3 rounded-2xl cursor-pointer transition-all duration-300 border ${selectedConversation?.id === conversation.id ? 'bg-white/10 border-emerald-500/30 shadow-lg shadow-black/20' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                >
                  {selectedConversation?.id === conversation.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-emerald-500 rounded-r-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>}
                  
                  <div className="flex gap-3 items-start">
                    <div className="relative flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-transform ${selectedConversation?.id === conversation.id ? 'scale-105 ring-2 ring-emerald-500/50 bg-gradient-to-br from-emerald-500 to-cyan-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                        {conversation.title.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#131b2e]"></div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <h3 className={`font-semibold text-sm truncate ${selectedConversation?.id === conversation.id ? 'text-white' : 'text-slate-300'}`}>{conversation.title}</h3>
                          <span className={`text-[9px] px-1 rounded border whitespace-nowrap ${selectedConversation?.id === conversation.id ? 'border-emerald-500/50 text-emerald-100' : 'border-slate-600 text-slate-500'}`}>{conversation.ticketLine || "WA"}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">{renderTime(conversation.updatedAt)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider bg-gradient-to-r ${getReasonColor("WhatsApp")} text-white shadow-sm`}>
                          WhatsApp
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{conversation.phoneLine}</span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-2 pt-1 border-t border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                            <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(conversation.status).split(' ')[0]}`}></div>
                            <span className="text-[9px] font-medium text-slate-300">{getStatusLabel(conversation.status)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                            <Timer size={10} className="text-emerald-500/70" />
                            <span>2h</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area + Painel Lateral */}
          <div className={`flex-1 flex relative bg-[#0b1221]/50 ${!isSidebarOpen ? 'w-full' : ''}`}>
            {/* Background Details */}
            <div className="absolute inset-0 z-0">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-emerald-500/5 rounded-full blur-[100px]"></div>
              <div className="w-full h-full opacity-[0.03]" style={{backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px"}}></div>
            </div>

            {selectedConversation ? (
              <div className="flex-1 flex gap-4 z-10 overflow-hidden">
                {/* Área de Chat - 70% */}
                <div className="flex-1 flex flex-col">
                  {/* Header */}
                  <div className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-white/[0.02] backdrop-blur-md z-20">
                    <div className="flex items-center gap-4">
                      <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(true)}>
                        <Menu size={20} />
                      </button>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-cyan-500 text-white font-bold text-sm ring-2 ring-white/10">
                            {selectedConversation.title.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-white leading-tight flex items-center gap-2">
                            {selectedConversation.title}
                            <span className="text-[10px] font-normal text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">{selectedConversation.ticketLine || "WA"}</span>
                          </h2>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(selectedConversation.status).split(' ')[0]}`}></div>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wide">{getStatusLabel(selectedConversation.status)}</span>
                            </div>
                            <span className="text-[10px] text-slate-300">
                              {selectedConversation.contractName || "Contrato não informado"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10">
                        <LayoutDashboard size={16} />
                        <span className="hidden sm:inline">Modo Dashboard</span>
                      </button>
                      <div className="hidden md:flex bg-white/5 rounded-full p-1 border border-white/5">
                        <button onClick={() => setShowTransferModal(true)} className="w-8 h-8 rounded-full flex items-center justify-center text-amber-500 hover:bg-amber-500/20 transition-all" title="Transferir">
                          <ArrowRightLeft size={16} />
                        </button>
                        <button onClick={() => closeTicketMutation.mutate({ ticketId: selectedConversation.id })} className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-500 hover:bg-emerald-500/20 transition-all" title="Fechar">
                          <CheckCheck size={16} />
                        </button>
                      </div>
                      <div className="w-px h-6 bg-white/10"></div>
                      <button onClick={toggleFullscreen} className="p-2 text-slate-400 hover:text-white transition-colors" title="Tela Cheia">
                        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar scroll-smooth">
                    <div className="flex justify-center">
                      <span className="text-[10px] font-bold text-slate-600 bg-[#0f172a] px-3 py-1 rounded-full border border-white/5">HOJE</span>
                    </div>
                    
                    {msgs.map((msg: any) => (
                      <div key={msg.id} className={`flex w-full ${msg.senderType === 'atendente' || msg.senderType === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                        <div className="max-w-[80%] md:max-w-[60%] relative group">
                          <div className={`px-5 py-3 rounded-2xl shadow-lg backdrop-blur-sm border ${
                            msg.senderType === 'atendente' || msg.senderType === 'user'
                            ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-tr-sm border-emerald-500/30' 
                            : 'bg-[#1e293b]/80 text-slate-200 rounded-tl-sm border-white/5'
                          }`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                          </div>
                          <div className={`flex items-center gap-1 mt-1 opacity-60 text-[10px] font-medium ${msg.senderType === 'atendente' || msg.senderType === 'user' ? 'justify-end text-emerald-300' : 'justify-start text-slate-500'}`}>
                            {renderTime(msg.createdAt as string)} {(msg.senderType === 'atendente' || msg.senderType === 'user') && <CheckCheck size={12} />}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Footer */}
                  <div className="p-4 z-20">
                    <div className="max-w-4xl mx-auto flex flex-col gap-3">
                      {/* Actions Dock */}
                      <div className="flex justify-center gap-3">
                        {[
                          {id: 'declaracao', icon: FileText, label: 'Declaração', color: 'text-blue-400'},
                          {id: 'demonstrativo', icon: DollarSign, label: 'Pagamento', color: 'text-green-400'},
                          {id: 'respostas', icon: Zap, label: 'Rápidas', color: 'text-amber-400'},
                          {id: 'dados', icon: CreditCard, label: 'Dados Banc.', color: 'text-purple-400'},
                        ].map((action) => (
                          <button 
                            key={action.id}
                            onClick={() => handleQuickAction(action.id)}
                            className="group relative flex items-center justify-center w-10 h-10 rounded-xl bg-[#1e293b]/80 border border-white/5 hover:bg-white/10 hover:-translate-y-1 transition-all shadow-lg hover:shadow-emerald-500/10"
                          >
                            <action.icon size={18} className={`${action.color} transition-transform group-hover:scale-110`} />
                            <span className="absolute -top-8 bg-[#0f172a] text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10 shadow-xl">
                              {action.label}
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Input Capsule */}
                      <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative flex items-end gap-2 bg-[#1e293b]/90 backdrop-blur-xl p-1.5 rounded-[24px] border border-white/10 shadow-2xl ring-1 ring-white/5 focus-within:ring-emerald-500/50 transition-all duration-300">
                        <div className="flex items-center gap-0.5 px-1 pb-1.5">
                          <button type="button" className="p-2 rounded-full text-slate-400 hover:text-emerald-400 hover:bg-white/5 transition-colors">
                            <Smile size={20}/>
                          </button>
                          <div>
                            <input
                              id="file-upload-wa"
                              type="file"
                              accept="image/*,application/pdf,audio/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleUploadFile(file);
                                  e.target.value = "";
                                }
                              }}
                            />
                            <button type="button" onClick={() => document.getElementById("file-upload-wa")?.click()} className="p-2 rounded-full text-slate-400 hover:text-blue-400 hover:bg-white/5 transition-colors">
                              <Paperclip size={20}/>
                            </button>
                          </div>
                        </div>
                        <textarea 
                          rows={1}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Digite sua mensagem..."
                          className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-200 placeholder-slate-500 py-3 px-2 resize-none max-h-32 custom-scrollbar"
                          onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                        />
                        <div className="flex items-center gap-1 pb-1.5 pr-1.5">
                          <button type="button" onClick={handleToggleRecording} className={cn("p-2 rounded-full transition-colors", isRecording ? "text-red-500 hover:bg-red-500/20" : "text-slate-400 hover:text-rose-400 hover:bg-white/5")}>
                            {isRecording ? <Square size={20}/> : <Mic size={20}/>}
                          </button>
                          <button type="submit" className="p-3 rounded-full bg-emerald-500 text-[#090e17] hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all">
                            <Send size={18} strokeWidth={2.5} />
                          </button>
                        </div>
                      </form>
                      <div className="text-center">
                        <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest opacity-50">Secure Connection &bull; End-to-End Encrypted</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Painel Lateral Direito - 30% */}
                <div className="hidden xl:flex w-[380px] flex-col gap-4 p-4 border-l border-white/5">
                  {/* Card Cliente / Contrato */}
                  <Card className="bg-[#131b2e]/60 border-white/10 shadow-xl">
                    <CardHeader className="pb-3 border-b border-white/5">
                      <CardTitle className="text-sm text-white flex items-center gap-2">
                        <User size={16} className="text-emerald-400" /> Cliente / Contrato
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <label className="text-xs font-semibold text-slate-400 uppercase">Cliente</label>
                            <p className="text-sm text-white font-medium">
                              {selectedConversation?.clienteName || "Não Cliente"}
                            </p>
                            <p className="text-xs text-slate-400">
                              {selectedConversation?.clienteId
                                ? selectedConversation.contractName || "Contrato não informado"
                                : "Não Cliente"}
                            </p>
                          </div>
                          <div className="text-right">
                            <label className="text-xs font-semibold text-slate-400 uppercase">Coordenador</label>
                            <p className="text-xs text-slate-300">Não informado</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase">Contrato/Origem</label>
                        <div className="flex items-center text-sm text-white mt-0.5">
                          <span>{selectedConversation?.description || "Contrato não informado"}</span>
                          <span className="mx-1">-</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            WhatsApp
                          </span>
                        </div>
                        {selectedConversation?.phoneLine && (
                          <p className="text-xs text-slate-400 mt-1">{selectedConversation.phoneLine}</p>
                        )}
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Button className="col-span-2 px-3 py-2 text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors">
                          Ver Clientes
                        </Button>
                        <Button className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium border rounded-lg transition-colors bg-white/5 text-blue-300 border-blue-500/30 hover:bg-blue-500/10">
                          <UserPlus size={14} /> Mesclar
                        </Button>
                        <Button className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium border rounded-lg transition-colors bg-white/5 text-slate-300 border-white/10 hover:bg-white/10">
                          <UserX size={14} /> Não Coop.
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card Histórico */}
                  <Card className="flex-1 bg-[#131b2e]/60 border-white/10 shadow-xl overflow-hidden flex flex-col">
                    <CardHeader className="pb-3 border-b border-white/5">
                      <CardTitle className="text-sm text-white flex items-center gap-2">
                        <History size={16} className="text-slate-400" /> Histórico
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-0 custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ticket / Data</th>
                            <th className="px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Motivo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {msgs.slice(0, 5).map((msg: any, idx: number) => (
                            <tr key={msg.id} className="hover:bg-white/5 cursor-pointer transition-colors group">
                              <td className="px-4 py-2">
                                <div className="font-bold text-xs text-emerald-400">#{selectedConversation.protocol || selectedConversation.id}</div>
                                <div className="text-[10px] text-slate-500">{renderTime(msg.createdAt)}</div>
                              </td>
                              <td className="px-4 py-2">
                                <div className="text-xs font-medium text-slate-300 line-clamp-1">{msg.message.slice(0, 40)}...</div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <User size={10} /> {msg.senderType === 'atendente' ? 'Atendente' : 'Cliente'}
                                </div>
                          </td>
                            </tr>
                          ))}
                          {msgs.length === 0 && (
                            <tr>
                              <td colSpan={2} className="px-4 py-8 text-center text-xs text-slate-400 italic">
                                Nenhum histórico encontrado.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 z-10">
                <div className="relative group">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-700"></div>
                  <div className="relative w-24 h-24 bg-gradient-to-tr from-[#1e293b] to-[#0f172a] rounded-[2rem] border border-white/10 flex items-center justify-center shadow-2xl">
                    <MessageSquare size={40} className="text-emerald-400" />
                  </div>
                </div>
                <h1 className="mt-8 text-3xl font-bold text-white tracking-tight">WhatsApp <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Command Center</span></h1>
                <p className="mt-2 text-slate-400 text-sm max-w-sm">Selecione uma conversa ao lado para começar o atendimento.</p>
              </div>
            )}
          </div>
        </div>

        {/* Transfer Modal */}
        {showTransferModal && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-[#131b2e] border border-white/10 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <ArrowRightLeft size={18} className="text-amber-400"/> Transferir Conversa
                </h3>
                <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-white">
                  <X size={18}/>
                </button>
              </div>
              
              <div className="p-2 space-y-1">
                {DEPARTAMENTOS.map(d => (
                  <button key={d} onClick={() => { toast.success(`Transferido para: ${d}`); setShowTransferModal(false); }} className="w-full text-left p-3 hover:bg-white/5 rounded-xl text-slate-300 hover:text-white text-sm transition-colors flex items-center gap-3">
                    <Building size={16} className="text-slate-500"/> {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .animate-pulse-slow { animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
          @keyframes float-reverse {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(20px) rotate(-5deg); }
          }
          .animate-float-slow { animation: float 15s ease-in-out infinite; }
          .animate-float-reverse { animation: float-reverse 18s ease-in-out infinite; }
          .delay-700 { animation-delay: 700ms; }
          .delay-1000 { animation-delay: 1000ms; }
        `}</style>
      </div>
    </Layout>
  );
}



