import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Loader2, Briefcase, Building, Image as ImageIcon, FileText, Sparkles, Clock3, CalendarDays, Trash2, Plus, Pencil, MapPin, Phone, Globe, Mail, UserRound, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type CooperativaForm = {
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  whatsapp: string;
  street: string;
  addressNumber: string;
  neighborhood: string;
  complement: string;
  city: string;
  state: string;
  zipCode: string;
};

function formatDigits(value: string) {
  return value.replace(/\D+/g, "");
}

function formatCNPJ(value: string) {
  const digits = formatDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatPhone(value: string) {
  const digits = formatDigits(value).slice(0, 13);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 8) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatZip(value: string) {
  const digits = formatDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

const weekDays = [
  { label: "Domingo", value: 0 },
  { label: "Segunda-feira", value: 1 },
  { label: "Terça-feira", value: 2 },
  { label: "Quarta-feira", value: 3 },
  { label: "Quinta-feira", value: 4 },
  { label: "Sexta-feira", value: 5 },
  { label: "Sábado", value: 6 },
];

const defaultHours = [
  { weekday: 0, openTime: "09:00", closeTime: "13:00", isClosed: true },
  { weekday: 1, openTime: "08:00", closeTime: "18:00", isClosed: false },
  { weekday: 2, openTime: "08:00", closeTime: "18:00", isClosed: false },
  { weekday: 3, openTime: "08:00", closeTime: "18:00", isClosed: false },
  { weekday: 4, openTime: "08:00", closeTime: "18:00", isClosed: false },
  { weekday: 5, openTime: "08:00", closeTime: "17:00", isClosed: false },
  { weekday: 6, openTime: "09:00", closeTime: "13:00", isClosed: true },
];

const emptyHoliday = { name: "", date: "", isNational: false, isRecurring: false };

export default function Cooperativa() {
  const utils = trpc.useUtils();
  const { data: cooperativas, isLoading } = trpc.cooperativa.list.useQuery();
  const { data: stats, isLoading: loadingStats } = trpc.cooperativa.stats.useQuery();

  const cooperativa = cooperativas?.[0] ?? null;
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [hoursForm, setHoursForm] = useState(defaultHours);
  const [holidayForm, setHolidayForm] = useState(emptyHoliday);
  const [editingHolidayId, setEditingHolidayId] = useState<number | null>(null);

  const [form, setForm] = useState<CooperativaForm>({
    name: "",
    cnpj: "",
    email: "",
    phone: "",
    whatsapp: "",
    street: "",
    addressNumber: "",
    neighborhood: "",
    complement: "",
    city: "",
    state: "",
    zipCode: "",
  });

  useEffect(() => {
    if (cooperativa) {
      setForm({
        name: cooperativa.name || "",
        cnpj: cooperativa.cnpj || "",
        email: cooperativa.email || "",
        phone: cooperativa.phone || "",
        whatsapp: cooperativa.whatsapp || "",
        street: cooperativa.street || "",
        addressNumber: cooperativa.addressNumber || "",
        neighborhood: cooperativa.neighborhood || "",
        complement: cooperativa.complement || "",
        city: cooperativa.city || "",
        state: cooperativa.state || "",
        zipCode: cooperativa.zipCode || "",
      });
    }
  }, [cooperativa]);

  useEffect(() => {
    if (!stats?.contracts?.length) return;
    if (selectedContractId === null) {
      setSelectedContractId(stats.contracts[0].contractId);
    }
  }, [stats?.contracts, selectedContractId]);

  const createMutation = trpc.cooperativa.create.useMutation({
    onSuccess: async () => {
      toast.success("Cooperativa criada com sucesso");
      await utils.cooperativa.list.invalidate();
      await utils.cooperativa.stats.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.cooperativa.update.useMutation({
    onSuccess: async () => {
      toast.success("Cooperativa atualizada com sucesso");
      await utils.cooperativa.list.invalidate();
      await utils.cooperativa.stats.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const uploadLogoMutation = trpc.cooperativa.uploadLogo.useMutation({
    onSuccess: async () => {
      toast.success("Logomarca atualizada");
      await utils.cooperativa.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleChange = (field: keyof CooperativaForm, value: string) => {
    if (field === "cnpj") {
      setForm((prev) => ({ ...prev, cnpj: formatCNPJ(value) }));
      return;
    }
    if (field === "phone" || field === "whatsapp") {
      setForm((prev) => ({ ...prev, [field]: formatPhone(value) }));
      return;
    }
    if (field === "zipCode") {
      setForm((prev) => ({ ...prev, zipCode: formatZip(value) }));
      return;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.cnpj) {
      toast.error("Nome e CNPJ são obrigatórios");
      return;
    }

    if (cooperativa?.id) {
      updateMutation.mutate({ id: cooperativa.id, ...form });
    } else {
      createMutation.mutate({ ...form });
    }
  };

  const handleHourChange = (weekday: number, field: "openTime" | "closeTime" | "isClosed", value: string | boolean) => {
    setHoursForm((prev) =>
      prev.map((h) => (h.weekday === weekday ? { ...h, [field]: value } : h))
    );
  };

  const handleSaveHours = () => {
    if (!cooperativa?.id) {
      toast.error("Cadastre a cooperativa antes de salvar horários");
      return;
    }
    saveHours.mutate({
      cooperativaId: cooperativa.id,
      items: hoursForm,
    });
  };

  const handleHolidaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayForm.name || !holidayForm.date) {
      toast.error("Nome e data são obrigatórios");
      return;
    }
    if (editingHolidayId) {
      updateHoliday.mutate({ id: editingHolidayId, ...holidayForm, cooperativaId: cooperativa?.id });
    } else {
      createHoliday.mutate({ ...holidayForm, cooperativaId: cooperativa?.id });
    }
  };

  const startEditHoliday = (holiday: any) => {
    setEditingHolidayId(holiday.id);
    setHolidayForm({
      name: holiday.name || "",
      date: (holiday.date instanceof Date ? holiday.date.toISOString().slice(0, 10) : (holiday.date ?? "")).slice(0, 10),
      isNational: !!holiday.isNational,
      isRecurring: !!holiday.isRecurring,
    });
  };

  const handleLogoUpload = async (file?: File | null) => {
    if (!file) return;
    if (!cooperativa?.id) {
      toast.error("Crie a cooperativa antes de enviar a logomarca.");
      return;
    }
    setLogoUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result?.toString() || "";
      uploadLogoMutation.mutate({
        cooperativaId: cooperativa.id,
        fileBase64: base64,
        fileName: file.name,
        mimeType: file.type || "image/png",
      }, {
        onSettled: () => setLogoUploading(false),
      });
    };
    reader.readAsDataURL(file);
  };

  const selectedContract = useMemo(
    () => stats?.contracts.find((c) => c.contractId === selectedContractId),
    [stats?.contracts, selectedContractId]
  );

  const hoursQuery = trpc.cooperativa.businessHours.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (hoursQuery.data?.length) {
      setHoursForm(
        weekDays.map((day) => {
          const found = hoursQuery.data?.find((h: any) => h.weekday === day.value);
          return {
            weekday: day.value,
            openTime: found?.openTime || defaultHours[day.value].openTime,
            closeTime: found?.closeTime || defaultHours[day.value].closeTime,
            isClosed: found?.isClosed ?? defaultHours[day.value].isClosed,
          };
        })
      );
    }
  }, [hoursQuery.data]);

  const saveHours = trpc.cooperativa.businessHours.save.useMutation({
    onSuccess: async () => {
      toast.success("Horários salvos");
      await hoursQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const holidaysQuery = trpc.cooperativa.holidays.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const holidays = holidaysQuery.data ?? [];

  const createHoliday = trpc.cooperativa.holidays.create.useMutation({
    onSuccess: async () => {
      toast.success("Feriado adicionado");
      setHolidayForm(emptyHoliday);
      setEditingHolidayId(null);
      await holidaysQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateHoliday = trpc.cooperativa.holidays.update.useMutation({
    onSuccess: async () => {
      toast.success("Feriado atualizado");
      setHolidayForm(emptyHoliday);
      setEditingHolidayId(null);
      await holidaysQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteHoliday = trpc.cooperativa.holidays.delete.useMutation({
    onSuccess: async () => {
      toast.success("Feriado removido");
      await holidaysQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout>
      <div className="container max-w-[1200px] mx-auto py-8 px-4">
        {/* Cabeçalho Premium */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-2xl shadow-sm border border-blue-100">
              <Building className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Cooperativa</h1>
              <p className="text-gray-500 text-lg font-medium">
                Gestão institucional, horários e configurações globais
              </p>
            </div>
          </div>
          {cooperativa?.logoUrl && (
            <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-gray-100/80 hidden md:block">
              <img
                src={cooperativa.logoUrl}
                alt="Logomarca"
                className="h-12 w-auto object-contain"
              />
            </div>
          )}
        </div>

        <Tabs defaultValue="dados" className="space-y-8">
          <TabsList className="bg-white border border-gray-100 p-1.5 h-14 rounded-2xl shadow-sm w-full md:w-auto grid grid-cols-2 md:flex md:gap-2">
            <TabsTrigger value="dados" className="rounded-xl data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none font-bold px-6 h-full transition-all">
              <Briefcase className="mr-2 h-4 w-4" />
              Dados Gerais
            </TabsTrigger>
            <TabsTrigger value="atendimento" className="rounded-xl data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none font-bold px-6 h-full transition-all">
              <Clock3 className="mr-2 h-4 w-4" />
              Atendimento
            </TabsTrigger>
            <TabsTrigger value="feriados" className="rounded-xl data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none font-bold px-6 h-full transition-all">
              <CalendarDays className="mr-2 h-4 w-4" />
              Feriados
            </TabsTrigger>
            <TabsTrigger value="indicadores" className="rounded-xl data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none font-bold px-6 h-full transition-all">
              <Sparkles className="mr-2 h-4 w-4" />
              Indicadores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-8 outline-none animate-in fade-in-50 duration-300">
            <div className="grid gap-8 lg:grid-cols-3">
              <Card className="lg:col-span-2 border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 px-8 py-6">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                    <Building className="h-6 w-6 text-blue-600" />
                    Informações Institucionais
                  </CardTitle>
                  <CardDescription className="text-gray-500 font-medium">Dados principais para identificação e contato</CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  <form className="space-y-8" onSubmit={handleSubmit}>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="uppercase text-[11px] font-bold text-gray-400 tracking-widest pl-1">Nome Fantasia</Label>
                        <Input value={form.name} onChange={(e) => handleChange("name", e.target.value)} required className="h-12 border-gray-100 focus:border-blue-400 focus:ring-blue-50 rounded-xl transition-all font-medium" />
                      </div>
                      <div className="space-y-2">
                        <Label className="uppercase text-[11px] font-bold text-gray-400 tracking-widest pl-1">CNPJ</Label>
                        <Input value={form.cnpj} onChange={(e) => handleChange("cnpj", e.target.value)} required className="h-12 border-gray-100 focus:border-blue-400 focus:ring-blue-50 rounded-xl transition-all font-medium tabular-nums" />
                      </div>
                      <div className="space-y-2">
                        <Label className="uppercase text-[11px] font-bold text-gray-400 tracking-widest pl-1">E-mail de Contato</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} className="pl-10 h-12 border-gray-100 focus:border-blue-400 focus:ring-blue-50 rounded-xl transition-all font-medium lowercase" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="uppercase text-[11px] font-bold text-gray-400 tracking-widest pl-1">Telefone Fixo</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} className="pl-10 h-12 border-gray-100 focus:border-blue-400 focus:ring-blue-50 rounded-xl transition-all font-medium tabular-nums" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="uppercase text-[11px] font-bold text-gray-400 tracking-widest pl-1">WhatsApp Institucional</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                          <Input value={form.whatsapp} onChange={(e) => handleChange("whatsapp", e.target.value)} className="pl-10 h-12 border-gray-100 focus:border-blue-400 focus:ring-blue-50 rounded-xl transition-all font-medium tabular-nums" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 pt-6 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Localização</h4>
                      </div>
                      <div className="grid gap-6 md:grid-cols-3">
                        <div className="md:col-span-2 space-y-2">
                          <Label className="uppercase text-[11px] font-bold text-gray-400 tracking-widest pl-1">Rua / Logradouro</Label>
                          <Input value={form.street} onChange={(e) => handleChange("street", e.target.value)} className="h-12 border-gray-100 focus:border-blue-400 focus:ring-blue-50 rounded-xl transition-all font-medium" />
                        </div>
                        <div className="space-y-2">
                          <Label className="uppercase text-[11px] font-bold text-gray-400 tracking-widest pl-1">Número</Label>
                          <Input value={form.addressNumber} onChange={(e) => handleChange("addressNumber", e.target.value)} className="h-12 border-gray-100 focus:border-blue-400 focus:ring-blue-50 rounded-xl transition-all font-medium" />
                        </div>
                        <div className="space-y-2">
                          <Label className="uppercase text-[11px] font-bold text-gray-400 tracking-widest pl-1">Bairro</Label>
                          <Input value={form.neighborhood} onChange={(e) => handleChange("neighborhood", e.target.value)} className="h-12 border-gray-100 focus:border-blue-400 focus:ring-blue-50 rounded-xl transition-all font-medium" />
                        </div>
                        <div className="space-y-2">
                          <Label className="uppercase text-[11px] font-bold text-gray-400 tracking-widest pl-1">Complemento</Label>
                          <Input value={form.complement} onChange={(e) => handleChange("complement", e.target.value)} className="h-12 border-gray-100 focus:border-blue-400 focus:ring-blue-50 rounded-xl transition-all font-medium" />
                        </div>
                        <div className="space-y-2">
                          <Label className="uppercase text-[11px] font-bold text-gray-400 tracking-widest pl-1">Cidade</Label>
                          <Input value={form.city} onChange={(e) => handleChange("city", e.target.value)} className="h-12 border-gray-100 focus:border-blue-400 focus:ring-blue-50 rounded-xl transition-all font-medium" />
                        </div>
                        <div className="space-y-2">
                          <Label className="uppercase text-[11px] font-bold text-gray-400 tracking-widest pl-1">UF</Label>
                          <Input value={form.state} onChange={(e) => handleChange("state", e.target.value)} maxLength={2} className="h-12 border-gray-100 focus:border-blue-400 focus:ring-blue-50 rounded-xl transition-all font-bold uppercase text-center" />
                        </div>
                        <div className="space-y-2">
                          <Label className="uppercase text-[11px] font-bold text-gray-400 tracking-widest pl-1">CEP</Label>
                          <Input value={form.zipCode} onChange={(e) => handleChange("zipCode", e.target.value)} className="h-12 border-gray-100 focus:border-blue-400 focus:ring-blue-50 rounded-xl transition-all font-medium tabular-nums" />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t border-gray-100">
                      <Button type="submit" disabled={isSaving} className="h-12 px-10 bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-200/50 rounded-xl transition-all">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        SALVAR ALTERAÇÕES
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="border-gray-100 shadow-sm rounded-2xl overflow-hidden h-fit">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 px-6 py-5">
                  <CardTitle className="flex items-center gap-3 text-lg font-bold text-gray-900">
                    <ImageIcon className="h-5 w-5 text-blue-600" />
                    Identidade Visual
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="flex flex-col gap-6">
                    <div 
                      className={cn(
                        "relative group aspect-video rounded-2xl border-2 border-dashed border-gray-100 bg-gray-50/50 flex flex-col items-center justify-center p-6 text-center transition-all hover:bg-gray-50 hover:border-blue-200",
                        (!cooperativa?.id || logoUploading) && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      {cooperativa?.logoUrl ? (
                         <img
                          src={cooperativa.logoUrl}
                          alt="Logomarca"
                          className="h-24 w-auto object-contain transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                          <div className="p-4 bg-white rounded-full shadow-sm border border-gray-100">
                            <ImageIcon className="h-8 w-8" />
                          </div>
                          <p className="text-xs font-bold uppercase tracking-wider">Logo não definida</p>
                        </div>
                      )}
                      
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleLogoUpload(e.target.files?.[0])}
                        disabled={logoUploading || !cooperativa?.id}
                      />
                      <label 
                        htmlFor="logo-upload"
                        className="absolute inset-0 cursor-pointer rounded-2xl"
                      />
                    </div>

                    {!cooperativa?.id && (
                      <p className="text-[11px] text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 font-bold text-center">
                        SALVE A COOPERATIVA PRIMEIRO
                      </p>
                    )}

                    <div className="space-y-4">
                      {logoUploading || uploadLogoMutation.isPending ? (
                        <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100 text-sm font-bold text-blue-700 animate-pulse">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          ENVIANDO...
                        </div>
                      ) : (
                        <Button 
                          asChild
                          variant="outline" 
                          disabled={!cooperativa?.id}
                          className="w-full h-11 border-gray-200 rounded-xl font-bold hover:bg-white hover:border-blue-300 hover:text-blue-700 transition-all"
                        >
                          <label htmlFor="logo-upload">
                            <Plus className="mr-2 h-4 w-4" />
                            {cooperativa?.logoUrl ? "ALTERAR LOGO" : "ADICIONAR LOGO"}
                          </label>
                        </Button>
                      )}
                      <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">
                        Recomendado: PNG Transparente
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="atendimento" className="space-y-8 outline-none animate-in fade-in-50 duration-300">
            <Card className="border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 px-8 py-6">
                <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                  <Clock3 className="h-6 w-6 text-blue-600" />
                  Horários de Operação
                </CardTitle>
                <CardDescription className="text-gray-500 font-medium">Configure as janelas de atendimento para cálculo de SLA e disponibilidade</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-50/30">
                    <TableRow className="border-b border-gray-100">
                      <TableHead className="py-4 pl-8 text-xs font-bold uppercase tracking-wider text-gray-500">Dia da Semana</TableHead>
                      <TableHead className="py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center w-40">Status</TableHead>
                      <TableHead className="py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center w-48">Abertura</TableHead>
                      <TableHead className="py-4 pr-8 text-xs font-bold uppercase tracking-wider text-gray-500 text-center w-48">Fechamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(hoursQuery.isLoading ? defaultHours : hoursForm).map((item) => {
                      const day = weekDays.find((d) => d.value === item.weekday)!;
                      const closed = item.isClosed;
                      return (
                        <TableRow key={item.weekday} className="group hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0">
                          <TableCell className="py-5 pl-8 font-bold text-gray-900">{day.label}</TableCell>
                          <TableCell className="py-5 text-center">
                            <div className="flex items-center justify-center gap-3">
                              <Badge className={cn(
                                "font-bold text-[10px] px-2 py-0.5 rounded-md border tracking-wider",
                                closed ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              )}>
                                {closed ? "FECHADO" : "ABERTO"}
                              </Badge>
                              <Switch
                                checked={!closed}
                                onCheckedChange={(val) => handleHourChange(item.weekday, "isClosed", !val)}
                                className="data-[state=checked]:bg-emerald-500"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="py-5 text-center px-8">
                            <Input
                              type="time"
                              value={item.openTime || ""}
                              onChange={(e) => handleHourChange(item.weekday, "openTime", e.target.value)}
                              disabled={closed}
                              className="h-11 border-gray-100 focus:border-blue-400 focus:ring-blue-50 rounded-xl transition-all font-bold text-center disabled:opacity-30 disabled:bg-gray-50"
                            />
                          </TableCell>
                          <TableCell className="py-5 text-center pr-8">
                            <Input
                              type="time"
                              value={item.closeTime || ""}
                              onChange={(e) => handleHourChange(item.weekday, "closeTime", e.target.value)}
                              disabled={closed}
                              className="h-11 border-gray-100 focus:border-blue-400 focus:ring-blue-50 rounded-xl transition-all font-bold text-center disabled:opacity-30 disabled:bg-gray-50"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                
                <div className="p-8 bg-gray-50/30 border-t border-gray-100 flex justify-end">
                  <Button onClick={handleSaveHours} disabled={saveHours.isPending || hoursQuery.isLoading} className="h-12 px-10 bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-200/50 rounded-xl transition-all">
                    {saveHours.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Clock3 className="h-4 w-4 mr-2" />}
                    SALVAR JORNADA DE TRABALHO
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feriados" className="space-y-8 outline-none animate-in fade-in-50 duration-300">
            <Card className="border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 px-8 py-6">
                <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                  <CalendarDays className="h-6 w-6 text-blue-600" />
                  Calendário de Feriados
                </CardTitle>
                <CardDescription className="text-gray-500 font-medium">Gestão de datas não úteis para suspensão automática de SLAs</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <form className="grid gap-6 md:grid-cols-4 items-end bg-gray-50/50 p-6 rounded-2xl border border-gray-100" onSubmit={handleHolidaySubmit}>
                  <div className="md:col-span-1.5 space-y-2">
                    <Label className="uppercase text-[11px] font-bold text-gray-400 tracking-widest pl-1">Descrição do Feriado</Label>
                    <Input
                      value={holidayForm.name}
                      onChange={(e) => setHolidayForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Ex.: Aniversário da Cidade"
                      required
                      className="h-12 border-gray-100 focus:border-blue-400 focus:ring-blue-50 rounded-xl transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase text-[11px] font-bold text-gray-400 tracking-widest pl-1">Data</Label>
                    <Input
                      type="date"
                      value={holidayForm.date}
                      onChange={(e) => setHolidayForm((p) => ({ ...p, date: e.target.value }))}
                      required
                      className="h-12 border-gray-100 focus:border-blue-400 focus:ring-blue-50 rounded-xl transition-all font-bold tabular-nums"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="uppercase text-[11px] font-bold text-gray-400 tracking-widest pl-1">Configurações</Label>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-100">
                        <Switch
                          checked={holidayForm.isNational}
                          onCheckedChange={(v) => setHolidayForm((p) => ({ ...p, isNational: v }))}
                          className="scale-90"
                        />
                        <span className="text-[11px] font-bold text-gray-500 uppercase">Nacional</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-100">
                        <Switch
                          checked={holidayForm.isRecurring}
                          onCheckedChange={(v) => setHolidayForm((p) => ({ ...p, isRecurring: v }))}
                          className="scale-90"
                        />
                        <span className="text-[11px] font-bold text-gray-500 uppercase">Recorrente</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex md:justify-end">
                    <Button type="submit" disabled={createHoliday.isPending || updateHoliday.isPending} className="w-full md:w-auto h-12 px-8 bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-200/50 rounded-xl transition-all gap-2">
                      {(createHoliday.isPending || updateHoliday.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {editingHolidayId ? "SALVAR EDIÇÃO" : "ADICIONAR FERIADO"}
                    </Button>
                  </div>
                </form>

                <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-gray-50/50">
                      <TableRow className="border-b border-gray-100">
                        <TableHead className="py-4 pl-8 text-xs font-bold uppercase tracking-wider text-gray-500">Data</TableHead>
                        <TableHead className="py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Descrição</TableHead>
                        <TableHead className="py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center w-64">Classificação</TableHead>
                        <TableHead className="py-4 pr-8 text-xs font-bold uppercase tracking-wider text-gray-500 text-right w-40">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holidaysQuery.isLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-20">
                            <div className="flex flex-col items-center gap-3">
                              <Loader2 className="h-8 w-8 animate-spin text-blue-300" />
                              <p className="text-sm font-medium text-gray-400">Carregando calendário...</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : holidays.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-24 bg-gray-50/20">
                             <div className="flex flex-col items-center justify-center text-gray-300">
                              <CalendarDays className="h-12 w-12 mb-4 opacity-20" />
                              <p className="text-lg font-bold text-gray-900 leading-none mb-1">Nenhum feriado</p>
                              <p className="text-sm font-medium">Cadastre feriados locais ou nacionais</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        holidays.map((holiday: any) => {
                          const dateObj = holiday.date instanceof Date ? holiday.date : new Date(holiday.date);
                          const formattedDate = dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
                          
                          return (
                            <TableRow key={holiday.id} className="group hover:bg-blue-50/30 transition-all border-b border-gray-100 last:border-0">
                              <TableCell className="py-4 pl-8">
                                <span className="font-bold text-gray-900 tabular-nums">{formattedDate}</span>
                              </TableCell>
                              <TableCell className="py-4">
                                <span className="font-bold text-gray-700">{holiday.name}</span>
                              </TableCell>
                              <TableCell className="py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {holiday.isNational && (
                                    <Badge className="bg-blue-50 text-blue-700 border-blue-100 font-bold text-[10px] tracking-wider">
                                      NACIONAL
                                    </Badge>
                                  )}
                                  {holiday.isRecurring && (
                                    <Badge variant="outline" className="border-gray-100 text-gray-500 bg-gray-50 font-bold text-[10px] tracking-wider">
                                      RECORRENTE
                                    </Badge>
                                  )}
                                  {!holiday.isNational && !holiday.isRecurring && (
                                    <Badge variant="outline" className="border-gray-100 text-gray-400 font-bold text-[10px]">
                                      AVULSO
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-4 pr-8 text-right">
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <Button size="icon" variant="ghost" className="h-9 w-9 text-gray-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => startEditHoliday(holiday)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="icon" variant="ghost" className="h-9 w-9 text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                          <div className="p-2 bg-rose-50 rounded-xl">
                                            <Trash2 className="h-6 w-6 text-rose-600" />
                                          </div>
                                          Excluir Feriado
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="text-gray-600 pt-2 text-base">
                                          Deseja remover <strong className="text-gray-900">{holiday.name}</strong> do calendário? Esta ação influenciará nos cálculos de SLA.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter className="pt-6">
                                        <AlertDialogCancel className="h-11 px-6 rounded-xl font-medium border-gray-200">Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteHoliday.mutate({ id: holiday.id })} className="h-11 px-8 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl">
                                          Confirmar Exclusão
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="indicadores" className="space-y-8 outline-none animate-in fade-in-50 duration-300">
             <div className="grid gap-6 md:grid-cols-3">
              {[
                { label: "Total de Clientes", value: stats?.totals.clientes ?? 0, icon: <UserRound className="h-5 w-5 text-blue-600" />, sub: "Base completa" },
                { label: "Clientes Ativos", value: stats?.totals.ClientesAtivos ?? 0, icon: <Check className="h-5 w-5 text-emerald-600" />, sub: "Vínculos presentes" },
                { label: "Total de Contratos", value: stats?.totals.contracts ?? 0, icon: <FileText className="h-5 w-5 text-indigo-600" />, sub: "Empresas/Projetos" },
              ].map((item) => (
                <Card key={item.label} className="border-gray-100 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all group">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                        {item.icon}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">{item.label}</p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <p className="text-3xl font-bold text-gray-900 tracking-tight">{loadingStats ? "..." : item.value}</p>
                        <p className="text-xs text-gray-400 font-medium">registros</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-3 font-medium">{item.sub}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 px-8 py-6">
                <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                  <Globe className="h-6 w-6 text-blue-600" />
                  Clientes por Contrato
                </CardTitle>
                <CardDescription className="text-gray-500 font-medium">Distribuição de Clientes vinculados por diretoria/contrato</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-50/30">
                    <TableRow className="border-b border-gray-100">
                      <TableHead className="py-4 pl-8 text-xs font-bold uppercase tracking-wider text-gray-500">Contrato / Diretoria</TableHead>
                      <TableHead className="py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center w-48">Total Clientes</TableHead>
                      <TableHead className="py-4 pr-8 text-xs font-bold uppercase tracking-wider text-gray-500 text-center w-48">Clientes Ativos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingStats ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-20">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-200 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : (stats?.contracts?.length ?? 0) === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-24 text-gray-400">
                          Nenhum dado de contrato disponível
                        </TableCell>
                      </TableRow>
                    ) : (
                      stats?.contracts.map((contract) => {
                        const isSelected = selectedContractId === contract.contractId;
                        return (
                          <TableRow
                            key={contract.contractId}
                            className={cn(
                              "group transition-all cursor-pointer border-b border-gray-100 last:border-0",
                              isSelected ? "bg-blue-50/50" : "hover:bg-gray-50/50"
                            )}
                            onClick={() => setSelectedContractId(contract.contractId)}
                          >
                            <TableCell className="py-5 pl-8 font-bold text-gray-900 group-hover:text-blue-700">{contract.name}</TableCell>
                            <TableCell className="py-5 text-center font-bold text-gray-600 tabular-nums">{contract.totalClientes}</TableCell>
                            <TableCell className="py-5 text-center pr-8">
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold px-3 py-1 rounded-full text-[11px]">
                                {contract.totalAtivos} ATIVOS
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {selectedContract && (
              <div className="bg-blue-600 p-8 rounded-3xl shadow-xl shadow-blue-200/50 text-white flex flex-col md:flex-row items-center justify-between gap-8 animate-in slide-in-from-bottom-5 duration-500">
                <div className="space-y-2 text-center md:text-left">
                  <p className="text-blue-100 text-xs font-bold uppercase tracking-[0.2em]">Detalhes do Vínculo</p>
                  <h3 className="text-2xl font-bold">{selectedContract.name}</h3>
                </div>
                <div className="flex gap-4">
                  <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 flex flex-col items-center min-w-[140px]">
                    <span className="text-blue-100 text-[10px] font-bold uppercase tracking-wider mb-1">Carga Total</span>
                    <span className="text-3xl font-bold">{selectedContract.totalClientes}</span>
                  </div>
                  <div className="bg-white px-6 py-4 rounded-2xl flex flex-col items-center min-w-[140px] shadow-sm">
                    <span className="text-blue-600 text-[10px] font-bold uppercase tracking-wider mb-1">Efetivo Ativo</span>
                    <span className="text-3xl font-bold text-gray-900">{selectedContract.totalAtivos}</span>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}



