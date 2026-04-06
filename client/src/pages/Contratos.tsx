import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ESTADOS_BRASIL } from "@shared/brasil";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronsUpDown, FileSpreadsheet, FileText, Pencil, Plus, Search, Trash2, X, Upload } from "lucide-react";
import { ContractImportModal } from "@/components/ContractImportModal";

type ClienteLite = { id: number; name: string; status?: string | null };

type Contract = {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  status: "ativo" | "inativo" | string;
  validityDate: string | null;
  isSpecial: boolean;
  createdAt: Date;
  coordinatorclienteId?: number | null;
  coordinatorName?: string | null;
};

function formatPrimeiroUltimoNome(fullName?: string | null) {
  const raw = (fullName ?? "").trim();
  if (!raw) return "";
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return raw;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export default function Contratos() {
  const { data: contracts, isLoading } = trpc.contracts.list.useQuery();
  // Não filtra por "ativo" aqui: contrato pode ter coordenador inativo/desligado e, na prática,
  // muitos cadastros ficam com status vazio. Preferimos listar todos e sinalizar no label.
  const ClientesQuery = trpc.clientes.list.useQuery({ page: 1, pageSize: 200 });
  const Clientes = useMemo<ClienteLite[]>(
    () => ((ClientesQuery.data ?? []) as Array<any>).map((c) => ({ id: c.id, name: c.name, status: c.status })),
    [ClientesQuery.data]
  );
  const contractsList = useMemo(() => (contracts ?? []) as Contract[], [contracts]);

  // Estados para modal de criação
  const [openCreate, setOpenCreate] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [validityDate, setValidityDate] = useState("");
  const [coordinatorOpen, setCoordinatorOpen] = useState(false);
  const [coordinatorId, setCoordinatorId] = useState<string>("");
  const [openImport, setOpenImport] = useState(false);

  // Estados para modal de edição
  const [openEdit, setOpenEdit] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editValidityDate, setEditValidityDate] = useState("");
  const [editStatus, setEditStatus] = useState<"ativo" | "inativo">("ativo");
  const [editCoordinatorOpen, setEditCoordinatorOpen] = useState(false);
  const [editCoordinatorId, setEditCoordinatorId] = useState<string>("");

  // Estados para exclusão
  const [openDelete, setOpenDelete] = useState(false);
  const [deletingContract, setDeletingContract] = useState<Contract | null>(null);

  // Estados para filtros
  const [filterName, setFilterName] = useState("");
  const [filterStatus, setFilterStatus] = useState<"todos" | "ativo" | "inativo">("todos");

  // Estados para ordenação
  const [sortColumn, setSortColumn] = useState<keyof Contract | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const utils = trpc.useUtils();

  const ClienteOptions = useMemo(() => {
    const list = (Clientes ?? []).map((c) => ({
      value: String(c.id),
      label:
        `${formatPrimeiroUltimoNome(c.name) || c.name}` +
        (c.status && c.status !== "ativo" ? ` (${String(c.status).toUpperCase()})` : ""),
      rawName: c.name,
    }));
    return list.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [Clientes]);

  const resolveCoordinatorLabel = (idStr?: string) => {
    if (!idStr) return "";
    return ClienteOptions.find((c) => c.value === idStr)?.label ?? "";
  };

  // Mutation para criar contrato
  const createMutation = trpc.contracts.create.useMutation({
    onSuccess: () => {
      toast.success("Contrato criado com sucesso!");
      setOpenCreate(false);
      setName("");
      setCity("");
      setState("");
      setValidityDate("");
      setCoordinatorId("");
      setCoordinatorOpen(false);
      utils.contracts.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao criar contrato: ${error.message}`);
    },
  });

  // Mutation para atualizar contrato
  const updateMutation = trpc.contracts.update.useMutation({
    onSuccess: () => {
      toast.success("Contrato atualizado com sucesso!");
      setOpenEdit(false);
      setEditingContract(null);
      setEditCoordinatorOpen(false);
      utils.contracts.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar contrato: ${error.message}`);
    },
  });

  // Mutation para excluir contrato permanentemente
  const deleteMutation = trpc.contracts.delete.useMutation({
    onSuccess: () => {
      toast.success("Contrato excluído com sucesso!");
      setOpenDelete(false);
      setDeletingContract(null);
      utils.contracts.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir contrato: ${error.message}`);
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const parsedCoordinator = coordinatorId ? Number(coordinatorId) : null;
    const safeCoordinator = coordinatorId && Number.isFinite(parsedCoordinator) ? parsedCoordinator : null;

    createMutation.mutate({
      name,
      city,
      state,
      status: "ativo",
      validityDate: validityDate || undefined,
      coordinatorclienteId: safeCoordinator,
    });
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setEditName(contract.name);
    setEditCity(contract.city || "");
    setEditState(contract.state || "");

    // Tratar validityDate que pode ser string ou null
    let formattedDate = "";
    if (contract.validityDate) {
      const dateStr = String(contract.validityDate);
      formattedDate = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    }
    setEditValidityDate(formattedDate);

    setEditStatus(contract.status as "ativo" | "inativo");
    setEditCoordinatorId(contract.coordinatorclienteId ? String(contract.coordinatorclienteId) : "");
    setOpenEdit(true);
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingContract) return;

    const parsedCoordinator = editCoordinatorId ? Number(editCoordinatorId) : null;
    const safeCoordinator = editCoordinatorId && Number.isFinite(parsedCoordinator) ? parsedCoordinator : null;

    updateMutation.mutate({
      id: editingContract.id,
      name: editName,
      city: editCity,
      state: editState,
      status: editStatus,
      validityDate: editValidityDate && editValidityDate.trim() !== "" ? editValidityDate : undefined,
      coordinatorclienteId: safeCoordinator,
    });
  };

  const handleDelete = (contract: Contract) => {
    setDeletingContract(contract);
    setOpenDelete(true);
  };

  const confirmDelete = () => {
    if (!deletingContract) return;
    deleteMutation.mutate({ id: deletingContract.id });
  };

  // Filtrar e ordenar contratos
  const filteredContracts = useMemo(() => {
    if (!contractsList.length) return [];

    let filtered = contractsList.filter((contract) => {
      const matchName = filterName === "" || String(contract.name ?? "").toLowerCase().includes(filterName.toLowerCase());
      const matchStatus = filterStatus === "todos" || String(contract.status) === filterStatus;
      return matchName && matchStatus;
    });

    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];

        if (aValue === null && bValue === null) return 0;
        if (aValue === null || aValue === undefined) return sortDirection === "asc" ? 1 : -1;
        if (bValue === null || bValue === undefined) return sortDirection === "asc" ? -1 : 1;

        let comparison = 0;
        if (typeof aValue === "string" && typeof bValue === "string") {
          comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === "number" && typeof bValue === "number") {
          comparison = aValue - bValue;
        } else if (aValue instanceof Date && bValue instanceof Date) {
          comparison = aValue.getTime() - bValue.getTime();
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return filtered;
  }, [contractsList, filterName, filterStatus, sortColumn, sortDirection]);

  const handleSort = (column: keyof Contract) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const exportToXLS = () => {
    if (!filteredContracts || filteredContracts.length === 0) {
      toast.error("Nenhum contrato para exportar");
      return;
    }

    const data = filteredContracts.map((contract) => ({
      ID: contract.id,
      Nome: contract.name,
      Coordenador: contract.coordinatorName ? formatPrimeiroUltimoNome(contract.coordinatorName) : "SEM COORDENADOR",
      Cidade: contract.city || "-",
      UF: contract.state || "-",
      Status: contract.status,
      Validade: contract.validityDate ? new Date(contract.validityDate).toLocaleDateString("pt-BR") : "-",
      Especial: contract.isSpecial ? "Sim" : "NAO",
      "Criado em": new Date(contract.createdAt).toLocaleDateString("pt-BR"),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contratos");
    XLSX.writeFile(wb, `contratos_${new Date().toISOString().split("T")[0]}.xlsx`);

    toast.success("Arquivo XLS exportado com sucesso!");
  };

  const exportToCSV = () => {
    if (!filteredContracts || filteredContracts.length === 0) {
      toast.error("Nenhum contrato para exportar");
      return;
    }

    const headers = ["ID", "Nome", "Coordenador", "Cidade", "UF", "Status", "Validade", "Especial", "Criado em"];
    const rows = filteredContracts.map((contract) => [
      contract.id,
      contract.name,
      contract.coordinatorName ? formatPrimeiroUltimoNome(contract.coordinatorName) : "SEM COORDENADOR",
      contract.city || "-",
      contract.state || "-",
      contract.status,
      contract.validityDate ? new Date(contract.validityDate).toLocaleDateString("pt-BR") : "-",
      contract.isSpecial ? "Sim" : "NAO",
      new Date(contract.createdAt).toLocaleDateString("pt-BR"),
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `contratos_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast.success("Arquivo CSV exportado com sucesso!");
  };

  const getStatusBadge = (status: string) => {
    return status === "ativo" ? (
      <Badge variant="default">ATIVO</Badge>
    ) : (
      <Badge variant="destructive">INATIVO</Badge>
    );
  };

  return (
    <Layout>
      <div className="container max-w-[1200px] mx-auto py-8 px-4">
        {/* Cabeçalho */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Contratos</h1>
          </div>
          <p className="text-gray-500 text-lg">
            Gerencie e monitore todos os contratos e convênios vinculados aos Clientes
          </p>
        </div>

        {/* Barra de Ações e Filtros */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100/80">
          <div className="flex flex-col md:flex-row gap-6 items-end justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
              {/* Busca */}
              <div className="flex-1 min-w-[280px]">
                <Label htmlFor="filterName" className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
                  Buscar Contrato
                </Label>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    id="filterName"
                    placeholder="Nome, cidade ou identificação..."
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className="pl-10 h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="w-full md:w-56">
                <Label htmlFor="filterStatus" className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
                  Status
                </Label>
                <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as "todos" | "ativo" | "inativo")}>
                  <SelectTrigger id="filterStatus" className="h-11 border-gray-200">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    <SelectItem value="ativo">Ativos</SelectItem>
                    <SelectItem value="inativo">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap md:flex-nowrap gap-3 w-full md:w-auto">
              {/* Botões de Exportação */}
              <div className="flex gap-2 flex-1 md:flex-none">
                <Button 
                  variant="outline" 
                  className="flex-1 md:flex-none h-11 border-emerald-100 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 transition-colors" 
                  onClick={exportToXLS}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  XLS
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 md:flex-none h-11 border-blue-100 text-blue-700 hover:bg-blue-50 hover:border-blue-200 transition-colors" 
                  onClick={exportToCSV}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </div>

              {/* Botão de Importação */}
              <Button 
                className="flex-1 md:flex-none h-11 border-indigo-100 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-200 transition-colors shadow-sm"
                onClick={() => setOpenImport(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar CSV
              </Button>

              <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogTrigger asChild>
                  <Button className="flex-1 md:flex-none h-11 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200/50" onClick={() => {
                    setName("");
                    setCity("");
                    setState("");
                    setValidityDate("");
                    setCoordinatorId("");
                    setCoordinatorOpen(false);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Contrato
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-3xl rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Novo Contrato</DialogTitle>
                    <DialogDescription>Preencha os dados básicos do novo contrato</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreate} className="space-y-6 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="name" className="text-sm font-medium">Nome do Contrato *</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Contrato Matriz - SE" required className="h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-sm font-medium">Cidade *</Label>
                        <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex.: Aracaju" required className="h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state" className="text-sm font-medium">UF *</Label>
                        <Select value={state} onValueChange={setState} required>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Selecione o estado" />
                          </SelectTrigger>
                          <SelectContent>
                            {ESTADOS_BRASIL.map((estado) => (
                              <SelectItem key={estado.sigla} value={estado.sigla}>
                                {estado.sigla} - {estado.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Coordenador</Label>
                        <Popover open={coordinatorOpen} onOpenChange={setCoordinatorOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={coordinatorOpen}
                              className="w-full justify-between h-11 bg-white hover:bg-gray-50 border-gray-200"
                              disabled={ClientesQuery.isLoading || ClientesQuery.isError}
                            >
                              <span className="truncate">
                                {coordinatorId ? resolveCoordinatorLabel(coordinatorId) || "Cliente não encontrado" : "Selecionar coordenador..."}
                              </span>
                              <Check className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar Cliente..." className="h-11" />
                              <CommandList className="max-h-64">
                                <CommandEmpty>Nenhum Cliente encontrado.</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="SEM COORDENADOR"
                                    onSelect={() => {
                                      setCoordinatorId("");
                                      setCoordinatorOpen(false);
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", coordinatorId === "" ? "opacity-100" : "opacity-0")} />
                                    Sem coordenador
                                  </CommandItem>
                                  {ClienteOptions.map((c) => (
                                    <CommandItem
                                      key={c.value}
                                      value={`${c.label} ${c.rawName} ${c.value}`}
                                      onSelect={() => {
                                        setCoordinatorId(c.value);
                                        setCoordinatorOpen(false);
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", coordinatorId === c.value ? "opacity-100" : "opacity-0")} />
                                      {c.label}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="validityDate" className="text-sm font-medium">Data de Validade</Label>
                        <Input id="validityDate" type="date" value={validityDate} onChange={(e) => setValidityDate(e.target.value)} className="h-11" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                      <Button type="button" variant="ghost" onClick={() => setOpenCreate(false)} className="h-11 px-6">
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createMutation.isPending} className="h-11 px-8 bg-blue-600 hover:bg-blue-700">
                        {createMutation.isPending ? "Criando..." : "Criar Contrato"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Tabela Principal */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100/80 mb-8">
          <div className="overflow-x-auto min-h-[400px]">
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-gray-50/80">
                  <TableRow className="hover:bg-transparent border-b border-gray-100">
                    <TableHead className="w-24 cursor-pointer py-4" onClick={() => handleSort("id")}>
                      <div className="flex items-center text-xs font-bold uppercase tracking-wider text-gray-500 pl-4">
                        ID
                        {sortColumn === "id" ? (
                          sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5 ml-2 text-blue-600" /> : <ArrowDown className="h-3.5 w-3.5 ml-2 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 ml-2 text-gray-300 group-hover:text-gray-400" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer py-4" onClick={() => handleSort("name")}>
                      <div className="flex items-center text-xs font-bold uppercase tracking-wider text-gray-500">
                        Nome do Contrato
                        {sortColumn === "name" ? (
                          sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5 ml-2 text-blue-600" /> : <ArrowDown className="h-3.5 w-3.5 ml-2 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 ml-2 text-gray-300 group-hover:text-gray-400" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Coordenador</TableHead>
                    <TableHead className="cursor-pointer py-4" onClick={() => handleSort("city")}>
                      <div className="flex items-center text-xs font-bold uppercase tracking-wider text-gray-500">
                        Cidade / UF
                        {sortColumn === "city" ? (
                          sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5 ml-2 text-blue-600" /> : <ArrowDown className="h-3.5 w-3.5 ml-2 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 ml-2 text-gray-300 group-hover:text-gray-400" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer py-4 text-center" onClick={() => handleSort("status")}>
                      <div className="flex items-center justify-center text-xs font-bold uppercase tracking-wider text-gray-500">
                        Status
                        {sortColumn === "status" ? (
                          sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5 ml-2 text-blue-600" /> : <ArrowDown className="h-3.5 w-3.5 ml-2 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 ml-2 text-gray-300 group-hover:text-gray-400" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer py-4 text-center" onClick={() => handleSort("validityDate")}>
                      <div className="flex items-center justify-center text-xs font-bold uppercase tracking-wider text-gray-500">
                        Validade
                        {sortColumn === "validityDate" ? (
                          sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5 ml-2 text-blue-600" /> : <ArrowDown className="h-3.5 w-3.5 ml-2 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 ml-2 text-gray-300 group-hover:text-gray-400" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-right py-4 pr-6 text-xs font-bold uppercase tracking-wider text-gray-500">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts && filteredContracts.length > 0 ? (
                    filteredContracts.map((contract) => (
                      <TableRow key={contract.id} className="group hover:bg-blue-50/40 transition-all duration-200 border-b border-gray-100 last:border-0">
                        <TableCell className="py-4 pl-4 font-medium text-gray-400 text-xs tracking-tight">#{contract.id}</TableCell>
                        <TableCell className="py-4">
                          <div className="font-bold text-gray-900 leading-tight group-hover:text-blue-700 transition-colors">
                            {contract.name}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                            {contract.coordinatorName ? formatPrimeiroUltimoNome(contract.coordinatorName) : "SEM COORDENADOR"}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 text-gray-600 font-medium whitespace-nowrap">
                          {contract.city || "-"}{contract.state ? `, ${contract.state}` : ""}
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <Badge className={cn(
                            "font-bold px-2 py-0.5 rounded-md border text-[10px]",
                            contract.status === "ativo" 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                              : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                          )}>
                            {String(contract.status).toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 text-center text-gray-600 font-medium tabular-nums">
                          {contract.validityDate ? new Date(contract.validityDate).toLocaleDateString("pt-BR") : "-"}
                        </TableCell>
                        <TableCell className="py-4 text-right pr-6">
                          <div className="flex justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors" 
                              disabled={contract.isSpecial} 
                              onClick={() => handleEdit(contract)} 
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors" 
                              disabled={contract.isSpecial} 
                              onClick={() => handleDelete(contract)} 
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-20 text-gray-400 bg-gray-50/30">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="h-10 w-10 text-gray-200" />
                          <p className="text-sm font-medium">Nenhum contrato encontrado com esses filtros</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

      {/* Modal de Edição */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="sm:max-w-3xl rounded-2xl shadow-xl border-gray-100">
          <DialogHeader className="pb-4 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Pencil className="h-6 w-6 text-blue-600" />
              Editar Contrato
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Atualize os dados e configurações do contrato institucional
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="editName" className="text-sm font-bold text-gray-700">Nome do Contrato *</Label>
                <Input id="editName" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Ex.: Contrato Matriz - SE" required className="h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-100 transition-all" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCity" className="text-sm font-bold text-gray-700">Cidade *</Label>
                <Input id="editCity" value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="Ex.: Aracaju" required className="h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-100 transition-all" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editState" className="text-sm font-bold text-gray-700">UF *</Label>
                <Select value={editState} onValueChange={setEditState} required>
                  <SelectTrigger className="h-11 border-gray-200 focus:ring-blue-100">
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BRASIL.map((estado) => (
                      <SelectItem key={estado.sigla} value={estado.sigla}>
                        {estado.sigla} - {estado.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-gray-700">Coordenador</Label>
                <Popover open={editCoordinatorOpen} onOpenChange={setEditCoordinatorOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={editCoordinatorOpen}
                      className="w-full justify-between h-11 bg-white border-gray-200 hover:bg-gray-50 flex"
                      disabled={ClientesQuery.isLoading || ClientesQuery.isError}
                    >
                      <span className="truncate">
                        {editCoordinatorId ? resolveCoordinatorLabel(editCoordinatorId) || "Cliente não encontrado" : "Selecionar coordenador..."}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-2xl border-gray-100" align="start">
                    <Command className="rounded-xl overflow-hidden">
                      <CommandInput placeholder="Buscar Cliente..." className="h-11 border-0 focus:ring-0" />
                      <CommandList className="max-h-64 scrollbar-thin scrollbar-thumb-gray-200">
                        <CommandEmpty className="py-6 text-sm text-gray-500 text-center">Nenhum Cliente encontrado.</CommandEmpty>
                        <CommandGroup className="p-1">
                          <CommandItem
                            value="SEM COORDENADOR"
                            className="rounded-lg h-10 px-2"
                            onSelect={() => {
                              setEditCoordinatorId("");
                              setEditCoordinatorOpen(false);
                            }}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-medium text-gray-500 italic">Sem coordenador</span>
                              <Check className={cn("h-4 w-4 text-blue-600", editCoordinatorId === "" ? "opacity-100" : "opacity-0")} />
                            </div>
                          </CommandItem>
                          <Separator className="my-1 mx-2 bg-gray-100" />
                          {ClienteOptions.map((c) => (
                            <CommandItem
                              key={c.value}
                              value={`${c.label} ${c.rawName} ${c.value}`}
                              className="rounded-lg h-11 px-2 mb-0.5"
                              onSelect={() => {
                                setEditCoordinatorId(c.value);
                                setEditCoordinatorOpen(false);
                              }}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="font-medium text-gray-900">{c.label}</span>
                                <Check className={cn("h-4 w-4 text-blue-600", editCoordinatorId === c.value ? "opacity-100" : "opacity-0")} />
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editValidityDate" className="text-sm font-bold text-gray-700">Data de Validade</Label>
                <Input id="editValidityDate" type="date" value={editValidityDate} onChange={(e) => setEditValidityDate(e.target.value)} className="h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-100 transition-all" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl border border-gray-100 transition-colors hover:bg-gray-50 group">
              <div className="space-y-1">
                <Label htmlFor="editStatus" className="text-sm font-bold text-gray-900 mb-0 pointer-events-none">Status do Contrato</Label>
                <p className="text-[11px] text-gray-500 leading-relaxed font-medium">Inativar o contrato impede que novos Clientes sejam vinculados a ele.</p>
              </div>
              <div className="flex items-center gap-4">
                <Badge className={cn(
                  "font-bold px-3 py-1 rounded-full text-[10px] tracking-widest border",
                  editStatus === "ativo" 
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                    : "bg-rose-100 text-rose-800 border-rose-200"
                )}>
                  {editStatus.toUpperCase()}
                </Badge>
                <Switch
                  id="editStatus"
                  checked={editStatus === "ativo"}
                  onCheckedChange={(checked) => setEditStatus(checked ? "ativo" : "inativo")}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
              <Button type="button" variant="ghost" onClick={() => setOpenEdit(false)} className="h-11 px-6 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all rounded-xl font-medium">
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} className="h-11 px-8 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200/50 rounded-xl font-bold transition-all">
                {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Exclusão */}
      <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-rose-50 rounded-xl">
                <Trash2 className="h-6 w-6 text-rose-600" />
              </div>
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
                <div className="py-2">
                  <p className="mb-4 text-gray-700">
                    Você está prestes a excluir permanentemente o contrato <strong className="text-gray-900">{deletingContract?.name}</strong>.
                  </p>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
                    <p className="font-semibold flex items-center gap-2 mb-1">
                      <span>⚠️</span> Atenção!
                    </p>
                    <p>Esta ação não pode ser desfeita e pode afetar o histórico de vínculos no sistema.</p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6">
              <AlertDialogCancel className="h-11 px-6">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white">
                Excluir Permanentemente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <ContractImportModal 
        open={openImport} 
        onOpenChange={setOpenImport}
        onSuccess={() => {
            utils.contracts.list.invalidate();
            // Opcional: toast.success("Importação concluída e lista atualizada!");
        }}
      />
    </Layout>
  );
}



