import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Pencil, Plus, Trash2, EyeOff, Eye, Sparkles, Filter, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

const COLOR_PRESETS = ["#0ea5e9", "#2563eb", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316", "#d946ef", "#475569"];

const PROTECTED_STATUSES = [
  "aguardando_atendimento",
  "em_atendimento",
  "em_espera",
  "aguardando_resposta",
  "atendimento_fechado",
  "ticket_invalido"
];

type ColorFieldProps = {
  value: string;
  onChange: (v: string) => void;
  label: string;
};

function ColorField({ value, onChange, label }: ColorFieldProps) {
  const selected = value || "#2563eb";

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-primary" />
        {label}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="justify-start w-full md:w-auto gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-md border" style={{ backgroundColor: selected }} />
            <span className="font-mono text-sm">{selected}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-3">
          <div className="text-sm text-muted-foreground">Escolha uma cor rápida ou ajuste manualmente.</div>
          <div className="grid grid-cols-5 gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                className={cn(
                  "h-8 rounded-md border shadow-sm transition hover:scale-[1.03]",
                  selected === c && "ring-2 ring-offset-1 ring-primary"
                )}
                style={{ backgroundColor: c }}
                onClick={() => onChange(c)}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={selected}
              onChange={(e) => onChange(e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`)}
              placeholder="#005487"
              className="font-mono"
            />
            <Input
              type="color"
              value={selected}
              onChange={(e) => onChange(e.target.value)}
              className="w-16 h-10 p-1"
            />
            <Button type="button" variant="ghost" onClick={() => onChange("")}>
              Limpar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

type BaseEntity = {
  id: number;
  name: string;
  color?: string | null;
  slaMinutes?: number | null;
  isActive?: boolean | null;
  slug?: string | null;
  department?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  acronym?: string | null;
  isDefault?: boolean | null;
  timeoutMinutes?: number | null;
  nextStatusSlug?: string | null;
  defaultStatusSlug?: string | null;
};

type CrudConfig = {
  title: string;
  description: string;
  query: any;
  create: any;
  update: any;
  toggle?: any;
  remove: any;
  fields: Array<{
    key: keyof BaseEntity;
    label: string;
    type?: "text" | "number" | "color" | "select" | "boolean";
    required?: boolean;
    options?: Array<{ label: string; value: string }>;
  }>;
  disableCreate?: boolean;
  disableDelete?: boolean;
  extraInfo?: (item: BaseEntity) => React.ReactNode;
};

function ColorBadge({ item }: { item: BaseEntity }) {
  const color = item.color || "#475569";
  return (
    <Badge style={{ backgroundColor: color, color: "#fff", border: "1px solid rgba(0,0,0,0.05)" }} className="gap-2 shadow-sm">
      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-white/70" />
      {item.name}
    </Badge>
  );
}

function InfoPill({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-muted-foreground bg-muted">
      {label}: <span className="ml-1 font-semibold text-foreground">{value}</span>
    </span>
  );
}

function CrudTable({ config }: { config: CrudConfig }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = config.query.useQuery();
  const departmentsQuery = config.fields.some((f) => f.key === "departmentId" || f.key === "department")
    ? trpc.departments.list.useQuery()
    : undefined;
  const departmentOptions =
    departmentsQuery?.data?.map((d: any) => ({ label: d.name, value: String(d.id) })) ??
    [{ label: "Atendimento", value: "Atendimento" }];
  const createMutation = config.create.useMutation({
    onSuccess: async () => {
      toast.success("Criado com sucesso");
      await utils.invalidate();
      setOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });
  const updateMutation = config.update.useMutation({
    onSuccess: async () => {
      toast.success("Atualizado com sucesso");
      await utils.invalidate();
      setOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });
  const toggleMutation = config.toggle?.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });
  const deleteMutation = config.remove.useMutation({
    onSuccess: async () => {
      toast.success("Excluído");
      await utils.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BaseEntity | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const items: BaseEntity[] = useMemo(() => data || [], [data]);
  const filtered = items
    .filter((i) => i.name?.toLowerCase().includes(search.toLowerCase()))
    .filter((i) => (showInactive ? true : i.isActive !== false))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const handleOpenCreate = () => {
    setEditing(null);
    const defaultForm: Record<string, any> = {};
    config.fields.forEach((f) => {
      if (f.type === "select" && (f.key === "department" || f.key === "departmentId")) {
        defaultForm[f.key as string] = departmentOptions[0]?.value ?? "Atendimento";
      }
    });
    setForm(defaultForm);
    setOpen(true);
  };

  const handleOpenEdit = (item: BaseEntity) => {
    setEditing(item);
    setForm({
      name: item.name,
      slug: item.slug ?? "",
      color: item.color ?? "",
      slaMinutes: item.slaMinutes ?? "",
      department: (item as any).department ?? "",
      departmentId: (item as any).departmentId ? String((item as any).departmentId) : "",
      departmentName: (item as any).departmentName ?? "",
      acronym: (item as any).acronym ?? "",
      isDefault: (item as any).isDefault ?? false,
      timeoutMinutes: (item as any).timeoutMinutes ?? "",
      nextStatusSlug: (item as any).nextStatusSlug ?? "",
      defaultStatusSlug: (item as any).defaultStatusSlug ?? "",
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "_"),
      slaMinutes: form.slaMinutes ? Number(form.slaMinutes) : null,
      departmentId: form.departmentId ? Number(form.departmentId) : form.department ? Number(form.department) : null,
      isDefault: !!form.isDefault,
      timeoutMinutes: form.timeoutMinutes ? Number(form.timeoutMinutes) : null,
      nextStatusSlug: form.nextStatusSlug || null,
      defaultStatusSlug: form.defaultStatusSlug || null,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {config.title}
          </CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Mostrar inativos</span>
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />
          </div>
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-52" />
          {!config.disableCreate && (
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                {config.fields.some((f) => f.key === "slaMinutes") && (
                  <TableHead>{config.fields.find(f => f.key === "slaMinutes")?.label || "SLA"}</TableHead>
                )}
                {config.fields.some((f) => f.key === "departmentId" || f.key === "department") && <TableHead>Departamento</TableHead>}
                {config.fields.some((f) => f.key === "color") && <TableHead>Cor</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4}>Carregando...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>Nenhum registro</TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                      <ColorBadge item={item} />
                      <div className="flex gap-2 flex-wrap text-xs">
                      {(item as any).isDefault ? (
                        <Badge variant="outline" className="border-primary/50 text-primary">
                          Padrão
                        </Badge>
                      ) : null}
                      {(item as any).acronym ? (
                        <Badge variant="secondary">{(item as any).acronym}</Badge>
                      ) : null}
                        {config.fields.some((f) => f.key === "department") && (
                          <Badge variant="outline" className="bg-muted/60">
                            {(item as any).departmentName ?? (item as any).department ?? "Atendimento"}
                          </Badge>
                        )}
                        {config.fields.some((f) => f.key === "slaMinutes") && (
                          <InfoPill label="SLA" value={item.slaMinutes} />
                        )}
                        {config.extraInfo ? config.extraInfo(item) : null}
                      </div>
                      </div>
                    </TableCell>
                    {config.fields.some((f) => f.key === "slaMinutes") && (
                      <TableCell>{item.slaMinutes ?? "-"}</TableCell>
                    )}
                    {config.fields.some((f) => f.key === "department" || f.key === "departmentId") && (
                      <TableCell>{(item as any).departmentName ?? (item as any).department ?? "Atendimento"}</TableCell>
                    )}
                    {config.fields.some((f) => f.key === "color") && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded border shadow-sm" style={{ backgroundColor: item.color || "#475569" }} />
                          <span className="font-mono text-[10px] uppercase">{item.color || "-"}</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant={!!item.isActive ? "default" : "outline"} className={cn(!item.isActive && "text-muted-foreground")}>
                        {item.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleOpenEdit(item)}
                        disabled={config.title.includes("Status") && PROTECTED_STATUSES.includes(item.slug || "")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {config.toggle && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleMutation?.mutate({ id: item.id, isActive: !item.isActive })}
                          disabled={config.title.includes("Status") && PROTECTED_STATUSES.includes(item.slug || "")}
                        >
                          {!!item.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      )}
                      {!config.disableDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteMutation.mutate({ id: item.id })}
                          disabled={config.title.includes("Status") && PROTECTED_STATUSES.includes(item.slug || "")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Novo"} {config.title}</DialogTitle>
            <DialogDescription>
              {editing ? "Altere as informações abaixo para atualizar" : "Preencha as informações abaixo para criar"} um novo registro de {config.title.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              {config.fields.map((field) => {
                if (field.type === "color") {
                  return (
                    <ColorField
                      key={field.key as string}
                      label={field.label}
                      value={form[field.key as string] || ""}
                      onChange={(v) => setForm((prev) => ({ ...prev, [field.key]: v }))}
                    />
                  );
                }
                if (field.type === "number") {
                  return (
                    <div className="space-y-1.5" key={field.key as string}>
                      <Label>{field.label}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={form[field.key as string] ?? ""}
                        onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        required={field.required}
                      />
                    </div>
                  );
                }
              if (field.type === "boolean") {
                return (
                  <div key={field.key as string} className="flex items-center justify-between rounded-md border p-3">
                    <div className="space-y-1">
                      <Label>{field.label}</Label>
                      <p className="text-xs text-muted-foreground">Define se este será o padrão.</p>
                    </div>
                    <Switch
                      checked={!!form[field.key as string]}
                      onCheckedChange={(val) => setForm((prev) => ({ ...prev, [field.key]: val }))}
                    />
                  </div>
                );
              }
      if (field.type === "select") {
                  const options = field.options ?? (field.key === "department" || field.key === "departmentId" ? departmentOptions : []);
                  return (
                    <div className="space-y-1.5" key={field.key as string}>
                      <Label>{field.label}</Label>
                      <Select
                        value={form[field.key as string] ?? options[0]?.value ?? "Atendimento"}
                        onValueChange={(val) => setForm((prev) => ({ ...prev, [field.key]: val }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {options.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }
                return (
                  <div className="space-y-1.5" key={field.key as string}>
                    <Label>{field.label}</Label>
                    <Input
                      type="text"
                      value={form[field.key as string] ?? ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      required={field.required}
                      disabled={!!editing && field.key === "slug" && config.title.includes("Status")}
                    />
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? "Salvar alterações" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function SetupTickets() {
  const statusConfig: CrudConfig = {
    title: "Status dos Tickets",
    description: "Gerencie os status com SLA e cor",
    query: trpc.ticketSetup.statuses.list,
    create: trpc.ticketSetup.statuses.create,
    update: trpc.ticketSetup.statuses.update,
    toggle: trpc.ticketSetup.statuses.toggle,
    remove: trpc.ticketSetup.statuses.delete,
    fields: [
      { key: "name", label: "Nome", required: true },
      { key: "slug", label: "Slug/Código", required: true },
      { key: "slaMinutes", label: "SLA (minutos)", type: "number" },
      { key: "color", label: "Cor", type: "color" },
    ],
    extraInfo: (item) => (
      <div className="flex flex-col gap-1 mt-1">
        {item.timeoutMinutes ? (
           <InfoPill label="Auto-fechar" value={`${item.timeoutMinutes}m -> ${item.nextStatusSlug}`} />
        ) : null}
      </div>
    )
  };

  const allStatuses = trpc.ticketSetup.statuses.list.useQuery();
  const statusOptions = allStatuses.data?.map(s => ({ label: s.name, value: s.slug! })) || [];

  const statusConfigExtended: CrudConfig = {
    ...statusConfig,
    disableCreate: true,
    disableDelete: true,
    fields: [
      ...statusConfig.fields,
      { key: "timeoutMinutes", label: "Inatividade (min)", type: "number" },
      { key: "nextStatusSlug", label: "Próximo Status (Automático)", type: "select", options: statusOptions },
    ]
  };

  const motivosConfig: CrudConfig = {
    title: "Motivos de Atendimento",
    description: "Motivos de atendimento vinculados",
    query: trpc.attendanceReasons.list,
    create: trpc.attendanceReasons.create,
    update: trpc.attendanceReasons.update,
    remove: trpc.attendanceReasons.delete,
    toggle: trpc.attendanceReasons.toggleStatus,
    fields: [
      { key: "name", label: "Nome", required: true },
      { key: "acronym", label: "Sigla" },
      { key: "departmentId", label: "Departamento Responsável", type: "select" },
      { key: "slaMinutes", label: "SLA (minutos)", type: "number" },
      { key: "color", label: "Cor", type: "color" },
      { key: "defaultStatusSlug", label: "Status Inicial Padrão", type: "select", options: statusOptions },
    ],
  };

  const tipoTicketConfig: CrudConfig = {
    title: "Tipo do Ticket",
    description: "Classificações de ticket",
    query: trpc.ticketSetup.ticketTypes.list,
    create: trpc.ticketSetup.ticketTypes.create,
    update: trpc.ticketSetup.ticketTypes.update,
    toggle: trpc.ticketSetup.ticketTypes.toggle,
    remove: trpc.ticketSetup.ticketTypes.delete,
    fields: [
      { key: "name", label: "Nome", required: true },
      { key: "color", label: "Cor", type: "color" },
      { key: "isDefault", label: "Marcar como padrão", type: "boolean" },
    ],
  };

  const criticidadeConfig: CrudConfig = {
    title: "Criticidade",
    description: "Níveis de criticidade e SLA",
    query: trpc.ticketSetup.criticities.list,
    create: trpc.ticketSetup.criticities.create,
    update: trpc.ticketSetup.criticities.update,
    toggle: trpc.ticketSetup.criticities.toggle,
    remove: trpc.ticketSetup.criticities.delete,
    fields: [
      { key: "name", label: "Nome", required: true },
      { key: "slaMinutes", label: "SLA (minutos)", type: "number" },
      { key: "color", label: "Cor", type: "color" },
      { key: "isDefault", label: "Marcar como padrão", type: "boolean" },
    ],
  };

  return (
    <Layout>
      <div className="space-y-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Setup dos Tickets</CardTitle>
            <CardDescription>Configurações visuais e operacionais dos tickets.</CardDescription>
          </CardHeader>
        </Card>

        <Tabs defaultValue="status" className="space-y-4">
          <TabsList>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="motivos">Motivos de Atendimento</TabsTrigger>
            <TabsTrigger value="criticidade">Criticidade</TabsTrigger>
            <TabsTrigger value="tipo-ticket">Tipo do Ticket</TabsTrigger>
          </TabsList>

          <TabsContent value="status">
            <CrudTable config={statusConfigExtended} />
          </TabsContent>

          <TabsContent value="motivos">
            <CrudTable config={motivosConfig} />
          </TabsContent>

          <TabsContent value="criticidade">
            <CrudTable config={criticidadeConfig} />
          </TabsContent>

          <TabsContent value="tipo-ticket">
            <CrudTable config={tipoTicketConfig} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}




