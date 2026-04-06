import React, { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Mic, FileText, Receipt, Zap, CreditCard, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AudioPlayer } from "@/components/AudioPlayer";
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

interface WhatsAppChatSectionProps {
  ticketId: number;
  onOpenDeclaration?: () => void;
  onOpenBankData?: () => void;
}

type TicketMessage = {
  id: number;
  ticketId: number;
  message: string;
  mediaUrl?: string | null;
  senderType: "user" | "Cliente" | "sistema" | "interno" | "atendente";
  senderName?: string | null;
  createdAt: string | Date;
};

function formatTime(value?: string | Date | null) {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function WhatsAppChatSection({ ticketId, onOpenDeclaration, onOpenBankData }: WhatsAppChatSectionProps) {
  const [messageDraft, setMessageDraft] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isQuickMessagesOpen, setIsQuickMessagesOpen] = useState(false);

  // Buscar mensagens rápidas
  const { data: quickMessages } = trpc.quickMessages.list.useQuery();
  const quickMessagesList = quickMessages || [];

  // Buscar mensagens
  const { data: messages, refetch: refetchMessages } = trpc.tickets.messages.list.useQuery(
    { ticketId },
    {
      enabled: !!ticketId,
      refetchInterval: 4000,
      refetchIntervalInBackground: true,
    }
  );

  const messagesList = (() => {
    const raw = ((messages as any) as TicketMessage[]) || [];
    // Dedup defensivo para evitar ids duplicados quebrando o React (keys repetidas)
    const seen = new Set<number>();
    const out: TicketMessage[] = [];
    for (const m of raw) {
      if (!m || typeof m.id !== "number") continue;
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      out.push(m);
    }
    return out;
  })();

  // Enviar mensagem
  const sendMessage = trpc.tickets.messages.create.useMutation({
    onSuccess: async () => {
      setMessageDraft("");
      await refetchMessages();
    },
  });

  const handleSend = () => {
    if (!messageDraft.trim()) return;

    sendMessage.mutate({
      ticketId,
      message: messageDraft,
    });
  };

  // Upload de arquivo
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 20MB)");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      sendMessage.mutate({
        ticketId,
        message: `Arquivo: ${file.name}`,
        mediaUrl: base64,
      });
    };
    reader.readAsDataURL(file);
  };

  // Gravação de áudio
  const handleToggleRecording = async () => {
    if (isRecording) {
      mediaRecorder?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          chunks.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            handleSendAudio(base64);
          };
          reader.readAsDataURL(blob);
          stream.getTracks().forEach((track) => track.stop());
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
      } catch (err) {
        toast.error("Erro ao acessar microfone");
        console.error(err);
      }
    }
  };

  // Ações rápidas
  const handleQuickAction = (action: string) => {
    if (action === "declaracao") {
      if (onOpenDeclaration) return onOpenDeclaration();
      toast.info("Abra este ticket no Modo de Atendimento para gerar a declaração.");
      return;
    }
    if (action === "dados") {
      if (onOpenBankData) return onOpenBankData();
      toast.info("Abra este ticket no Modo de Atendimento para ver dados bancários.");
      return;
    }
    if (action === "demonstrativo") {
      toast.info("Em breve: envio de demonstrativo neste modo.");
      return;
    }
    if (action === "respostas") {
      toast.info("Em breve: Biblioteca de respostas rápidas");
      return;
    }

    toast.info(`Processando ação: ${action}`);
  };

  // Auto-scroll para última mensagem
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesList.length]);

  const handleSendAudio = (base64Data: string) => {
    sendMessage.mutate({
      ticketId,
      message: "[Áudio]",
      mediaUrl: base64Data,
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
      {/* Header do Chat */}
      <div className="bg-white p-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
            <Send size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Chat do Ticket</h3>
            <p className="text-[10px] text-slate-400">Atendimento em tempo real</p>
          </div>
        </div>
        <p className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
          {messagesList.length} mensagem{messagesList.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
        {messagesList.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-slate-400">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          messagesList.map((msg) => {
            const isOut = msg.senderType !== "Cliente";
            return (
              <div
                key={msg.id}
                className={cn("flex flex-col", isOut ? "items-end" : "items-start")}
              >
                <div className="flex items-end gap-2 max-w-[85%]">
                  {!isOut && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                      C
                    </div>
                  )}
                  <div
                    className={cn(
                      "px-4 py-2.5 rounded-2xl shadow-sm text-sm",
                      isOut
                        ? "bg-indigo-600 text-white rounded-br-none"
                        : "bg-white border border-slate-200 text-slate-700 rounded-bl-none"
                    )}
                  >
                    <div
                      className={cn(
                        "text-[10px] font-bold mb-1",
                        isOut ? "text-indigo-200" : "text-slate-400"
                      )}
                    >
                      {isOut ? `Atendente ${msg.senderName || ""}` : "Cliente"}
                    </div>
                    {msg.mediaUrl && (msg.mediaUrl.includes('.ogg') || msg.mediaUrl.includes('.mp3') || msg.mediaUrl.includes('.wav') || msg.mediaUrl.includes('.m4a') || msg.mediaUrl.includes('data:audio')) ? (
                      <AudioPlayer url={msg.mediaUrl} isOut={isOut} />
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    )}
                    <div
                      className={cn(
                        "text-[10px] mt-1 text-right",
                        isOut ? "text-indigo-200" : "text-slate-400"
                      )}
                    >
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Footer - Input e Ações */}
      <div className="p-3 bg-white border-t border-slate-200 space-y-3">
        {/* Botões de Ação Rápida */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-100">
          <button
            onClick={() => handleQuickAction("demonstrativo")}
            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-lg transition-colors"
            title="Demonstrativo Pagamento"
          >
            <Receipt size={16} />
          </button>
          <button
            onClick={() => handleQuickAction("declaracao")}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-colors"
            title="Declaração"
          >
            <FileText size={16} />
          </button>
          <Popover open={isQuickMessagesOpen} onOpenChange={setIsQuickMessagesOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-100 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                title="Resposta Rápida"
              >
                <Zap size={16} />
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
                          sendMessage.mutate({
                            ticketId,
                            message: msg.content,
                          });
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
          <button
            onClick={() => handleQuickAction("dados")}
            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-lg transition-colors"
            title="Dados Bancários"
          >
            <CreditCard size={16} />
          </button>
        </div>

        {/* Input de Mensagem */}
        <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*,application/pdf,audio/*"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            title="Anexar arquivo"
          >
            <Paperclip size={18} />
          </button>
          <button
            onClick={handleToggleRecording}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isRecording
                ? "text-red-600 bg-red-50 hover:bg-red-100"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-200"
            )}
            title={isRecording ? "Parar gravação" : "Gravar áudio"}
          >
            {isRecording ? <Square size={18} /> : <Mic size={18} />}
          </button>
          <Textarea
            value={messageDraft}
            onChange={(e) => setMessageDraft(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 bg-transparent border-none resize-none focus-visible:ring-0 text-sm py-2 max-h-24 min-h-[40px]"
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
            disabled={!messageDraft.trim() || sendMessage.isPending}
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 px-3"
          >
            <span className="text-xs font-semibold">Enviar</span>
            <Send size={14} />
          </button>
        </div>

        <p className="text-[10px] text-slate-400 text-center">
          Pressione Enter para enviar • Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
}



