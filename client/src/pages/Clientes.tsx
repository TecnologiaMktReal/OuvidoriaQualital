import { useState, useMemo, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/_core/hooks/useAuth";
import { ClienteImportModal } from "@/components/ClienteImportModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Plus, Pencil, Trash2, Search, FileSpreadsheet, FileText, X, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, AlertCircle, Loader2, CreditCard, Receipt, Award, Users, Eye, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { ESTADOS_BRASIL } from "../../../shared/brasil";
import { BANCOS_BRASIL } from "../../../shared/bancos";
import { IMaskInput } from 'react-imask';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Cliente = {
  id: number;
  registrationNumber: number;
  name: string;
  document: string;
  birthDate: string | null;
  motherName: string | null;
  fatherName: string | null;
  birthCity: string | null;
  birthState: string | null;
  admissionDate: string | null;
  associationDate: string | null;
  terminationDate: string | null;
  position: string | null;
  status: string;
  contractId: number | null;
  email: string | null;
  whatsappNumber: string | null;
  secondaryPhone: string | null;
  street: string | null;
  addressNumber: string | null;
  neighborhood: string | null;
  complement: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  isCliente: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type clientePhone = {
  id: number;
  phone: string;
  phoneType: string;
};

type clienteEmail = {
  id: number;
  email: string;
};

// Função para formatar CPF
const formatCPF = (cpf: string) => {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export default function Clientes() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [openAllWarning, setOpenAllWarning] = useState(false);

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [contractFilter, setContractFilter] = useState<string>("todos");
  const [coopTypeFilter, setCoopTypeFilter] = useState<string>("todos");

  const listQuery = trpc.clientes.list.useQuery({
    page,
    pageSize,
    status: statusFilter === 'todos' ? undefined : statusFilter as any,
    search: searchTerm || undefined,
    contractId: contractFilter === 'todos' || contractFilter === 'sem_contrato' ? undefined : Number(contractFilter),
    isCliente: coopTypeFilter === 'todos' ? undefined : coopTypeFilter === 'Cliente'
  }, {
    keepPreviousData: true
  });

  const Clientes = listQuery.data as unknown as Cliente[] | undefined;
  const { user: currentUser } = useAuth();
  const { isLoading } = listQuery;

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, contractFilter, coopTypeFilter, pageSize]);

  const contractsQuery = trpc.contracts.list.useQuery();
  const contracts = contractsQuery.data as any[] | undefined;
  const utils = trpc.useUtils();
  
  // Estados para modal de criação/edição unificado
  const [openCreate, setOpenCreate] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [motherName, setMotherName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [birthCity, setBirthCity] = useState("");
  const [birthState, setBirthState] = useState("");
  const [associationDate, setAssociationDate] = useState("");
  const [terminationDate, setTerminationDate] = useState("");
  const [position, setPosition] = useState("");
  const [status, setStatus] = useState("ativo");
  const [contractId, setContractId] = useState("sem_contrato");
  const [email, setEmail] = useState("");
  
  // Telefones
  const [whatsappCountryCode, setWhatsappCountryCode] = useState("+55");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [secondaryCountryCode, setSecondaryCountryCode] = useState("+55");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  
  // Endereço
  const [street, setStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [complement, setComplement] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);
  
  // Dados Bancários
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountType, setAccountType] = useState<"salario" | "corrente" | "poupanca">("corrente");
  const [agency, setAgency] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountDigit, setAccountDigit] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [isCliente, setIsCliente] = useState(true);
  
  // Múltiplos Contatos
  const [additionalPhones, setAdditionalPhones] = useState<string[]>([]);
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([]);
  
  // Validação de campos
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  // Buscar CEP automaticamente
  const handleCepChange = async (cep: string) => {
    setZipCode(cep);
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setStreet(data.logradouro || "");
          setNeighborhood(data.bairro || "");
          setCity(data.localidade || "");
          setState(data.uf || "");
          toast.success("Endereço preenchido automaticamente!");
        } else {
          toast.error("CEP não encontrado");
        }
      } catch (error) {
        toast.error("Erro ao buscar CEP");
      } finally {
        setLoadingCep(false);
      }
    }
  };
  
  // Atualizar PIX automaticamente quando CPF mudar
  useEffect(() => {
    const cleanDoc = document.replace(/\D/g, '');
    if (cleanDoc && cleanDoc.length >= 11) {
      setPixKey(cleanDoc);
    }
  }, [document]);
  
  // Validar campos obrigatórios
  const isFormValid = () => {
    const hasName = !!name.trim();
    const hasDoc = document.replace(/\D/g, '').length === 11 || (document === "" && !isCliente);
    const hasReg = !isCliente || !!registrationNumber;
    const hasContract = !isCliente || (contractId && contractId !== "sem_contrato");
    return hasName && hasDoc && hasReg && hasContract;
  };
  
  // Marcar campo como tocado
  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };
  
  // Estados para modal de dados bancários
  const [openBankData, setOpenBankData] = useState(false);
  const [selectedclienteId, setSelectedclienteId] = useState<number | null>(null);
  
  // Query para buscar dados bancários
  const { data: bankData, isLoading: isBankDataLoading } = trpc.clientes.bankData.get.useQuery(
    { clienteId: selectedclienteId! },
    { enabled: selectedclienteId !== null }
  );
  
  // Estados para exclusão
  const [openDelete, setOpenDelete] = useState(false);
  const [deletingCliente, setDeletingCliente] = useState<Cliente | null>(null);

  // Não Cliente
  const [openNonCoop, setOpenNonCoop] = useState(false);
  const [nonCoopMode, setNonCoopMode] = useState<"create" | "edit">("create");
  const [editingNonCoopId, setEditingNonCoopId] = useState<number | null>(null);
  const [nonCoopCategoria, setNonCoopCategoria] = useState<"parceiro" | "fornecedor" | "pessoa_fisica">("parceiro");
  const [nonCoopPessoaTipo, setNonCoopPessoaTipo] = useState<"pf" | "pj">("pf");
  const [nonCoopNome, setNonCoopNome] = useState("");
  const [nonCoopDocumento, setNonCoopDocumento] = useState("");
  const [nonCoopContato, setNonCoopContato] = useState("");
  const [nonCoopTelefone, setNonCoopTelefone] = useState("");
  const [nonCoopObs, setNonCoopObs] = useState("");
  const [nonCoopList, setNonCoopList] = useState<
    Array<{ id: number; categoria: string; pessoaTipo: "pf" | "pj"; nome: string; documento?: string; contato?: string; telefone?: string; observacoes?: string; createdAt: Date }>
  >([]);
  const [showNonCoopTable, setShowNonCoopTable] = useState(false);
  
  // Estados para ordenação
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  const [openLinkTickets, setOpenLinkTickets] = useState(false);
  const [linkableTicketsCount, setLinkableTicketsCount] = useState(0);
  const [linkTargetCliente, setLinkTargetCliente] = useState<{ clienteId: number; identifiers: string[] } | null>(null);
  
  // Estado para importação
  const [openImport, setOpenImport] = useState(false);

  const linkTicketsMutation = trpc.clientes.linkTickets.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.affectedRows} tickets vinculados com sucesso!`);
      utils.tickets.list.invalidate();
      setOpenLinkTickets(false);
    },
    onError: (error) => {
      toast.error(`Erro ao vincular tickets: ${error.message}`);
    }
  });

  const createMutation = trpc.clientes.create.useMutation({
    onSuccess: async (data) => {
      toast.success("Cliente criado com sucesso!");
      utils.Clientes.list.invalidate();
      setOpenCreate(false);
      
      // Verificar se existem tickets para vincular
      const identifiers = [
        email, 
        whatsappNumber ? `${whatsappCountryCode} ${whatsappNumber}` : '', 
        secondaryPhone ? `${secondaryCountryCode} ${secondaryPhone}` : '',
        ...additionalPhones,
        ...additionalEmails
      ].map(id => id.replace(/\s/g, "")).filter(Boolean);

      if (identifiers.length > 0) {
        try {
          console.log("[DEBUG] Checking unlinked tickets for (create):", identifiers);
          const count = await utils.Clientes.checkUnlinkedTickets.fetch({ identifiers });
          console.log("[DEBUG] Unlinked tickets count (create):", count);
          if (count > 0) {
            setLinkableTicketsCount(count);
            setLinkTargetCliente({ clienteId: data.id, identifiers });
            setOpenLinkTickets(true);
          }
        } catch (err) {
          console.error("Erro ao verificar tickets órfãos:", err);
        }
      }

      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao criar Cliente: ${error.message}`);
    },
  });
  
  const updateMutation = trpc.clientes.update.useMutation({
    onSuccess: async () => {
      toast.success("Cliente atualizado com sucesso!");
      utils.Clientes.list.invalidate();
      setOpenCreate(false);

      if (editingId) {
        const identifiers = [
          email, 
          whatsappNumber ? `${whatsappCountryCode} ${whatsappNumber}` : '', 
          secondaryPhone ? `${secondaryCountryCode} ${secondaryPhone}` : '',
          ...additionalPhones,
          ...additionalEmails
        ].map(id => id.replace(/\s/g, "")).filter(Boolean);

        if (identifiers.length > 0) {
          try {
            console.log("[DEBUG] Checking unlinked tickets for (update):", identifiers);
            const count = await utils.Clientes.checkUnlinkedTickets.fetch({ identifiers });
            console.log("[DEBUG] Unlinked tickets count (update):", count);
            if (count > 0) {
              setLinkableTicketsCount(count);
              setLinkTargetCliente({ clienteId: editingId, identifiers });
              setOpenLinkTickets(true);
            }
          } catch (err) {
            console.error("Erro ao verificar tickets órfãos:", err);
          }
        }
      }

      resetForm();
      setMode('create');
      setEditingId(null);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar Cliente: ${error.message}`);
    },
  });
  
  const resetNonCoopForm = () => {
    setNonCoopCategoria("parceiro");
    setNonCoopPessoaTipo("pf");
    setNonCoopNome("");
    setNonCoopDocumento("");
    setNonCoopContato("");
    setNonCoopTelefone("");
    setNonCoopObs("");
    setEditingNonCoopId(null);
    setNonCoopMode("create");
  };

  const handleSubmitNonCoop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nonCoopNome.trim()) {
      toast.error("Informe o nome");
      return;
    }

    const payload = {
      name: nonCoopNome.trim(),
      document: nonCoopDocumento.replace(/\D/g, '') || "",
      whatsappNumber: nonCoopTelefone.trim() || undefined,
      email: nonCoopContato.trim() || undefined,
      status: "ativo" as const,
      isCliente: false,
      registrationNumber: 0, // Placeholder for mandatory field in schema (though I removed notNull, the type might still require it)
      position: nonCoopCategoria,
    };

    if (editingNonCoopId && nonCoopMode === 'edit') {
      updateMutation.mutate({
        id: editingNonCoopId,
        ...payload,
      });
    } else {
      createMutation.mutate(payload);
    }
    
    setOpenNonCoop(false);
  };


  const deleteMutation = trpc.clientes.delete.useMutation({
    onSuccess: () => {
      toast.success("Cliente excluído com sucesso!");
      utils.Clientes.list.invalidate();
      setOpenDelete(false);
    },
    onError: (error) => {
      toast.error(`Erro ao excluir Cliente: ${error.message}`);
    },
  });

  const deleteWithHistoryMutation = trpc.clientes.deleteWithHistory.useMutation({
    onSuccess: () => {
      toast.success("Cliente e todo o histórico excluídos com sucesso!");
      utils.Clientes.list.invalidate();
      setOpenDelete(false);
    },
    onError: (error) => {
      toast.error(`Erro ao excluir histórico: ${error.message}`);
    },
  });
  
  const resetForm = () => {
    setRegistrationNumber("");
    setName("");
    setDocument("");
    setBirthDate("");
    setMotherName("");
    setFatherName("");
    setBirthCity("");
    setBirthState("");
    setAssociationDate("");
    setTerminationDate("");
    setPosition("");
    setStatus("ativo");
  setContractId("sem_contrato");
    setEmail("");
    setWhatsappCountryCode("+55");
    setWhatsappNumber("");
    setSecondaryCountryCode("+55");
    setSecondaryPhone("");
    setStreet("");
    setAddressNumber("");
    setNeighborhood("");
    setComplement("");
    setCity("");
    setState("");
    setZipCode("");
    setBankCode("");
    setBankName("");
    setAccountType("corrente");
    setAgency("");
    setAccountNumber("");
    setAccountDigit("");
    setPixKey("");
    setIsCliente(true);
    setAdditionalPhones([]);
    setAdditionalEmails([]);
    setTouched({});
  };
  
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedContractId = contractId && contractId !== "sem_contrato"
      ? Number(contractId)
      : undefined;
    const safeContractId = Number.isNaN(parsedContractId as number) ? undefined : parsedContractId;

    const ClienteData = {
      registrationNumber: registrationNumber ? parseInt(registrationNumber) : 0,
      name,
      document: document.replace(/\D/g, ''),
      isCliente,
      additionalPhones,
      additionalEmails,
      birthDate: birthDate || undefined,
      motherName: motherName || undefined,
      fatherName: fatherName || undefined,
      birthCity: birthCity || undefined,
      birthState: birthState || undefined,
      associationDate: associationDate || undefined,
      terminationDate: terminationDate || undefined,
      position: position || undefined,
      status: status as "ativo" | "inativo" | "desligado",
      contractId: safeContractId,
      email: email || undefined,
      whatsappNumber: whatsappNumber ? `${whatsappCountryCode} ${whatsappNumber}` : undefined,
      secondaryPhone: secondaryPhone ? `${secondaryCountryCode} ${secondaryPhone}` : undefined,
      street: street || undefined,
      addressNumber: addressNumber || undefined,
      neighborhood: neighborhood || undefined,
      complement: complement || undefined,
      city: city || undefined,
      state: state || undefined,
      zipCode: zipCode ? zipCode.replace(/\D/g, '') : undefined,
      // Dados bancários (campos individuais, não objeto aninhado)
      bankCode: bankCode || undefined,
      bankName: bankName || undefined,
      accountType: bankCode ? accountType : undefined,
      agency: agency || undefined,
      accountNumber: accountNumber || undefined,
      accountDigit: accountDigit || undefined,
      pixKey: pixKey || undefined,
    };
    
    if (mode === 'create') {
      createMutation.mutate(ClienteData);
    } else if (mode === 'edit' && editingId) {
      updateMutation.mutate({
        id: editingId,
        ...ClienteData,
      });
    }
  };
  
  const handleEdit = async (Cliente: Cliente) => {
    // Tratamento robusto de datas
    const formatDateForInput = (date: any) => {
    if (!date) return "";
    
    // Se for um objeto Date
    if (date instanceof Date || (typeof date === 'object' && date.toISOString)) {
      try {
        return date.toISOString().split('T')[0];
      } catch (e) {
        console.error("Erro ao formatar data:", e);
      }
    }
    
    const dateStr = String(date);
    // Formato ISO: 2023-02-25T00:00:00.000Z
    if (dateStr.includes('T')) {
      return dateStr.split('T')[0];
    }
    
    // Se já estiver no formato YYYY-MM-DD, retorna direto
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return dateStr.substring(0, 10);
    }

    return dateStr;
  };
    
    // Preencher todos os campos do modal unificado
    setMode('edit');
    setEditingId(Cliente.id);
    setRegistrationNumber(Cliente.registrationNumber.toString());
    setName(Cliente.name);
    setDocument(Cliente.document);
    setBirthDate(formatDateForInput(Cliente.birthDate));
    setMotherName(Cliente.motherName || "");
    setFatherName(Cliente.fatherName || "");
    setBirthCity(Cliente.birthCity || "");
    setBirthState(Cliente.birthState || "");
    setAssociationDate(formatDateForInput(Cliente.associationDate));
    setTerminationDate(formatDateForInput(Cliente.terminationDate));
    setPosition(Cliente.position || "");
    setIsCliente(Cliente.isCliente);
    setStatus(Cliente.status as "ativo" | "inativo" | "desligado");
    setContractId(Cliente.contractId ? Cliente.contractId.toString() : "sem_contrato");
    setEmail(Cliente.email || "");
    
    // Telefones (extrair código do país se existir)
    const extractPhone = (fullNumber: string | null) => {
      if (!fullNumber) return { code: "+55", number: "" };
      const match = fullNumber.match(/^(\+\d{1,3})(.*)$/);
      if (match) {
        return { code: match[1], number: match[2].trim() };
      }
      return { code: "+55", number: fullNumber };
    };
    
    const whatsapp = extractPhone(Cliente.whatsappNumber);
    setWhatsappCountryCode(whatsapp.code);
    setWhatsappNumber(whatsapp.number);
    
    const secondary = extractPhone(Cliente.secondaryPhone);
    setSecondaryCountryCode(secondary.code);
    setSecondaryPhone(secondary.number);
    
    // Endereço
    setStreet(Cliente.street || "");
    setAddressNumber(Cliente.addressNumber || "");
    setNeighborhood(Cliente.neighborhood || "");
    setComplement(Cliente.complement || "");
    setCity(Cliente.city || "");
    setState(Cliente.state || "");
    setZipCode(Cliente.zipCode || "");
    
    // Buscar telefones e e-mails adicionais
    try {
      const phones = await utils.Clientes.phones.list.fetch({ clienteId: Cliente.id });
      setAdditionalPhones(phones.filter(p => p.isActive && p.phoneType === "secundario").map(p => p.phone));
      
      const emails = await utils.Clientes.emails.list.fetch({ clienteId: Cliente.id });
      setAdditionalEmails(emails.filter(e => e.isActive).map(e => e.email));
    } catch (error) {
      console.error("Erro ao buscar contatos adicionais:", error);
    }
    
    // Buscar dados bancários
    try {
      const bankData = await utils.Clientes.bankData.get.fetch({ clienteId: Cliente.id });
      if (bankData) {
        setBankCode(bankData.bankCode || "");
        setBankName(bankData.bankName || "");
        setAccountType(bankData.accountType as "salario" | "corrente" | "poupanca" || "corrente");
        setAgency(bankData.agency || "");
        setAccountNumber(bankData.accountNumber || "");
        setAccountDigit(bankData.accountDigit || "");
        setPixKey(bankData.pixKey || "");
      }
    } catch (error) {
      console.error("Erro ao buscar dados bancários:", error);
    }
    
    setOpenCreate(true);
  };
  
  
  const handleDelete = (Cliente: Cliente) => {
    setDeletingCliente(Cliente);
    setOpenDelete(true);
  };
  
  const confirmDelete = () => {
    if (!deletingCliente) return;
    deleteMutation.mutate({ id: deletingCliente.id });
  };
  
  // Ordenar Clientes (o filtro já é feito no servidor agora)
  const sortedClientes: Cliente[] | undefined = useMemo(() => {
    if (!Clientes) return undefined;
    
    return [...Clientes].sort((a, b) => {
      if (!sortColumn) return 0;
      
      let aValue: any = a[sortColumn as keyof Cliente];
      let bValue: any = b[sortColumn as keyof Cliente];
      
      // Tratamento de valores nulos
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      // Comparação
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [Clientes, sortColumn, sortDirection]);
  
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };
  
  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-2 text-muted-foreground" />;
    }
    return sortDirection === "asc" ? 
      <ArrowUp className="h-4 w-4 ml-2" /> : 
      <ArrowDown className="h-4 w-4 ml-2" />;
  };
  
  const exportToXLS = () => {
    if (!sortedClientes) return;
    
    const data = sortedClientes.map((c) => ({
      ID: c.id,
      Matricula: c.registrationNumber,
      Nome: c.name,
      CPF: formatCPF(c.document),
      Cargo: c.position || "",
      Status: c.status === "ativo" ? "ATIVO" : c.status === "inativo" ? "INATIVO" : "DESLIGADO",
      Contrato: contracts?.find(ct => ct.id === c.contractId)?.name || "SEM CONTRATO",
      Email: c.email || "",
      WhatsApp: c.whatsappNumber || "",
      Telefone: c.secondaryPhone || "",
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, `Clientes_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success("Arquivo XLS exportado com sucesso!");
  };
  
  const exportToCSV = () => {
    if (!sortedClientes) return;
    
    const headers = ["ID", "Matricula", "Nome", "CPF", "Cargo", "Status", "Contrato", "Email", "WhatsApp", "Telefone"];
    const rows = sortedClientes.map((c) => [
      c.id,
      c.registrationNumber,
      c.name,
      formatCPF(c.document),
      c.position || "",
      c.status === "ativo" ? "ATIVO" : c.status === "inativo" ? "INATIVO" : "DESLIGADO",
      contracts?.find(ct => ct.id === c.contractId)?.name || "SEM CONTRATO",
      c.email || "",
      c.whatsappNumber || "",
      c.secondaryPhone || "",
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = window.document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Clientes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success("Arquivo CSV exportado com sucesso!");
  };
  
  return (
    <Layout>
      <div className="container mx-auto py-8">
        {/* Cabeçalho */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          </div>
          <p className="text-gray-600">
            Gerencie os Clientes, parceiros e fornecedores do sistema
          </p>
        </div>

        {/* Barra de Ações e Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4 items-end justify-between mb-6 pb-6 border-b border-gray-50">
            <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
              {/* Busca */}
              <div className="flex-1 min-w-[250px]">
                <Label htmlFor="search" className="text-xs font-semibold uppercase text-gray-500 mb-2 block">
                  Buscar Cliente
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Nome, CPF ou Matrícula..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="w-full md:w-48">
                <Label htmlFor="statusFilter" className="text-xs font-semibold uppercase text-gray-500 mb-2 block">
                  Status
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="statusFilter" className="h-11">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    <SelectItem value="ativo">Ativos</SelectItem>
                    <SelectItem value="inativo">Inativos</SelectItem>
                    <SelectItem value="desligado">Desligados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-56">
                <Label htmlFor="contractFilter" className={`${isCliente ? 'text-red-600' : 'text-gray-500'} text-xs font-semibold uppercase mb-2 block`}>
                  Contrato {isCliente && "*"}
                </Label>
                <Select value={contractFilter} onValueChange={setContractFilter}>
                  <SelectTrigger id="contractFilter" className="h-11">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Contratos</SelectItem>
                    <SelectItem value="sem_contrato">Sem Contrato</SelectItem>
                    {contracts?.map((contract) => (
                      <SelectItem key={contract.id} value={contract.id.toString()}>
                        {contract.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Coop Type Filter */}
              <div className="w-full md:w-56">
                <Label htmlFor="coopTypeFilter" className="text-xs font-semibold uppercase text-gray-500 mb-2 block">
                  Tipo de Cliente
                </Label>
                <Select value={coopTypeFilter} onValueChange={setCoopTypeFilter}>
                  <SelectTrigger id="coopTypeFilter" className="h-11">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Tipos</SelectItem>
                    <SelectItem value="Cliente">Apenas Clientes</SelectItem>
                    <SelectItem value="nao_Cliente">Não Clientes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Exportação */}
            <div className="flex gap-2 w-full md:w-auto order-2 md:order-1">
              <Button variant="outline" className="flex-1 md:flex-none h-11" onClick={exportToXLS}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                Exportar XLS
              </Button>
              <Button variant="outline" className="flex-1 md:flex-none h-11" onClick={exportToCSV}>
                <FileText className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <Button variant="outline" className="flex-1 md:flex-none h-11" onClick={() => setOpenImport(true)}>
                <Upload className="h-4 w-4 mr-2 text-indigo-600" />
                Importar CSV
              </Button>
            </div>

            {/* Ações de Criação */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto order-1 md:order-2">
              <Dialog
                open={openNonCoop}
                onOpenChange={(v) => {
                  setOpenNonCoop(v);
                  if (!v) resetNonCoopForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 md:flex-none h-11 border-blue-200 text-blue-700 hover:bg-blue-50"
                    onClick={() => {
                      resetNonCoopForm();
                      setNonCoopMode("create");
                      setOpenNonCoop(true);
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Novo Não Cliente
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{nonCoopMode === "create" ? "Criar Não Cliente" : "Editar Não Cliente"}</DialogTitle>
                    <DialogDescription>Cadastre parceiros/fornecedores ou pessoas físicas/jurídicas não cooperadas.</DialogDescription>
                  </DialogHeader>
                  <form className="space-y-4" onSubmit={handleSubmitNonCoop}>
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Select value={nonCoopCategoria} onValueChange={(v) => setNonCoopCategoria(v as any)}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="parceiro">Parceiro</SelectItem>
                          <SelectItem value="fornecedor">Fornecedor</SelectItem>
                          <SelectItem value="pessoa_fisica">Pessoa Física (geral)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Tipo de Pessoa</Label>
                      <RadioGroup value={nonCoopPessoaTipo} onValueChange={(v) => setNonCoopPessoaTipo(v as "pf" | "pj")} className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="pf" id="pf" />
                          <Label htmlFor="pf" className="cursor-pointer">Pessoa Física</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="pj" id="pj" />
                          <Label htmlFor="pj" className="cursor-pointer">Pessoa Jurídica</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="space-y-2">
                      <Label>Nome / Identificação</Label>
                      <Input value={nonCoopNome} onChange={(e) => setNonCoopNome(e.target.value)} placeholder="Informe o nome ou razão social" className="h-11" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>{nonCoopPessoaTipo === "pf" ? "CPF" : "CNPJ"}</Label>
                        <Input
                          value={nonCoopDocumento}
                          onChange={(e) => setNonCoopDocumento(e.target.value)}
                          placeholder={nonCoopPessoaTipo === "pf" ? "000.000.000-00" : "00.000.000/0000-00"}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Telefone (se disponível)</Label>
                        <Input value={nonCoopTelefone} onChange={(e) => setNonCoopTelefone(e.target.value)} placeholder="Ex.: +55 85 99999-0000" className="h-11" />
                      </div>
                    </div>
                    {nonCoopPessoaTipo === "pj" && (
                      <div className="space-y-2">
                        <Label>Nome do contato</Label>
                        <Input value={nonCoopContato} onChange={(e) => setNonCoopContato(e.target.value)} placeholder="Responsável na empresa" className="h-11" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Observações</Label>
                      <Textarea value={nonCoopObs} onChange={(e) => setNonCoopObs(e.target.value)} placeholder="Anotações adicionais" className="min-h-[100px]" />
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button variant="outline" type="button" onClick={() => { setOpenNonCoop(false); resetNonCoopForm(); }} className="h-11">
                        Cancelar
                      </Button>
                      <Button type="submit" className="h-11 bg-blue-600 hover:bg-blue-700">
                        {nonCoopMode === "create" ? "Criar" : "Salvar Alterações"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogTrigger asChild>
                  <Button className="flex-1 md:flex-none h-11 bg-blue-600 hover:bg-blue-700" onClick={() => {
                    setMode('create');
                    setEditingId(null);
                    resetForm();
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Cliente
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-[1600px] max-h-[90vh] overflow-y-auto p-8">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">{mode === 'create' ? 'Novo Cliente' : 'Editar Cliente'}</DialogTitle>
                    <DialogDescription>
                      {mode === 'create' 
                        ? 'Preencha os dados do novo Cliente. Campos marcados com '
                        : 'Atualize os dados do Cliente. Campos marcados com '
                      }<span className="text-red-600">*</span> são obrigatórios.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreate} className="space-y-8">
                    {/* Indicador de Progresso */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isFormValid() ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-amber-600" />
                          )}
                          <span className="font-medium text-sm">
                            {isFormValid() ? "Formulário pronto para envio" : "Preencha os campos obrigatórios"}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {[registrationNumber, name, document.replace(/\D/g, '').length === 11].filter(Boolean).length} de 3 campos obrigatórios preenchidos
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="space-y-1">
                        <Label className="text-sm font-bold text-slate-700 uppercase">Perfil do Registro</Label>
                        <RadioGroup value={isCliente ? "coop" : "non-coop"} onValueChange={(v) => setIsCliente(v === "coop")} className="flex gap-4">
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="coop" id="type-coop" />
                            <Label htmlFor="type-coop" className="font-semibold cursor-pointer">Cliente</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="non-coop" id="type-non-coop" />
                            <Label htmlFor="type-non-coop" className="font-semibold cursor-pointer">Não Cliente (Parceiro/Fornecedor/Outro)</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>

                    {/* Dados Pessoais */}
                    <div className="space-y-4 bg-gradient-to-r from-blue-50 to-transparent p-6 rounded-lg border border-blue-100">
                      <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-700">
                        <div className="h-8 w-1 bg-blue-600 rounded-full"></div>
                        Dados Pessoais
                      </h3>
                      <div className="grid grid-cols-4 gap-4">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Label htmlFor="registrationNumber" className={`${isCliente ? 'text-red-600' : 'text-gray-600'} mb-2 block font-medium`}>
                                  Matrícula {isCliente && "*"}
                                </Label>
                                <Input
                                  id="registrationNumber"
                                  type="number"
                                  value={registrationNumber}
                                  onChange={(e) => setRegistrationNumber(e.target.value)}
                                  onBlur={() => handleBlur('registrationNumber')}
                                  required={isCliente}
                                  className={isCliente && touched.registrationNumber && !registrationNumber ? "border-red-500" : ""}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Número único de identificação do Cliente</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <div>
                          <Label htmlFor="associationDate" className="mb-2 block font-medium">Data Associação</Label>
                          <Input
                            id="associationDate"
                            type="date"
                            value={associationDate}
                            onChange={(e) => setAssociationDate(e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="terminationDate" className="mb-2 block font-medium">Data Desligamento</Label>
                          <Input
                            id="terminationDate"
                            type="date"
                            value={terminationDate}
                            onChange={(e) => setTerminationDate(e.target.value)}
                          />
                        </div>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Label htmlFor="document" className="text-red-600 mb-2 block font-medium">
                                  CPF *
                                </Label>
                                <IMaskInput
                                  mask="000.000.000-00"
                                  definitions={{
                                    '0': /[0-9]/
                                  }}
                                  value={document}
                                  onAccept={(value: string) => setDocument(value)}
                                  onBlur={() => handleBlur('document')}
                                  placeholder="000.000.000-00"
                                  className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${touched.document && document.replace(/\D/g, '').length !== 11 ? "border-red-500" : ""}`}
                                />
                                {touched.document && document.replace(/\D/g, '').length > 0 && document.replace(/\D/g, '').length !== 11 && (
                                  <p className="text-xs text-red-600 mt-1">CPF deve ter 11 dígitos</p>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>CPF será usado como chave PIX padrão</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <div>
                          <Label htmlFor="status" className="mb-2 block font-medium">Status</Label>
                          <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ativo">Ativo</SelectItem>
                              <SelectItem value="inativo">Inativo</SelectItem>
                              <SelectItem value="desligado">Desligado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="name" className="text-red-600 mb-2 block font-medium">Nome Completo *</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onBlur={() => handleBlur('name')}
                          required
                          className={touched.name && !name ? "border-red-500" : ""}
                          placeholder="Digite o nome completo do Cliente"
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="birthDate" className="mb-2 block font-medium">Data de Nascimento</Label>
                          <Input
                            id="birthDate"
                            type="date"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="position" className="mb-2 block font-medium">Cargo</Label>
                          <Input
                            id="position"
                            value={position}
                            onChange={(e) => setPosition(e.target.value)}
                            placeholder="Ex: Analista, Gerente, etc."
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="contractId" className={`${isCliente ? 'text-red-600' : 'text-gray-600'} mb-2 block font-medium`}>
                            Contrato {isCliente && "*"}
                          </Label>
                          <Select 
                            value={contractId} 
                            onValueChange={setContractId}
                            required={isCliente}
                          >
                            <SelectTrigger id="contractId" className={isCliente && touched.contractId && (contractId === "sem_contrato" || !contractId) ? "border-red-500" : ""}>
                              <SelectValue placeholder="Selecione um contrato" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sem_contrato">Sem Contrato</SelectItem>
                              {contracts?.map((c: any) => (
                                <SelectItem key={c.id} value={c.id.toString()}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="motherName" className="mb-2 block font-medium">Nome da Mãe</Label>
                          <Input
                            id="motherName"
                            value={motherName}
                            onChange={(e) => setMotherName(e.target.value)}
                            placeholder="Nome completo da mãe"
                          />
                        </div>
                        <div>
                          <Label htmlFor="fatherName" className="mb-2 block font-medium">Nome do Pai</Label>
                          <Input
                            id="fatherName"
                            value={fatherName}
                            onChange={(e) => setFatherName(e.target.value)}
                            placeholder="Nome completo do pai"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <Label htmlFor="birthCity" className="mb-2 block font-medium">Naturalidade (Cidade)</Label>
                          <Input
                            id="birthCity"
                            value={birthCity}
                            onChange={(e) => setBirthCity(e.target.value)}
                            placeholder="Cidade de nascimento"
                          />
                        </div>
                        <div>
                          <Label htmlFor="birthState" className="mb-2 block font-medium">UF</Label>
                          <Select value={birthState} onValueChange={setBirthState}>
                            <SelectTrigger>
                              <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                              {ESTADOS_BRASIL.map((estado) => (
                                <SelectItem key={estado.sigla} value={estado.sigla}>
                                  {estado.sigla}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="contractId" className="mb-2 block font-medium">Contrato</Label>
                          <Select value={contractId} onValueChange={setContractId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o contrato" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sem_contrato">Sem contrato</SelectItem>
                              {contracts?.filter(c => c.status === "ativo").map((contract) => (
                                <SelectItem key={contract.id} value={contract.id.toString()}>
                                  {contract.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="email" className="mb-2 block font-medium">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="email@exemplo.com"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Telefones */}
                    <div className="space-y-4 bg-gradient-to-r from-green-50 to-transparent p-6 rounded-lg border border-green-100">
                      <h3 className="text-lg font-semibold flex items-center gap-2 text-green-700">
                        <div className="h-8 w-1 bg-green-600 rounded-full"></div>
                        Telefones
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="whatsappNumber" className="mb-2 block font-medium">Nr WhatsApp</Label>
                          <div className="flex gap-2">
                            <Input
                              value={whatsappCountryCode}
                              onChange={(e) => setWhatsappCountryCode(e.target.value)}
                              placeholder="+55"
                              className="w-20"
                            />
                            <IMaskInput
                              mask="(00) 00000-0000"
                              definitions={{
                                '0': /[0-9]/
                              }}
                              value={whatsappNumber}
                              onAccept={(value: string) => setWhatsappNumber(value)}
                              placeholder="(00) 00000-0000"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm flex-1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="secondaryPhone" className="mb-2 block font-medium">Telefone Secundário</Label>
                          <div className="flex gap-2">
                            <Input
                              value={secondaryCountryCode}
                              onChange={(e) => setSecondaryCountryCode(e.target.value)}
                              placeholder="+55"
                              className="w-20"
                            />
                            <IMaskInput
                              mask="(00) 0000-0000"
                              definitions={{
                                '0': /[0-9]/
                              }}
                              value={secondaryPhone}
                              onAccept={(value: string) => setSecondaryPhone(value)}
                              placeholder="(00) 0000-0000"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Contatos Adicionais */}
                    <div className="space-y-4 bg-gradient-to-r from-teal-50 to-transparent p-6 rounded-lg border border-teal-100">
                      <h3 className="text-lg font-semibold flex items-center gap-2 text-teal-700">
                        <div className="h-8 w-1 bg-teal-600 rounded-full"></div>
                        Contatos Adicionais (WhatsApp e E-mail)
                      </h3>
                      <div className="grid grid-cols-2 gap-8">
                        {/* Telefones Adicionais */}
                        <div className="space-y-3">
                          <Label className="text-sm font-bold text-teal-800 uppercase tracking-wider">Telefones (WhatsApp)</Label>
                          <div className="space-y-2">
                            {additionalPhones.map((phone, index) => (
                              <div key={`phone-${index}`} className="flex gap-2 group animate-in slide-in-from-left-2 duration-200">
                                <IMaskInput
                                  mask="(00) 00000-0000"
                                  definitions={{ '0': /[0-9]/ }}
                                  value={phone}
                                  onAccept={(v: string) => {
                                    const newPhones = [...additionalPhones];
                                    newPhones[index] = v;
                                    setAdditionalPhones(newPhones);
                                  }}
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50"
                                />
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-10 w-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full shrink-0"
                                  onClick={() => setAdditionalPhones(prev => prev.filter((_, i) => i !== index))}
                                >
                                  <X size={16} />
                                </Button>
                              </div>
                            ))}
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              className="w-full border-dashed border-teal-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400 h-10"
                              onClick={() => setAdditionalPhones(prev => [...prev, ""])}
                            >
                              <Plus size={14} className="mr-2" /> Adicionar Telefone
                            </Button>
                          </div>
                        </div>

                        {/* Emails Adicionais */}
                        <div className="space-y-3">
                          <Label className="text-sm font-bold text-teal-800 uppercase tracking-wider">E-mails</Label>
                          <div className="space-y-2">
                            {additionalEmails.map((emailAddr, index) => (
                              <div key={`email-${index}`} className="flex gap-2 group animate-in slide-in-from-right-2 duration-200">
                                <Input
                                  type="email"
                                  value={emailAddr}
                                  onChange={(e) => {
                                    const newEmails = [...additionalEmails];
                                    newEmails[index] = e.target.value;
                                    setAdditionalEmails(newEmails);
                                  }}
                                  placeholder="email@adicional.com"
                                  className="h-10 focus-visible:ring-teal-500"
                                />
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-10 w-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full shrink-0"
                                  onClick={() => setAdditionalEmails(prev => prev.filter((_, i) => i !== index))}
                                >
                                  <X size={16} />
                                </Button>
                              </div>
                            ))}
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              className="w-full border-dashed border-teal-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400 h-10"
                              onClick={() => setAdditionalEmails(prev => [...prev, ""])}
                            >
                              <Plus size={14} className="mr-2" /> Adicionar E-mail
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Endereço */}
                    <div className="space-y-4 bg-gradient-to-r from-purple-50 to-transparent p-6 rounded-lg border border-purple-100">
                      <h3 className="text-lg font-semibold flex items-center gap-2 text-purple-700">
                        <div className="h-8 w-1 bg-purple-600 rounded-full"></div>
                        Endereço
                      </h3>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="zipCode" className="mb-2 block font-medium">CEP</Label>
                          <div className="relative">
                            <IMaskInput
                              mask="00000-000"
                              definitions={{
                                '0': /[0-9]/
                              }}
                              value={zipCode}
                              onAccept={(value: string) => handleCepChange(value)}
                              placeholder="00000-000"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                            />
                            {loadingCep && (
                              <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-blue-600" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Preenche endereço automaticamente</p>
                        </div>
                        <div>
                          <Label htmlFor="city" className="mb-2 block font-medium">Cidade</Label>
                          <Input
                            id="city"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="state" className="mb-2 block font-medium">UF</Label>
                          <Select value={state} onValueChange={setState}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {ESTADOS_BRASIL.map((uf) => (
                                <SelectItem key={uf.sigla} value={uf.sigla}>
                                  {uf.sigla} - {uf.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <Label htmlFor="street" className="mb-2 block font-medium">Logradouro</Label>
                          <Input
                            id="street"
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                            placeholder="Rua, Avenida, etc."
                          />
                        </div>
                        <div>
                          <Label htmlFor="addressNumber" className="mb-2 block font-medium">Número</Label>
                          <Input
                            id="addressNumber"
                            value={addressNumber}
                            onChange={(e) => setAddressNumber(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="neighborhood" className="mb-2 block font-medium">Bairro</Label>
                          <Input
                            id="neighborhood"
                            value={neighborhood}
                            onChange={(e) => setNeighborhood(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="complement" className="mb-2 block font-medium">Complemento</Label>
                          <Input
                            id="complement"
                            value={complement}
                            onChange={(e) => setComplement(e.target.value)}
                            placeholder="Apto, Bloco, etc."
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Dados Bancários */}
                    <div className="space-y-4 bg-gradient-to-r from-amber-50 to-transparent p-6 rounded-lg border border-amber-100">
                      <h3 className="text-lg font-semibold flex items-center gap-2 text-amber-700">
                        <div className="h-8 w-1 bg-amber-600 rounded-full"></div>
                        Dados Bancários
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="bankCode" className="mb-2 block font-medium">Código do Banco</Label>
                          <Input
                            id="bankCode"
                            value={bankCode}
                            onChange={(e) => {
                              const codigo = e.target.value;
                              setBankCode(codigo);
                              const banco = BANCOS_BRASIL.find(b => b.codigo === codigo);
                              if (banco) {
                                setBankName(banco.nome);
                              }
                            }}
                            placeholder="000"
                            maxLength={3}
                            list="bancos-list"
                          />
                          <datalist id="bancos-list">
                            {BANCOS_BRASIL.map(banco => (
                              <option key={banco.codigo} value={banco.codigo}>
                                {banco.codigo} - {banco.nome}
                              </option>
                            ))}
                          </datalist>
                        </div>
                        <div>
                          <Label htmlFor="bankName" className="mb-2 block font-medium">Nome do Banco</Label>
                          <Input
                            id="bankName"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            placeholder="Preenchido automaticamente"
                            disabled
                            className="bg-muted"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="accountType" className="mb-2 block font-medium">Tipo de Conta</Label>
                          <Select value={accountType} onValueChange={(v) => setAccountType(v as "salario" | "corrente" | "poupanca")}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="salario">Salário</SelectItem>
                              <SelectItem value="corrente">Corrente</SelectItem>
                              <SelectItem value="poupanca">Poupança</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="agency" className="mb-2 block font-medium">Agência</Label>
                          <Input
                            id="agency"
                            value={agency}
                            onChange={(e) => setAgency(e.target.value)}
                            placeholder="0000"
                          />
                        </div>
                        <div>
                          <Label htmlFor="accountNumber" className="mb-2 block font-medium">Conta</Label>
                          <Input
                            id="accountNumber"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            placeholder="00000"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="accountDigit" className="mb-2 block font-medium">Dígito</Label>
                          <Input
                            id="accountDigit"
                            value={accountDigit}
                            onChange={(e) => setAccountDigit(e.target.value)}
                            placeholder="0"
                            maxLength={2}
                          />
                        </div>
                        <div>
                          <Label htmlFor="pixKey" className="mb-2 block font-medium">Chave PIX</Label>
                          <Input
                            id="pixKey"
                            value={pixKey}
                            onChange={(e) => setPixKey(e.target.value)}
                            placeholder="Preenchido automaticamente com CPF"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Preenchido automaticamente com o CPF</p>
                        </div>
                    </div>
                    </div>
                    
                    {/* Datas de Criação e Atualização (Apenas Edição) */}
                     {mode === 'edit' && editingId && (
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                         <div>
                           <Label className="text-xs text-slate-400 uppercase font-semibold">Data de Criação</Label>
                           <p className="text-sm text-slate-600">
                             {Clientes?.find(c => c.id === editingId)?.createdAt 
                               ? new Date(Clientes.find(c => c.id === editingId)!.createdAt).toLocaleString()
                               : '-'}
                           </p>
                         </div>
                         <div>
                           <Label className="text-xs text-slate-400 uppercase font-semibold">Última Atualização</Label>
                           <p className="text-sm text-slate-600">
                             {Clientes?.find(c => c.id === editingId)?.updatedAt
                               ? new Date(Clientes.find(c => c.id === editingId)!.updatedAt).toLocaleString()
                               : '-'}
                           </p>
                         </div>
                      </div>
                     )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => {
                        setOpenCreate(false);
                        resetForm();
                      }}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full sm:w-auto">
                        {(createMutation.isPending || updateMutation.isPending) ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {mode === 'create' ? 'Criando...' : 'Atualizando...'}
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            {mode === 'create' ? 'Criar Cliente' : 'Atualizar Cliente'}
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Tabela Principal */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("registrationNumber")}>
                      <div className="flex items-center">Matrícula <SortIcon column="registrationNumber" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                      <div className="flex items-center">Nome <SortIcon column="name" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("document")}>
                      <div className="flex items-center">CPF <SortIcon column="document" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("position")}>
                      <div className="flex items-center">Cargo <SortIcon column="position" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("status")}>
                      <div className="flex items-center">Status <SortIcon column="status" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("contractId")}>
                      <div className="flex items-center">Contrato <SortIcon column="contractId" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("admissionDate")}>
                      <div className="flex items-center">Admissão <SortIcon column="admissionDate" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("terminationDate")}>
                      <div className="flex items-center">Desligamento <SortIcon column="terminationDate" /></div>
                    </TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedClientes && sortedClientes.length > 0 ? (
                    sortedClientes.map((Cliente: Cliente) => (
                      <TableRow key={Cliente.id} className="hover:bg-gray-50/50 transition-colors">
                        <TableCell className="font-medium">{Cliente.isCliente ? String(Cliente.registrationNumber).padStart(5, '0') : "-"}</TableCell>
                        <TableCell className="font-semibold text-gray-900">
                          <div className="flex flex-col">
                            {Cliente.name}
                            {!Cliente.isCliente && (
                              <span className="text-[10px] text-amber-600 font-bold uppercase tracking-tighter">Não Cliente</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatCPF(Cliente.document)}</TableCell>
                        <TableCell className="text-gray-600">{Cliente.position || "-"}</TableCell>
                        <TableCell>
                          <Badge className={
                            Cliente.status === "ativo" ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100" : 
                            Cliente.status === "inativo" ? "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100" : 
                            "bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100"
                          }>
                            {Cliente.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                            {Cliente.contractId 
                              ? contracts?.find(c => c.id === Cliente.contractId)?.name 
                              : "SEM CONTRATO"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {Cliente.admissionDate ? new Date(Cliente.admissionDate).toLocaleDateString('pt-BR') : "-"}
                        </TableCell>
                        <TableCell className="text-red-600 font-medium">
                          {Cliente.terminationDate ? new Date(Cliente.terminationDate).toLocaleDateString('pt-BR') : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => { setSelectedclienteId(Cliente.id); setOpenBankData(true); }} title="Dados Bancários">
                              <CreditCard className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(Cliente)} title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => handleDelete(Cliente)} title="Excluir">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                        Nenhum Cliente encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Paginação */}
        <div className="bg-white px-6 py-4 border border-gray-100 border-t-0 rounded-b-lg flex items-center justify-between shadow-sm mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Registros:</span>
              <Select 
                value={pageSize === -1 ? "all" : pageSize.toString()} 
                onValueChange={(val) => {
                  if (val === "all") {
                    setOpenAllWarning(true);
                  } else {
                    setPageSize(Number(val));
                    setPage(1);
                  }
                }}
              >
                <SelectTrigger className="w-[120px] h-10 border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 por pág.</SelectItem>
                  <SelectItem value="100">100 por pág.</SelectItem>
                  <SelectItem value="300">300 por pág.</SelectItem>
                  <SelectItem value="500">500 por pág.</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="h-4 w-px bg-gray-200 mx-2" />
            <span className="text-sm font-medium text-gray-600">
              Página <strong className="text-blue-600">{page}</strong>
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPage(p => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={page === 1 || isLoading || pageSize === -1}
              className="h-10 px-4 border-gray-200 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4 mr-2" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPage(p => p + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={(Clientes?.length ?? 0) < pageSize || isLoading || pageSize === -1}
              className="h-10 px-4 border-gray-200 hover:bg-gray-50"
            >
              Próxima <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Modal de Aviso para "Todos" */}
        <AlertDialog open={openAllWarning} onOpenChange={setOpenAllWarning}>
          <AlertDialogContent className="w-[95vw] max-w-[500px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-amber-600 text-xl font-bold">
                <AlertCircle className="h-6 w-6" />
                Aviso de Performance
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600 space-y-4 pt-2">
                <p>
                  Você está prestes a carregar <strong>todos os registros</strong> do sistema de uma só vez. 
                  Esta operação pode demorar consideravelmente dependendo do volume total de dados.
                </p>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-amber-800 text-sm">
                  <strong>Importante:</strong> Se o sistema parar de responder (entrar em Timeout), 
                  feche a aba do navegador e acesse o sistema novamente por um novo link.
                </div>
                <p className="font-medium">Deseja continuar mesmo assim?</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel onClick={() => setOpenAllWarning(false)} className="h-11">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setPageSize(-1);
                  setPage(1);
                  setOpenAllWarning(false);
                }}
                className="h-11 bg-amber-600 hover:bg-amber-700 text-white"
              >
                Sim, Visualizar Tudo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
          <AlertDialogContent className="w-[95vw] max-w-[500px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
                <Trash2 className="h-6 w-6" />
                Confirmar Exclusão
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4 pt-2">
                  <p className="text-base text-foreground">
                    Você está prestes a excluir o Cliente <strong>{deletingCliente?.name}</strong>.
                  </p>

                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <p className="text-red-700 font-semibold flex items-center gap-2 mb-1">
                      <AlertCircle className="h-4 w-4" />
                      Aviso Importante
                    </p>
                    <p className="text-sm text-red-600">
                      Esta ação é irreversível. A exclusão normal pode falhar se houver histórico (tickets/pesquisas).
                    </p>
                  </div>

                  {currentUser?.profileRole === "SuperAdmin" && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                      <p className="text-amber-700 font-semibold flex items-center gap-2 mb-1">
                        <Award className="h-4 w-4" />
                        Opções de Super Admin
                      </p>
                      <p className="text-sm text-amber-600">
                        Você tem permissão para apagar o Cliente **junto com todo o seu histórico** (tickets, mensagens e pesquisas).
                      </p>
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
              <AlertDialogCancel className="sm:mt-0">Cancelar</AlertDialogCancel>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending || deleteWithHistoryMutation.isPending}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Exclusão Simples
                </Button>

                {currentUser?.profileRole === "SuperAdmin" && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (deletingCliente) {
                        deleteWithHistoryMutation.mutate({ id: deletingCliente.id });
                      }
                    }}
                    disabled={deleteMutation.isPending || deleteWithHistoryMutation.isPending}
                  >
                    {deleteWithHistoryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Excluir com Histórico
                  </Button>
                )}
              </div>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de Vínculo de Tickets Passados */}
        <AlertDialog open={openLinkTickets} onOpenChange={setOpenLinkTickets}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                Vincular Histórico de Tickets?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Encontramos <strong>{linkableTicketsCount}</strong> ticket(s) anterior(es) que correspondem aos dados de contato informados. 
                Deseja vincular este histórico ao novo registro de <strong>{name}</strong>?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setOpenLinkTickets(false)}>Agora não</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (linkTargetCliente) {
                    linkTicketsMutation.mutate(linkTargetCliente);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Sim, Vincular Tickets
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de Dados Bancários */}
        <Dialog open={openBankData} onOpenChange={setOpenBankData}>
          <DialogContent className="w-[95vw] max-w-[600px] p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Dados Bancários</DialogTitle>
              <DialogDescription>
                Informações bancárias do Cliente
              </DialogDescription>
            </DialogHeader>
            
            {isBankDataLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : bankData ? (
              <div className="space-y-6 mt-6">
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    Informações Bancárias
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Código do Banco</Label>
                      <p className="text-base font-medium mt-1">{bankData.bankCode || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Nome do Banco</Label>
                      <p className="text-base font-medium mt-1">{bankData.bankName || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Tipo de Conta</Label>
                      <p className="text-base font-medium mt-1">
                        {bankData.accountType === "corrente" && "Conta Corrente"}
                        {bankData.accountType === "poupanca" && "Conta Poupança"}
                        {bankData.accountType === "salario" && "Conta Salário"}
                        {!bankData.accountType && "-"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Agência</Label>
                      <p className="text-base font-medium mt-1">{bankData.agency || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Conta</Label>
                      <p className="text-base font-medium mt-1">{bankData.accountNumber || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Dígito</Label>
                      <p className="text-base font-medium mt-1">{bankData.accountDigit || "-"}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-sm text-muted-foreground">Chave PIX</Label>
                      <p className="text-base font-medium mt-1 break-all">{bankData.pixKey || "-"}</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setOpenBankData(false)}>Fechar</Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum dado bancário cadastrado para este Cliente.</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <ClienteImportModal 
        open={openImport} 
        onOpenChange={setOpenImport} 
        onSuccess={() => {
           utils.Clientes.list.invalidate();
        }} 
      />
    </Layout>
  );
}



