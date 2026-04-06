import { useMemo, useState, useEffect, Fragment } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck,
  Save,
  ChevronRight,
  Lock,
  Loader2,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Copy,
  AlertCircle,
  Users,
  UserPen,
  UserRound,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

type PermissionSet = {
  view: boolean;
  edit: boolean;
  delete: boolean;
};

type ResourcePermission = {
  key: string;
  label: string;
  group: string;
  path?: string;
  permissions: PermissionSet;
};

type Profile = {
  id?: number;
  name: string;
  description: string;
  role: "user" | "admin" | "SuperAdmin" | "gerente" | "atendente";
  permissions: Record<string, PermissionSet>;
};

const defaultResources: ResourcePermission[] = [
  { key: "dashboard", label: "Dashboard", group: "Menus Principais", path: "/", permissions: { view: true, edit: false, delete: false } },
  { key: "tickets-modo", label: "Tickets • Modo de Atendimento", group: "Atendimento & Tickets", path: "/tickets", permissions: { view: true, edit: true, delete: false } },
  { key: "tickets-lista", label: "Tickets • Lista Geral", group: "Atendimento & Tickets", path: "/tickets", permissions: { view: true, edit: true, delete: true } },
  { key: "tickets-kanban", label: "Tickets • Kanban por Status", group: "Atendimento & Tickets", path: "/tickets", permissions: { view: true, edit: false, delete: false } },
  { key: "chat-interno", label: "Chat Interno / WhatsApp", group: "Comunicações", path: "/whatsapp", permissions: { view: true, edit: true, delete: false } },
  { key: "Clientes", label: "Clientes", group: "Cadastros Estruturais", path: "/Clientes", permissions: { view: true, edit: true, delete: true } },
  { key: "contratos", label: "Contratos", group: "Cadastros Estruturais", path: "/contratos", permissions: { view: true, edit: true, delete: true } },
  { key: "departamentos", label: "Departamentos", group: "Cadastros Estruturais", path: "/departamentos", permissions: { view: true, edit: true, delete: true } },
  { key: "relatorios", label: "Relatórios de Gestão", group: "Relatórios & BI", path: "/relatorios", permissions: { view: true, edit: false, delete: false } },
  { key: "settings-whatsapp", label: "Configurações • Setup WhatsApp", group: "Configurações Globais", path: "/settings/setup-whatsapp", permissions: { view: true, edit: true, delete: false } },
  { key: "settings-emails", label: "Configurações • Setup E-mails", group: "Configurações Globais", path: "/settings/setup-emails", permissions: { view: true, edit: true, delete: false } },
  { key: "settings-usuarios", label: "Configurações • Usuários", group: "Configurações Globais", path: "/settings/usuarios", permissions: { view: true, edit: true, delete: true } },
  { key: "settings-import", label: "Configurações • Importações", group: "Configurações Globais", path: "/settings/importacoes", permissions: { view: true, edit: true, delete: false } },
];

