import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layout } from "@/components/Layout";
import { trpc, RouterOutputs } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search, UserRound, Eye, Pencil, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";

const userFormSchema = z.object({
  id: z.number().optional(),
  fullName: z.string().min(3, "Informe o nome completo"),
  nickname: z.string().min(2).optional().nullable(),
  email: z.string().email("E-mail inválido"),
  phone: z
    .string()
    .regex(/^\+55\d{10,11}$/, "Use o formato +5511999999999")
    .optional()
    .nullable(),
  departmentId: z.number().optional().nullable(),
  profileTypeId: z.number(),
  avatar: z.string().optional().nullable(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

type UserItem = RouterOutputs["users"]["list"]["items"][number];

function formatPhone(phone?: string | null) {
  if (!phone) return "-";
  return phone.replace(/(\+55)(\d{2})(\d{4,5})(\d{4})/, "+55 ($2) $3-$4");
}

const toUpper = (value?: string | null) => value?.toUpperCase() ?? "-";
const highlightBadgeClass =
  "border border-blue-200 bg-blue-50 text-blue-900 uppercase tracking-wide font-semibold";
const departmentPalette = [
  { bg: "bg-emerald-50", text: "text-emerald-900", border: "border-emerald-200" },
  { bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-200" },
  { bg: "bg-sky-50", text: "text-sky-900", border: "border-sky-200" },
  { bg: "bg-violet-50", text: "text-violet-900", border: "border-violet-200" },
  { bg: "bg-rose-50", text: "text-rose-900", border: "border-rose-200" },
  { bg: "bg-lime-50", text: "text-lime-900", border: "border-lime-200" },
  { bg: "bg-orange-50", text: "text-orange-900", border: "border-orange-200" },
  { bg: "bg-cyan-50", text: "text-cyan-900", border: "border-cyan-200" },
];
const getDepartmentBadgeClass = (departmentId?: number | null) => {
  if (!departmentId) {
    return "border border-slate-200 bg-slate-50 text-slate-800 uppercase tracking-wide font-semibold";
  }
  const color = departmentPalette[(departmentId - 1) % departmentPalette.length];
  return `border ${color.border} ${color.bg} ${color.text} uppercase tracking-wide font-semibold`;
};
const getEmailStatusBadgeClass = (isVerified?: boolean) =>
  isVerified
    ? "border border-emerald-200 bg-emerald-50 text-emerald-900 uppercase tracking-wide font-semibold"
    : "border border-rose-300 bg-rose-50 text-rose-900 uppercase tracking-wide font-semibold";

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Usuarios() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<number | undefined>();
  const [profileFilter, setProfileFilter] = useState<number | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewUser, setViewUser] = useState<UserItem | null>(null);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [postCreateModalOpen, setPostCreateModalOpen] = useState(false);
  const [lastCreatedNickname, setLastCreatedNickname] = useState<string | null>(null);
  const [lastCreatedInviteLink, setLastCreatedInviteLink] = useState<string | null>(null);
  const [confirmEditOpen, setConfirmEditOpen] = useState(false);
  const [pendingEditValues, setPendingEditValues] = useState<UserFormValues | null>(null);
  const getFriendlyErrorMessage = (message?: string) => {
    if (!message) return "Ocorreu um erro. Tente novamente.";
    const map: Record<string, string> = {
      EMAIL_IN_USE: "Já existe um usuário com esse e-mail.",
      PROFILE_TYPE_NOT_FOUND: "Perfil de acesso não encontrado.",
      SUPABASE_SYNC_FAILED: "Não foi possível sincronizar com o Supabase. Tente novamente.",
    };
    return map[message] ?? message;
  };

  const pageSize = 10;
  const filters = useMemo(
    () => ({
      page,
      pageSize,
      search: searchTerm || undefined,
      departmentId: departmentFilter,
      profileTypeId: profileFilter,
    }),
    [page, pageSize, searchTerm, departmentFilter, profileFilter]
  );

  const usersQuery = trpc.users.list.useQuery(filters);
  const profileTypesQuery = trpc.users.profileTypes.useQuery();
  const departmentsQuery = trpc.departments.list.useQuery();

  const handleEmailError = (message?: string) => {
    if (message?.includes("EMAIL_IN_USE")) {
      form.setError("email", {
        message: "Este e-mail já está cadastrado para outro usuário.",
      });
    }
  };

  const createUserMutation = trpc.users.create.useMutation({
    onSuccess: (created: any) => {
      setLastCreatedNickname(created?.nickname ?? created?.fullName ?? "Usuário");
      setLastCreatedInviteLink(created?.inviteLink ?? null);
      
      toast({
        title: "Novo usuário criado com sucesso",
        description: created?.inviteLink 
          ? "Redirecionando para a página de criação de senha..." 
          : "O convite foi enviado para o e-mail informado.",
      });

      if (created?.inviteLink) {
        // Pequeno atraso para o usuário ver o toast de sucesso
        setTimeout(() => {
          window.location.href = created.inviteLink;
        }, 1500);
      } else {
        setPostCreateModalOpen(true);
        usersQuery.refetch();
      }
    },
    onError: (error) => {
      handleEmailError(error.message);
      toast({
        title: "Erro ao cadastrar usuário",
        description: getFriendlyErrorMessage(error.message),
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Usuário atualizado com sucesso",
        description: "As informações foram sincronizadas.",
      });
      usersQuery.refetch();
      setPendingEditValues(null);
      setConfirmEditOpen(false);
      setIsDialogOpen(false);
    },
    onError: (error) => {
      handleEmailError(error.message);
      toast({
        title: "Erro ao atualizar usuário",
        description: getFriendlyErrorMessage(error.message),
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Usuário removido com sucesso",
      });
      usersQuery.refetch();
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir usuário",
        description: getFriendlyErrorMessage(error.message),
        variant: "destructive",
      });
    },
  });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      fullName: "",
      nickname: "",
      email: "",
      phone: "+55",
      departmentId: undefined,
      profileTypeId: undefined,
      avatar: null,
    },
  });

  const resetForm = useCallback(
    (user?: UserItem | null) => {
      const defaultProfile = profileTypesQuery.data?.[0]?.id;
      if (!user) {
        form.reset({
          fullName: "",
          nickname: "",
          email: "",
          phone: "+55",
          departmentId: undefined,
          profileTypeId: defaultProfile,
          avatar: null,
        });
        setEditingUser(null);
        return;
      }

      form.reset({
        id: user.id,
        fullName: user.fullName ?? "",
        nickname: user.nickname ?? "",
        email: user.email ?? "",
        phone: user.phone ?? "+55",
        departmentId: user.departmentId ?? undefined,
        profileTypeId: user.profileTypeId ?? defaultProfile,
        avatar: user.avatarUrl ?? null,
      });
      setEditingUser(user);
    },
    [form, profileTypesQuery.data]
  );

  const handleOpenCreate = () => {
    resetForm(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (user: UserItem) => {
    resetForm(user);
    setIsDialogOpen(true);
  };

  const handleViewUser = (user: UserItem) => {
    setViewUser(user);
  };

  const handleDeleteUser = (id: number) => {
    deleteUserMutation.mutate({ id });
  };

  const onSubmit = (values: UserFormValues) => {
    const { id, ...payload } = values;
    if (id) {
      updateUserMutation.mutate({ ...payload, id });
      return;
    }
    createUserMutation.mutate(payload);
  };

  const handleFormSubmission = (values: UserFormValues) => {
    if (values.id) {
      setPendingEditValues(values);
      setConfirmEditOpen(true);
      return;
    }
    createUserMutation.mutate(values);
  };

  const handleAvatarChange = async (file: File | null) => {
    if (!file) {
      form.setValue("avatar", null);
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    form.setValue("avatar", dataUrl, { shouldDirty: true });
  };

  const totalPages = usersQuery.data ? Math.ceil(usersQuery.data.total / pageSize) : 1;

  const profileOptions = profileTypesQuery.data ?? [];
  const departmentOptions = departmentsQuery.data ?? [];

  return (
    <Layout>
      <div className="container max-w-[1200px] mx-auto py-8 px-4">
        {/* Cabeçalho */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <UserRound className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Usuários</h1>
          </div>
          <p className="text-gray-500 text-lg">
            Gerencie operadores, administradores e níveis de acesso do sistema
          </p>
        </div>

        {/* Barra de Ações e Filtros */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100/80">
          <div className="flex flex-col md:flex-row gap-6 items-end justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
              {/* Busca */}
              <div className="flex-1 min-w-[280px]">
                <Label htmlFor="searchTerm" className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
                  Buscar Usuário
                </Label>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    id="searchTerm"
                    placeholder="Nome, e-mail ou apelido..."
                    value={searchTerm}
                    onChange={(e) => {
                      setPage(1);
                      setSearchTerm(e.target.value);
                    }}
                    className="pl-10 h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              {/* Departamento */}
              <div className="w-full md:w-56">
                <Label htmlFor="deptFilter" className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
                  Departamento
                </Label>
                <Select
                  value={departmentFilter?.toString() ?? "all"}
                  onValueChange={(value) => {
                    setPage(1);
                    setDepartmentFilter(value === "all" ? undefined : Number(value));
                  }}
                >
                  <SelectTrigger id="deptFilter" className="h-11 border-gray-200">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Departamentos</SelectItem>
                    {departmentOptions.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Perfil */}
              <div className="w-full md:w-56">
                <Label htmlFor="profileFilter" className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
                  Perfil de Acesso
                </Label>
                <Select
                  value={profileFilter?.toString() ?? "all"}
                  onValueChange={(value) => {
                    setPage(1);
                    setProfileFilter(value === "all" ? undefined : Number(value));
                  }}
                >
                  <SelectTrigger id="profileFilter" className="h-11 border-gray-200">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Perfis</SelectItem>
                    {profileOptions.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id.toString()}>
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleOpenCreate} 
              className="w-full md:w-auto h-11 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200/50"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </div>
        </div>

        {/* Tabela Principal */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100/80 mb-8">
          <div className="overflow-x-auto min-h-[400px]">
            <Table>
              <TableHeader className="bg-gray-50/80">
                <TableRow className="hover:bg-transparent border-b border-gray-100">
                  <TableHead className="w-[320px] py-4 pl-6 text-xs font-bold uppercase tracking-wider text-gray-500">Usuário</TableHead>
                  <TableHead className="py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Contato</TableHead>
                  <TableHead className="py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Status</TableHead>
                  <TableHead className="py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Departamento</TableHead>
                  <TableHead className="py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Perfil</TableHead>
                  <TableHead className="text-right py-4 pr-6 text-xs font-bold uppercase tracking-wider text-gray-500">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600/30" />
                        <p className="text-sm font-medium text-gray-400">Buscando usuários...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : usersQuery.data?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-24 bg-gray-50/30">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <UserRound className="h-14 w-14 mb-4 opacity-10" />
                        <p className="text-lg font-bold text-gray-900 leading-none mb-1">Nenhum usuário encontrado</p>
                        <p className="text-sm font-medium">Tente ajustar seus filtros de busca</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  usersQuery.data?.items.map((user) => (
                    <TableRow key={user.id} className="group hover:bg-blue-50/40 transition-all duration-200 border-b border-gray-100 last:border-0">
                      <TableCell className="py-4 pl-6">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-11 w-11 border-2 border-white shadow-sm transition-transform group-hover:scale-105">
                            {user.avatarUrl ? (
                              <AvatarImage src={user.avatarUrl} alt={user.fullName ?? ""} />
                            ) : null}
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold">
                              {user.fullName?.charAt(0)?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-gray-900 leading-tight group-hover:text-blue-700 transition-colors truncate">
                              {toUpper(user.fullName || user.nickname)}
                            </span>
                            <span className="text-xs text-gray-500 font-medium tracking-tight">@{user.nickname?.toLowerCase() || "sem-alias"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-700 leading-none mb-1 lowercase">{user.email}</span>
                          <span className="text-[11px] font-medium text-gray-400 tabular-nums">{formatPhone(user.phone)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <Badge className={cn(
                          "font-bold px-2.5 py-0.5 rounded-md border text-[10px] tracking-wider transition-colors",
                          user.isEmailVerified 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                          {user.isEmailVerified ? "VALIDADO" : "PENDENTE"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <Badge variant="outline" className="font-bold border-gray-100 text-gray-500 bg-gray-50 text-[10px] tracking-tight">
                          {toUpper(user.departmentName || "SEM DEPTO")}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <Badge className="bg-blue-50 text-blue-700 border-blue-100 font-bold text-[10px] hover:bg-blue-100 transition-colors">
                          {toUpper(user.profileName)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-right pr-6">
                        <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-all">
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleViewUser(user)} title="Visualizar">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleOpenEdit(user)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-500 hover:text-rose-700 hover:bg-rose-50" title="Excluir">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                  <div className="p-2 bg-rose-50 rounded-xl">
                                    <Trash2 className="h-6 w-6 text-rose-600" />
                                  </div>
                                  Confirmar Exclusão
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-600 pt-2 text-base">
                                  Você está prestes a excluir permanentemente o usuário <strong className="text-gray-900">{user.fullName}</strong>. Esta ação não poderá ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="pt-6">
                                <AlertDialogCancel className="h-11 px-6 rounded-xl font-medium border-gray-200">Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="h-11 px-8 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-200/50">
                                  Excluir Usuário
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {usersQuery.data && usersQuery.data.total > 0 && (
            <div className="p-5 bg-gray-50/50 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-500 font-medium">
                Mostrando <span className="text-gray-900 font-bold">{usersQuery.data.items.length}</span> de <span className="text-gray-900 font-bold">{usersQuery.data.total}</span> registros
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-gray-200" disabled={page === 1} onClick={() => setPage((prev) => Math.max(prev - 1, 1))}>
                  <Search className="h-4 w-4 rotate-180" />
                  <span className="sr-only">Anterior</span>
                </Button>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-sm font-bold shadow-sm">
                  <span className="text-blue-600">{page}</span>
                  <span className="text-gray-300">/</span>
                  <span className="text-gray-400">{Math.max(totalPages, 1)}</span>
                </div>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-gray-200" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>
                  <Plus className="h-4 w-4 rotate-45" />
                  <span className="sr-only">Próxima</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl rounded-2xl shadow-2xl border-gray-100 p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-gray-50/50 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <UserRound className="h-6 w-6 text-blue-600" />
              </div>
              {editingUser ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
            <DialogDescription className="text-gray-500 font-medium">
              {editingUser ? "Atualize as permissões e dados cadastrais do usuário" : "Cadastre novos operadores e defina seus níveis de acesso"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmission)} className="p-8 space-y-8">
              <div className="flex flex-col md:flex-row gap-10">
                {/* Avatar Upload Container */}
                <FormField
                  control={form.control}
                  name="avatar"
                  render={({ field }) => (
                    <FormItem className="flex flex-col items-center gap-5 rounded-3xl border-2 border-dashed border-gray-100 bg-gray-50/30 p-10 text-center md:w-1/3 transition-colors hover:bg-gray-50/50 group">
                      <div className="relative">
                        <Avatar className="h-32 w-32 border-4 border-white shadow-xl transition-transform group-hover:scale-105">
                          {field.value ? <AvatarImage src={field.value} /> : null}
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-4xl font-bold">
                            {(form.watch("fullName")?.charAt(0) ?? "U").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 p-2 bg-white rounded-full shadow-lg border border-gray-100 group-hover:text-blue-600 transition-colors">
                          <Plus className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <FormLabel className="text-sm font-bold text-gray-800 tracking-tight">Foto de Perfil</FormLabel>
                        <p className="text-[11px] text-gray-400 font-medium">JPG ou PNG • Max 2MB</p>
                      </div>
                      <FormControl>
                        <div className="relative w-full">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (event) => {
                              const file = event.target.files?.[0];
                              await handleAvatarChange(file ?? null);
                            }}
                            className="h-10 text-xs cursor-pointer opacity-0 absolute inset-0 z-10"
                          />
                          <Button type="button" variant="outline" className="w-full h-10 text-xs font-bold border-gray-200 rounded-xl hover:bg-white hover:border-blue-200 transition-all">
                             ADICIONAR FOTO
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-[10px] uppercase font-bold" />
                    </FormItem>
                  )}
                />

                <div className="flex-1 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="uppercase text-[11px] font-bold text-gray-400 tracking-widest">Nome Completo *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex.: Ricardo Palácio" {...field} className="h-12 border-gray-100 focus:border-blue-400 focus:ring-blue-50 rounded-xl transition-all font-medium" />
                          </FormControl>
                          <FormMessage className="text-[10px] uppercase font-bold" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nickname"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="uppercase text-[11px] font-bold text-gray-400 tracking-widest">Usuário (Alias) *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="ricardo.palacio"
                              {...field}
                              value={field.value ?? ""}
                              className="h-12 border-gray-100 focus:border-blue-400 focus:ring-blue-50 rounded-xl transition-all font-medium"
                            />
                          </FormControl>
                          <FormMessage className="text-[10px] uppercase font-bold" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="uppercase text-[11px] font-bold text-gray-400 tracking-widest">WhatsApp (+55)</FormLabel>
                          <FormControl>
                            <Input placeholder="+5511999999999" {...field} value={field.value ?? ""} className="h-12 border-gray-100 focus:border-blue-400 focus:ring-blue-50 rounded-xl transition-all font-medium tabular-nums" />
                          </FormControl>
                          <FormMessage className="text-[10px] uppercase font-bold" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-1.5 w-1.5 bg-blue-600 rounded-full" />
                  <h4 className="text-[11px] font-bold text-gray-900 uppercase tracking-[0.2em]">Configurações de Acesso</h4>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="md:col-span-3">
                        <FormLabel className="uppercase text-[11px] font-bold text-gray-400 tracking-widest">E-mail Institucional *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="usuario@Qualital.com.br" {...field} className="h-12 border-gray-100 focus:border-blue-400 focus:ring-blue-50 rounded-xl transition-all font-medium lowercase" />
                        </FormControl>
                        <FormMessage className="text-[10px] uppercase font-bold" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="departmentId"
                    render={({ field }) => (
                      <FormItem className="md:col-span-1.5">
                        <FormLabel className="uppercase text-[11px] font-bold text-gray-400 tracking-widest">Departamento</FormLabel>
                        <Select
                          value={field.value?.toString() ?? "none"}
                          onValueChange={(value) =>
                            field.onChange(value === "none" ? undefined : Number(value))
                          }
                        >
                          <FormControl>
                            <SelectTrigger className="h-12 border-gray-100 rounded-xl font-medium focus:ring-blue-50 transition-all">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl shadow-2xl border-gray-100">
                            <SelectItem value="none" className="font-medium text-gray-400 italic">Nenhum</SelectItem>
                            {departmentOptions.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id.toString()} className="font-medium">
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[10px] uppercase font-bold" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="profileTypeId"
                    render={({ field }) => (
                      <FormItem className="md:col-span-1.5">
                        <FormLabel className="uppercase text-[11px] font-bold text-gray-400 tracking-widest">Perfil de Acesso *</FormLabel>
                        <Select
                          value={field.value?.toString()}
                          onValueChange={(value) => field.onChange(Number(value))}
                        >
                          <FormControl>
                            <SelectTrigger className="h-12 border-gray-100 rounded-xl font-bold text-blue-700 bg-blue-50/30 border-blue-100/50 focus:ring-blue-100 transition-all">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl shadow-2xl border-gray-100">
                            {profileOptions.map((profile) => (
                              <SelectItem key={profile.id} value={profile.id.toString()} className="font-bold">
                                {profile.name.toUpperCase()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[10px] uppercase font-bold" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-8 border-t border-gray-100">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-12 px-8 text-gray-500 hover:text-gray-900 font-bold tracking-tight rounded-xl">
                  CANCELAR
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending || updateUserMutation.isPending} className="h-12 px-10 bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-200/50 rounded-xl transition-all">
                  {(createUserMutation.isPending || updateUserMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                  )}
                  {editingUser ? "SALVAR ALTERAÇÕES" : "CADASTRAR USUÁRIO"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={postCreateModalOpen} onOpenChange={setPostCreateModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lastCreatedNickname
                ? `O usuário ${lastCreatedNickname.toUpperCase()} foi cadastrado com sucesso!`
                : "Usuário cadastrado com sucesso!"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deseja cadastrar outro usuário?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel
              onClick={() => {
                setPostCreateModalOpen(false);
                setIsDialogOpen(false);
                setEditingUser(null);
              }}
            >
              Não
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setPostCreateModalOpen(false);
                resetForm(null);
                setIsDialogOpen(true);
              }}
            >
              Sim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmEditOpen} onOpenChange={setConfirmEditOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar edição</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja salvar as alterações para {toUpper(pendingEditValues?.fullName)}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmEditOpen(false);
                setPendingEditValues(null);
              }}
            >
              Não
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingEditValues?.id) {
                  updateUserMutation.mutate({
                    ...pendingEditValues,
                    id: pendingEditValues.id,
                  });
                }
              }}
            >
              Sim, salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(viewUser)}
        onOpenChange={(open) => {
          if (!open) setViewUser(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Detalhes do Usuário</DialogTitle>
            <DialogDescription>Informações completas do perfil</DialogDescription>
          </DialogHeader>
          {viewUser ? (
            (() => {
              const user = viewUser as UserItem;
              return (
                <div className="space-y-6 py-4">
                  <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 rounded-xl border border-gray-100 italic">
                    <Avatar className="h-24 w-24 border-4 border-white shadow-sm">
                      {user.avatarUrl ? <AvatarImage src={user.avatarUrl} /> : null}
                      <AvatarFallback className="bg-blue-600 text-white text-3xl font-bold">
                        {user.fullName?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-gray-900 leading-tight">{toUpper(user.fullName)}</h3>
                      <p className="text-blue-600 font-medium tracking-wide">@{user.nickname?.toLowerCase()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-3 items-center gap-4 py-3 border-b border-gray-50">
                      <span className="text-sm font-semibold text-gray-500 uppercase">E-mail</span>
                      <span className="col-span-2 text-gray-900 font-medium text-right truncate">{user.email}</span>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4 py-3 border-b border-gray-50">
                      <span className="text-sm font-semibold text-gray-500 uppercase">Telefone</span>
                      <span className="col-span-2 text-gray-900 font-medium text-right">{formatPhone(user.phone)}</span>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4 py-3 border-b border-gray-50">
                      <span className="text-sm font-semibold text-gray-500 uppercase">Departamento</span>
                      <div className="col-span-2 text-right">
                        <Badge variant="outline" className="font-semibold bg-white">
                          {toUpper(user.departmentName || "Não Definido")}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4 py-3 border-b border-gray-50">
                      <span className="text-sm font-semibold text-gray-500 uppercase">Perfil</span>
                      <div className="col-span-2 text-right">
                        <Badge className="bg-blue-100 text-blue-800 font-semibold">
                          {toUpper(user.profileName)}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4 py-3">
                      <span className="text-sm font-semibold text-gray-500 uppercase">Status</span>
                      <div className="col-span-2 text-right">
                        <Badge className={cn(
                          "font-semibold",
                          user.isEmailVerified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        )}>
                          {user.isEmailVerified ? "VALIDADO" : "PENDENTE"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewUser(null)} className="w-full h-11">
              Fechar Detalhes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}



