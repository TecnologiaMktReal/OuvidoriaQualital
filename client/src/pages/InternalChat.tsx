import React, { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Send, 
  Paperclip,
  ChevronDown,
  ChevronRight,
  Phone,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type User = {
  id: number;
  name: string;
  nickname?: string | null;
  email?: string | null;
  role: string;
  phone?: string | null;
  avatarUrl?: string | null;
  isManager: boolean;
};

type Department = {
  id: number;
  name: string;
  users: User[];
};

export default function InternalChat() {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDepts, setExpandedDepts] = useState<Set<number>>(new Set());
  const [sendToWhatsApp, setSendToWhatsApp] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: departments = [] } = trpc.internalChat.getUsersByDepartment.useQuery();
  const { data: messages = [] } = trpc.internalChat.getMessages.useQuery(
    { conversationId: selectedConversationId! },
    { enabled: !!selectedConversationId, refetchInterval: 3000 }
  );

  const getOrCreateConversationMutation = trpc.internalChat.getOrCreateConversation.useMutation({
    onSuccess: (data) => {
      setSelectedConversationId(data.conversationId);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar conversa");
    },
  });

  const sendMessageMutation = trpc.internalChat.sendMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      setSendToWhatsApp(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao enviar mensagem");
    },
  });

  const markAsReadMutation = trpc.internalChat.markAsRead.useMutation();

  const uploadFileMutation = trpc.internalChat.uploadFile.useMutation({
    onSuccess: (data) => {
      if (selectedConversationId) {
        sendMessageMutation.mutate({
          conversationId: selectedConversationId,
          fileUrl: data.url,
          sendToWhatsApp,
        });
      }
    },
    onError: () => {
      toast.error("Erro ao fazer upload do arquivo");
    },
  });

  useEffect(() => {
    if (selectedConversationId) {
      markAsReadMutation.mutate({ conversationId: selectedConversationId });
    }
  }, [selectedConversationId, messages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleUserClick = (userId: number) => {
    setSelectedUserId(userId);
    getOrCreateConversationMutation.mutate({ otherUserId: userId });
  };

  const handleSendMessage = () => {
    if (!selectedConversationId || !message.trim()) return;
    
    sendMessageMutation.mutate({
      conversationId: selectedConversationId,
      message: message.trim(),
      sendToWhatsApp,
    });
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    const maxSize = 10 * 1024 * 1024;
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
      
      uploadFileMutation.mutate({
        base64,
        mimeType: file.type || "application/octet-stream",
        fileName: file.name,
      });
    };
    reader.onerror = () => toast.error("Falha ao ler arquivo");
    reader.readAsDataURL(file);
  };

  const toggleDepartment = (deptId: number) => {
    const newExpanded = new Set(expandedDepts);
    if (newExpanded.has(deptId)) {
      newExpanded.delete(deptId);
    } else {
      newExpanded.add(deptId);
    }
    setExpandedDepts(newExpanded);
  };

  const filteredDepartments = departments.map((dept: Department) => ({
    ...dept,
    users: dept.users.filter((user: User) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((dept: Department) => dept.users.length > 0);

  const selectedUser = departments
    .flatMap((d: Department) => d.users)
    .find((u: User) => u.id === selectedUserId);

  const hasWhatsApp = selectedUser?.phone;

  return (
    <Layout>
      <div className="w-full h-[calc(100vh-4rem)] bg-white text-slate-800 flex overflow-hidden rounded-lg border border-slate-200 shadow-sm">
        {/* Sidebar - Lista de Usuários */}
        <div className="w-[340px] flex-shrink-0 flex flex-col border-r border-slate-200 bg-slate-50">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 bg-white">
            <h1 className="text-lg font-semibold text-slate-900 mb-3">Chat Interno</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                type="text"
                placeholder="Buscar usuários..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border-slate-300 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-yellow-500 focus:ring-yellow-500/20"
              />
            </div>
          </div>

          {/* Lista de Departamentos */}
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-1">
              {filteredDepartments.map((dept: Department) => (
                <div key={dept.id} className="rounded-lg overflow-hidden">
                  {/* Cabeçalho do Departamento */}
                  <button
                    onClick={() => toggleDepartment(dept.id)}
                    className="w-full flex items-center gap-2 p-2.5 hover:bg-slate-100 transition-colors rounded-lg"
                  >
                    {expandedDepts.has(dept.id) ? (
                      <ChevronDown size={14} className="text-yellow-600" />
                    ) : (
                      <ChevronRight size={14} className="text-slate-400" />
                    )}
                    <span className="font-medium text-sm text-slate-700">{dept.name}</span>
                    <Badge variant="secondary" className="ml-auto text-xs bg-slate-200 text-slate-600">
                      {dept.users.length}
                    </Badge>
                  </button>

                  {/* Lista de Usuários */}
                  {expandedDepts.has(dept.id) && (
                    <div className="pl-2 pr-1 py-1 space-y-0.5">
                      {dept.users.map((user: User) => (
                        <button
                          key={user.id}
                          onClick={() => handleUserClick(user.id)}
                          className={cn(
                            "w-full flex items-center gap-2.5 p-2 rounded-lg transition-all",
                            selectedUserId === user.id
                              ? "bg-yellow-50 border border-yellow-200"
                              : "hover:bg-slate-100"
                          )}
                        >
                          <Avatar className="h-9 w-9 border border-slate-200">
                            <AvatarImage src={user.avatarUrl || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-white text-xs">
                              {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-slate-800 truncate">
                                {user.name}
                              </p>
                              {user.isManager && (
                                <Badge className="bg-yellow-100 text-yellow-700 text-[10px] px-1.5 py-0 border-0">
                                  Gestor
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 truncate">{user.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Área de Chat */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedUser ? (
            <>
              {/* Header do Chat */}
              <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-slate-200">
                    <AvatarImage src={selectedUser.avatarUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-white text-xs">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">{selectedUser.name}</h2>
                    <p className="text-xs text-slate-500">{selectedUser.email}</p>
                  </div>
                </div>
                {hasWhatsApp && (
                  <Badge className="bg-green-50 text-green-700 flex items-center gap-1.5 border border-green-200">
                    <Phone size={12} />
                    WhatsApp
                  </Badge>
                )}
              </div>

              {/* Mensagens */}
              <ScrollArea className="flex-1 p-4 bg-slate-50">
                <div className="space-y-3 max-w-4xl mx-auto">
                  {messages.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex w-full",
                        msg.senderId === selectedUserId ? "justify-start" : "justify-end"
                      )}
                    >
                      <div className="max-w-[70%]">
                        <div
                          className={cn(
                            "px-3 py-2 rounded-lg shadow-sm",
                            msg.senderId === selectedUserId
                              ? "bg-white text-slate-800 rounded-tl-none border border-slate-200"
                              : "bg-yellow-500 text-white rounded-tr-none"
                          )}
                        >
                          {msg.message && <p className="text-sm leading-relaxed">{msg.message}</p>}
                          {msg.fileUrl && (
                            <a
                              href={msg.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs underline"
                            >
                              {msg.fileName || "Arquivo"}
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-slate-400">
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {msg.senderId !== selectedUserId && <CheckCheck size={12} className="text-slate-400" />}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Input de Mensagem */}
              <div className="p-4 border-t border-slate-200 bg-white">
                <div className="max-w-4xl mx-auto space-y-2">
                  {hasWhatsApp && (
                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendToWhatsApp}
                        onChange={(e) => setSendToWhatsApp(e.target.checked)}
                        className="rounded border-slate-300 bg-white text-yellow-500 focus:ring-yellow-500/20"
                      />
                      Enviar também por WhatsApp
                    </label>
                  )}
                  
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-300"
                  >
                    <div>
                      <input
                        id="file-upload-chat"
                        type="file"
                        accept="image/*,application/pdf,audio/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file);
                            e.target.value = "";
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById("file-upload-chat")?.click()}
                        className="p-2 rounded-lg text-slate-500 hover:text-yellow-600 hover:bg-slate-50 transition-colors"
                      >
                        <Paperclip size={18} />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Digite sua mensagem..."
                      className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-800 placeholder-slate-400 py-2 px-2"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />

                    <button
                      type="submit"
                      className="p-2.5 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-all hover:scale-105 shadow-sm"
                    >
                      <Send size={16} strokeWidth={2.5} />
                    </button>
                  </form>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <p className="text-slate-400 text-sm">Selecione um usuário para iniciar uma conversa</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}