export default function PerfilUsuario() {
  const utils = trpc.useUtils();
  const { data: dbProfiles, isLoading } = trpc.users.profileTypes.useQuery();
  
  const upsertMutation = trpc.users.upsertProfileType.useMutation({
    onSuccess: () => {
      toast.success("Perfil de acesso atualizado!");
      utils.users.profileTypes.invalidate();
    },
    onError: (err) => {
      toast.error("Falha ao salvar: " + err.message);
    }
  });

  const deleteMutation = trpc.users.deleteProfileType.useMutation({
    onSuccess: () => {
      toast.success("Perfil removido definitivamente.");
      utils.users.profileTypes.invalidate();
    },
    onError: (err) => {
      toast.error("Não foi possível excluir o perfil: " + err.message);
    }
  });

  const updateUserMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("Perfil do usuário alterado com sucesso!");
      utils.users.list.invalidate();
    },
    onError: (err) => {
      toast.error("Erro ao alterar perfil: " + err.message);
    }
  });

  const [localProfiles, setLocalProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | "">("");
  const [search, setSearch] = useState("");
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileDesc, setNewProfileDesc] = useState("");
  const [isUsersListOpen, setIsUsersListOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{id: number, name: string, profileId: number} | null>(null);

  useEffect(() => {
    if (dbProfiles) {
      const mapped: Profile[] = dbProfiles.map(p => {
        const rawPerms = (p.permissions as Record<string, PermissionSet>) || {};
        const mergedPermissions = Object.fromEntries(
          defaultResources.map(res => [
            res.key,
            rawPerms[res.key] || { view: false, edit: false, delete: false }
          ])
        );

        return {
          id: p.id,
          name: p.name,
          description: p.description ?? "",
          role: p.role as any,
          permissions: mergedPermissions
        };
      });
      setLocalProfiles(mapped);
      if (mapped.length > 0 && selectedProfileId === "") {
        setSelectedProfileId(mapped[0].id!);
      }
    }
  }, [dbProfiles]);

  const sortedProfiles = useMemo(() => {
    const roleOrder: Record<string, number> = {
      "SuperAdmin": 1,
      "admin": 2,
      "gerente": 3,
      "atendente": 4,
      "user": 5
    };
    return [...localProfiles].sort((a, b) => {
      const orderA = roleOrder[a.role] || 99;
      const orderB = roleOrder[b.role] || 99;
      return orderA - orderB;
    });
  }, [localProfiles]);

  const selectedProfile = useMemo(() => {
    return localProfiles.find((p) => p.id === selectedProfileId) ?? localProfiles[0];
  }, [localProfiles, selectedProfileId]);

  const { data: profileUsers, isLoading: isLoadingUsers } = trpc.users.list.useQuery(
    { profileTypeId: Number(selectedProfileId), pageSize: 100 },
    { enabled: !!selectedProfileId }
  );

  const groupedResources = useMemo(() => {
    const term = search.toLowerCase().trim();
    const filtered = term 
      ? defaultResources.filter(r => r.label.toLowerCase().includes(term) || r.group.toLowerCase().includes(term))
      : defaultResources;

    return filtered.reduce<Record<string, ResourcePermission[]>>((acc, item) => {
      acc[item.group] = acc[item.group] || [];
      acc[item.group].push(item);
      return acc;
    }, {});
  }, [search]);

  const updatePermission = (resourceKey: string, field: keyof PermissionSet, value: boolean) => {
    if (!selectedProfile) return;
    setLocalProfiles((prev) =>
      prev.map((p) =>
        p.id === selectedProfile.id
          ? {
              ...p,
              permissions: {
                ...p.permissions,
                [resourceKey]: { 
                  ...(p.permissions[resourceKey] || { view: false, edit: false, delete: false }), 
                  [field]: value 
                },
              },
            }
          : p
      )
    );
  };

  const toggleAll = (resourceKey: string, value: boolean) => {
    if (!selectedProfile) return;
    setLocalProfiles((prev) =>
      prev.map((p) =>
        p.id === selectedProfile.id
          ? {
              ...p,
              permissions: {
                ...p.permissions,
                [resourceKey]: { view: value, edit: value, delete: value },
              },
            }
          : p
      )
    );
  };

  const handleSave = () => {
    if (!selectedProfile) return;
    upsertMutation.mutate({
      id: selectedProfile.id,
      name: selectedProfile.name,
      description: selectedProfile.description,
      role: selectedProfile.role,
      permissions: selectedProfile.permissions
    });
  };

  const handleCreateProfile = () => {
    const name = newProfileName.trim();
    if (!name) return;
    upsertMutation.mutate({
      name,
      description: newProfileDesc.trim() || "Perfil personalizado.",
      role: "user",
      permissions: Object.fromEntries(defaultResources.map((r) => [r.key, { view: false, edit: false, delete: false }])),
    }, {
      onSuccess: (data) => {
        setNewProfileName("");
        setNewProfileDesc("");
        if (data?.id) setSelectedProfileId(data.id);
      }
    });
  };

  const handleDeleteProfile = (id: number) => {
    deleteMutation.mutate({ id });
  };

  const handleUpdateUserEmail = (userId: number, newProfileId: number) => {
    const user = profileUsers?.items.find(u => u.id === userId);
    if (!user) return;

    updateUserMutation.mutate({
      id: userId,
      fullName: user.fullName || "",
      nickname: user.nickname ?? null,
      email: user.email || "",
      phone: user.phone ?? null,
      departmentId: user.departmentId ?? null,
      profileTypeId: newProfileId,
      avatar: user.avatarUrl ?? null,
    });
    setEditingUser(null);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-gray-400 font-medium animate-pulse">Carregando matriz de segurança...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-[1400px] mx-auto py-8 px-4">
        {/* Premium Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-2xl shadow-sm border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800">
              <ShieldCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Perfis de Acesso</h1>
              <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                Definição granular de permissões e segurança por nível de usuário
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Button 
                variant="outline" 
                className="h-12 px-6 rounded-xl border-gray-200 font-bold hover:bg-white text-gray-600"
                onClick={() => {
                   if (selectedProfile) {
                      setNewProfileName(`${selectedProfile.name} (Cópia)`);
                      setNewProfileDesc(selectedProfile.description);
                      toast.info("Nome preenchido para clonagem. Clique em 'ADICIONAR'.");
                   }
                }}
             >
                <Copy className="mr-2 h-4 w-4" />
                CLONAR ATUAL
             </Button>
             <Button 
                onClick={handleSave} 
                disabled={upsertMutation.isPending}
                className="h-12 px-10 bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-200/50 rounded-xl transition-all"
             >
                {upsertMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save size={18} className="mr-2" />}
                SALVAR ALTERAÇÕES
             </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar: List of Profiles */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-gray-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
               <CardHeader className="bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-800 p-5">
                  <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                    Níveis de Acesso
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-2">
                  <div className="space-y-1">
                    {sortedProfiles.map((profile) => {
                      const isActive = profile.id === selectedProfileId;
                      return (
                        <div key={profile.id} className="relative group">
                          <button
                            onClick={() => profile.id && setSelectedProfileId(profile.id)}
                            className={cn(
                              "w-full text-left p-4 rounded-xl transition-all flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-slate-800/50",
                              isActive ? "bg-blue-50 dark:bg-blue-900/20 translate-x-1" : "bg-transparent"
                            )}
                          >
                            <div className={cn(
                              "mt-1.5 h-2 w-2 rounded-full",
                              isActive ? "bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]" : "bg-gray-200 dark:bg-slate-700"
                            )} />
                            <div className="flex-1">
                              <span className={cn(
                                "block font-extrabold text-sm uppercase tracking-wide",
                                isActive ? "text-blue-700 dark:text-blue-400" : "text-gray-700 dark:text-slate-300"
                              )}>{profile.name}</span>
                              <span className="text-[10px] text-gray-400 font-semibold line-clamp-1 group-hover:line-clamp-none transition-all">
                                {profile.description}
                              </span>
                            </div>
                            
                            {isActive && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsUsersListOpen(true);
                                }}
                              >
                                <Plus className="h-5 w-5" />
                              </Button>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
               </CardContent>
            </Card>

            <Card className="border-gray-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden border-dashed bg-gray-50/30 dark:bg-slate-900/10">
               <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 text-center">
                    Novo Perfil Personalizado
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <Input 
                        placeholder="NOME DO PERFIL" 
                        value={newProfileName}
                        onChange={(e) => setNewProfileName(e.target.value)}
                        className="h-12 rounded-xl border-gray-100 dark:border-slate-800 text-center font-black uppercase tracking-widest placeholder:text-gray-300"
                    />
                  </div>
                  <Button 
                      onClick={handleCreateProfile} 
                      disabled={!newProfileName || upsertMutation.isPending}
                      className="w-full h-11 bg-white hover:bg-gray-50 text-blue-600 border border-blue-100 shadow-none font-bold rounded-xl"
                  >
                     <Plus className="mr-2 h-4 w-4" />
                     ADICIONAR PERFIL
                  </Button>
               </CardContent>
            </Card>
          </div>

          {/* Main: Permissions Matrix */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="border-gray-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden min-h-[600px]">
              <CardHeader className="bg-white dark:bg-slate-950 px-8 py-6 border-b border-gray-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                   <div className="p-2.5 bg-gray-100 dark:bg-slate-800 rounded-xl">
                      <Lock className="h-5 w-5 text-gray-500" />
                   </div>
                   <div>
                    <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                      Matriz de Permissões
                    </CardTitle>
                    <CardDescription className="font-medium">
                      Definindo acessos para: <span className="text-blue-600 dark:text-blue-400 font-bold uppercase">{selectedProfile?.name || "..."}</span>
                    </CardDescription>
                   </div>
                </div>
                
                <div className="relative w-full md:w-80 group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    placeholder="Filtrar por nome ou grupo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-11 border-gray-100 dark:border-slate-800 focus:border-blue-400 focus:ring-blue-50 rounded-xl transition-all font-medium"
                  />
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-50/50 dark:bg-slate-900/50">
                    <TableRow className="border-b border-gray-100 dark:border-slate-800">
                      <TableHead className="py-4 pl-8 text-[11px] font-bold uppercase tracking-widest text-gray-500">Recurso / Módulo</TableHead>
                      <TableHead className="py-4 text-center w-36 text-[11px] font-bold uppercase tracking-widest text-gray-500">Visualizar</TableHead>
                      <TableHead className="py-4 text-center w-36 text-[11px] font-bold uppercase tracking-widest text-gray-500">Editar</TableHead>
                      <TableHead className="py-4 text-center w-36 text-[11px] font-bold uppercase tracking-widest text-gray-500">Excluir</TableHead>
                      <TableHead className="py-4 pr-8 text-center w-28 text-[11px] font-bold uppercase tracking-widest text-gray-500">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-sm">
                    {Object.entries(groupedResources).length === 0 ? (
                       <TableRow>
                          <TableCell colSpan={5} className="py-20 text-center">
                             <div className="flex flex-col items-center gap-3 text-gray-300">
                                <Search className="h-10 w-10 opacity-20" />
                                <p className="font-medium">Nenhum recurso encontrado com esse filtro.</p>
                             </div>
                          </TableCell>
                       </TableRow>
                    ) : (
                      Object.entries(groupedResources).map(([group, items]) => (
                        <Fragment key={group}>
                          <TableRow className="bg-gray-50/20 dark:bg-slate-900/20 group/header sticky top-0 z-10 backdrop-blur-md">
                            <TableCell colSpan={5} className="py-3 pl-8">
                               <div className="flex items-center gap-3">
                                  <div className="h-1 w-4 bg-blue-500 rounded-full" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">
                                    {group}
                                  </span>
                                  <div className="h-px flex-1 bg-gray-100 dark:bg-slate-800 ml-2" />
                               </div>
                            </TableCell>
                          </TableRow>
                          {items.map((res) => {
                            const perm = selectedProfile?.permissions[res.key] ?? { view: false, edit: false, delete: false };
                            const anyActive = perm.view || perm.edit || perm.delete;
                            
                            return (
                              <TableRow key={res.key} className="group hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors border-b border-gray-50 dark:border-slate-800/50">
                                <TableCell className="py-5 pl-8">
                                   <div className="flex flex-col gap-0.5">
                                      <span className={cn(
                                        "font-bold text-gray-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors",
                                        !anyActive && "opacity-60"
                                      )}>
                                        {res.label}
                                      </span>
                                      <span className="text-[11px] font-medium text-gray-400 font-mono tracking-tight lowercase truncate max-w-[200px]">
                                        {res.path || "interno"}
                                      </span>
                                   </div>
                                </TableCell>
                                <TableCell className="py-4 text-center">
                                   <div className="flex justify-center group/sw">
                                      <Switch 
                                          checked={perm.view} 
                                          onCheckedChange={(v) => updatePermission(res.key, "view", v)}
                                          className="data-[state=checked]:bg-blue-600"
                                      />
                                   </div>
                                </TableCell>
                                <TableCell className="py-4 text-center">
                                   <div className="flex justify-center group/sw">
                                      <Switch 
                                          checked={perm.edit} 
                                          onCheckedChange={(v) => updatePermission(res.key, "edit", v)}
                                          className="data-[state=checked]:bg-blue-600"
                                      />
                                   </div>
                                </TableCell>
                                <TableCell className="py-4 text-center">
                                   <div className="flex justify-center group/sw">
                                      <Switch 
                                          checked={perm.delete} 
                                          onCheckedChange={(v) => updatePermission(res.key, "delete", v)}
                                          className="data-[state=checked]:bg-blue-600"
                                      />
                                   </div>
                                </TableCell>
                                <TableCell className="py-4 pr-8 text-center">
                                   <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                      <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30"
                                          onClick={() => toggleAll(res.key, true)}
                                          title="Marcar todos"
                                      >
                                         <CheckCircle2 size={16} />
                                      </Button>
                                      <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-8 w-8 rounded-lg hover:bg-gray-100 hover:text-gray-500"
                                          onClick={() => toggleAll(res.key, false)}
                                          title="Desmarcar todos"
                                      >
                                         <Trash2 size={16} />
                                      </Button>
                                   </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
              
              {/* Profile Danger Zone */}
              {!isLoading && selectedProfile && (
                 <div className="p-8 bg-gray-50/30 dark:bg-slate-900/20 border-t border-gray-100 dark:border-slate-800 mt-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                       <div className="flex items-center gap-4">
                          <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-900/50">
                             <AlertCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                          </div>
                          <div>
                             <h4 className="font-bold text-gray-900 dark:text-white mb-0.5">Zona de Perigo</h4>
                             <p className="text-sm text-gray-500 font-medium tracking-tight">
                                A remoção do perfil <strong className="text-gray-900 dark:text-white uppercase">{selectedProfile.name}</strong> desvinculará todos os usuários associados.
                             </p>
                          </div>
                       </div>
                       
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <Button variant="outline" className="h-11 px-6 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold transition-all">
                                EXCLUIR PERFIL DEFINITIVAMENTE
                             </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
                             <AlertDialogHeader>
                                <AlertDialogTitle className="text-2xl font-bold flex items-center gap-3">
                                   <div className="p-2 bg-rose-50 rounded-xl">
                                      <Trash2 className="h-6 w-6 text-rose-600" />
                                   </div>
                                   Confirmar Exclusão
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-600 pt-2 text-base">
                                   Você tem certeza que deseja excluir o perfil <strong className="text-gray-900">{selectedProfile.name}</strong>? Esta ação é irreversível.
                                </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter className="pt-6">
                                <AlertDialogCancel className="h-11 px-6 rounded-xl font-medium border-gray-200">Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                    onClick={() => selectedProfile.id && handleDeleteProfile(selectedProfile.id)} 
                                    className="h-11 px-8 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-200/50"
                                >
                                   Confirmar Remoção
                                </AlertDialogAction>
                             </AlertDialogFooter>
                          </AlertDialogContent>
                       </AlertDialog>
                    </div>
                 </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Users List Dialog */}
      <Dialog open={isUsersListOpen} onOpenChange={setIsUsersListOpen}>
        <DialogContent className="max-w-2xl rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-blue-600 text-white">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-white/20 rounded-xl">
                      <Users className="h-6 w-6" />
                   </div>
                   <div>
                      <DialogTitle className="text-xl font-bold">Usuários Vinculados</DialogTitle>
                      <DialogDescription className="text-blue-100 font-medium opacity-90">
                        Perfil: <span className="uppercase font-extrabold">{selectedProfile?.name}</span>
                      </DialogDescription>
                   </div>
                </div>
                <button onClick={() => setIsUsersListOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                   <X className="h-5 w-5" />
                </button>
             </div>
          </DialogHeader>
          
          <div className="p-6">
            <ScrollArea className="h-[400px]">
               {isLoadingUsers ? (
                 <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Buscando lista...</p>
                 </div>
               ) : profileUsers?.items.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-30">
                    <UserRound className="h-16 w-16 text-gray-300" />
                    <p className="font-bold text-gray-500 uppercase tracking-widest text-xs">Nenhum usuário associado</p>
                 </div>
               ) : (
                 <div className="grid gap-3">
                   {profileUsers?.items.map((user) => (
                     <div 
                        key={user.id} 
                        className="group flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all"
                     >
                       <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-black text-xs">
                             {user.fullName?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                             <span className="block font-bold text-gray-900 text-sm">{user.fullName}</span>
                             <span className="text-[10px] text-gray-400 font-mono italic">{user.email}</span>
                          </div>
                       </div>
                       
                       <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-xl font-bold text-[10px] tracking-widest text-blue-600 hover:bg-blue-50"
                          onClick={() => setEditingUser({id: user.id, name: user.fullName || "", profileId: user.profileTypeId || 0})}
                       >
                          MUDAR PERFIL
                       </Button>
                     </div>
                   ))}
                 </div>
               )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Profile Confirmation */}
      <Dialog open={!!editingUser} onOpenChange={(o) => !o && setEditingUser(null)}>
        <DialogContent className="max-w-md rounded-2xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
               <div className="p-2 bg-blue-50 rounded-xl">
                  <UserPen className="h-5 w-5 text-blue-600" />
               </div>
               Alterar Perfil de Acesso
            </DialogTitle>
            <DialogDescription className="pt-2 font-medium">
               Selecione o novo nível de acesso para <strong className="text-gray-900">{editingUser?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6">
             <Label className="text-[10px] uppercase font-black text-gray-400 tracking-widest pl-1 mb-2 block">Novo Perfil</Label>
             <Select 
                value={editingUser?.profileId.toString()} 
                onValueChange={(v) => setEditingUser(prev => prev ? {...prev, profileId: Number(v)} : null)}
             >
                <SelectTrigger className="h-12 rounded-xl border-gray-200 font-bold uppercase tracking-wide text-blue-700">
                   <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-2xl border-gray-100">
                   {sortedProfiles.map(p => (
                      <SelectItem key={p.id} value={p.id?.toString() || ""} className="font-bold uppercase text-[10px] tracking-widest">
                         {p.name}
                      </SelectItem>
                   ))}
                </SelectContent>
             </Select>
          </div>

          <DialogFooter className="gap-2">
             <Button variant="ghost" onClick={() => setEditingUser(null)} className="h-11 rounded-xl font-bold">CANCELAR</Button>
             <Button 
                onClick={() => editingUser && handleUpdateUserEmail(editingUser.id, editingUser.profileId)} 
                className="h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold"
                disabled={updateUserMutation.isPending}
             >
                {updateUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "CONFIRMAR MUDANÇA"}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}



