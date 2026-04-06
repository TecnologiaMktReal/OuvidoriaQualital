import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Mail, RefreshCw, CheckCircle2, XCircle, Plug, Inbox, Send } from "lucide-react";

type AccountForm = {
  id?: number;
  name: string;
  email: string;
  fromAddress: string;
  replyTo: string;
  signature: string;
  isDefault: boolean;
  maxAttachmentMb: number;
  reopenClosedPolicy: "reopen" | "bounce";
  defaultContractId?: number | null;
  departmentId?: number | null;
  reasonId?: number | null;
  ticketTypeId?: number | null;
  criticityId?: number | null;
};

type CredentialForm = {
  host: string;
  port: string;
  secure: "none" | "starttls" | "ssl";
  username: string;
  passwordEncrypted: string;
  protocol: "smtp" | "imap" | "pop3";
};

const initialAccount: AccountForm = {
  name: "",
  email: "",
  fromAddress: "",
  replyTo: "",
  signature: "",
  isDefault: false,
  maxAttachmentMb: 10,
  reopenClosedPolicy: "reopen",
};

const initialSmtp: CredentialForm = {
  host: "",
  port: "587",
  secure: "starttls",
  username: "",
  passwordEncrypted: "",
  protocol: "smtp",
};

const initialReceive: CredentialForm = {
  host: "",
  port: "993",
  secure: "ssl",
  username: "",
  passwordEncrypted: "",
  protocol: "imap",
};

const statusColor: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  testing: "bg-blue-100 text-blue-800",
  error: "bg-red-100 text-red-800",
  inactive: "bg-slate-100 text-slate-800",
};

export default function SetupEmails() {
  const listQuery = trpc.emailSetup.list.useQuery();
  const logsQuery = trpc.emailSetup.getTestLogs.useQuery(
    { accountId: listQuery.data?.[0]?.id ?? 0, limit: 20 },
    { enabled: Boolean(listQuery.data?.length) }
  );
  
  const deptsQuery = trpc.departments.list.useQuery();
  const reasonsQuery = trpc.attendanceReasons.list.useQuery();
  const contractsQuery = trpc.contracts.list.useQuery({ pageSize: 100 });
  const ticketTypesQuery = trpc.ticketSetup.ticketTypes.list.useQuery();
  const criticitiesQuery = trpc.ticketSetup.criticities.list.useQuery();

  const utils = trpc.useUtils();

  const createAccount = trpc.emailSetup.createAccount.useMutation({
    onSuccess: () => {
      toast.success("Conta criada");
      utils.emailSetup.list.invalidate();
      resetForms();
    },
    onError: err => toast.error(err.message),
  });

  const updateAccount = trpc.emailSetup.updateAccount.useMutation({
    onSuccess: () => {
      toast.success("Conta atualizada");
      utils.emailSetup.list.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const setDefault = trpc.emailSetup.setDefault.useMutation({
    onSuccess: () => {
      toast.success("Conta definida como padrão");
      utils.emailSetup.list.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const upsertCredential = trpc.emailSetup.upsertCredential.useMutation({
    onSuccess: () => {
      toast.success("Credencial salva");
    },
    onError: err => toast.error(err.message),
  });

  const testConnection = trpc.emailSetup.testConnection.useMutation({
    onSuccess: (res: any) => {
      if (res.ok) toast.success(res.message || "Teste realizado");
      else toast.error(res.error || "Falha no teste");
      utils.emailSetup.getTestLogs.invalidate({ accountId: selectedId!, limit: 20 });
    },
    onError: err => toast.error(err.message),
  });

  const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
  const [accountForm, setAccountForm] = useState<AccountForm>(initialAccount);
  const [smtpForm, setSmtpForm] = useState<CredentialForm>(initialSmtp);
  const [receiveForm, setReceiveForm] = useState<CredentialForm>(initialReceive);

  const selectedAccount = useMemo(() => {
    if (!selectedId || !listQuery.data) return undefined;
    return listQuery.data.find(a => a.id === selectedId);
  }, [selectedId, listQuery.data]);

  useEffect(() => {
    if (listQuery.data && listQuery.data.length > 0 && !selectedId) {
      setSelectedId(listQuery.data[0].id);
    }
  }, [listQuery.data, selectedId]);

  useEffect(() => {
    if (selectedAccount) {
      setAccountForm({
        id: selectedAccount.id,
        name: selectedAccount.name || "",
        email: selectedAccount.email || "",
        fromAddress: selectedAccount.fromAddress || selectedAccount.email || "",
        replyTo: selectedAccount.replyTo || "",
        signature: selectedAccount.signature || "",
        isDefault: !!selectedAccount.isDefault,
        maxAttachmentMb: selectedAccount.maxAttachmentMb ?? 10,
        reopenClosedPolicy: selectedAccount.reopenClosedPolicy || "reopen",
        defaultContractId: selectedAccount.defaultContractId ?? null,
        departmentId: selectedAccount.departmentId ?? null,
        reasonId: selectedAccount.reasonId ?? null,
        ticketTypeId: selectedAccount.ticketTypeId ?? null,
        criticityId: selectedAccount.criticityId ?? null,
      });
    } else {
      resetForms();
    }
  }, [selectedAccount]);

  const resetForms = () => {
    setAccountForm(initialAccount);
    setSmtpForm(initialSmtp);
    setReceiveForm(initialReceive);
  };

  const handleAccountSubmit = () => {
    if (!accountForm.name || !accountForm.email) {
      toast.error("Nome e e-mail são obrigatórios");
      return;
    }
    if (accountForm.id) {
      updateAccount.mutate({ ...accountForm, id: accountForm.id } as any);
    } else {
      createAccount.mutate(accountForm as any);
    }
  };

  const handleCredentialSubmit = (form: CredentialForm) => {
    if (!selectedId) {
      toast.error("Selecione ou crie uma conta primeiro");
      return;
    }
    if (!form.host || !form.port || !form.username) {
      toast.error("Host, porta e usuário são obrigatórios");
      return;
    }
    upsertCredential.mutate({
      accountId: selectedId,
      protocol: form.protocol,
      host: form.host,
      port: Number(form.port),
      secure: form.secure,
      authType: "password",
      username: form.username,
      passwordEncrypted: form.passwordEncrypted || undefined,
    });
  };

  const handleTest = (type: "smtp" | "imap" | "pop3") => {
    if (!selectedId) {
      toast.error("Selecione ou crie uma conta primeiro");
      return;
    }
    testConnection.mutate({ accountId: selectedId, type });
  };

  const statusBadge = (status?: string) => (
    <Badge className={statusColor[status ?? "inactive"] || statusColor.inactive}>
      {status || "inactive"}
    </Badge>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Plug className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Setup E-mails</h1>
            <p className="text-muted-foreground">Configure contas de envio e recepção para tickets por e-mail</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle>Contas de E-mail</CardTitle>
              <CardDescription>Cadastre, edite e escolha a conta padrão</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {listQuery.data?.length ? (
                  listQuery.data.map(account => (
                    <div
                      key={account.id}
                      className={`flex items-center justify-between rounded-lg border p-3 hover:bg-accent cursor-pointer ${
                        selectedId === account.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedId(account.id)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{account.name}</span>
                          {account.isDefault && <Badge variant="outline">Padrão</Badge>}
                          {statusBadge(account.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{account.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDefault.mutate({ id: account.id });
                          }}
                          disabled={setDefault.isPending}
                        >
                          Tornar padrão
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <Alert>
                    <AlertTitle>Nenhuma conta configurada</AlertTitle>
                    <AlertDescription>Cadastre uma conta para habilitar o canal E-mail.</AlertDescription>
                  </Alert>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="grid gap-2">
                  <Label>Nome de exibição</Label>
                  <Input
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                    placeholder="Suporte Qualital"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>E-mail</Label>
                  <Input
                    value={accountForm.email}
                    onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                    placeholder="suporte@exemplo.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>From (opcional)</Label>
                  <Input
                    value={accountForm.fromAddress}
                    onChange={(e) => setAccountForm({ ...accountForm, fromAddress: e.target.value })}
                    placeholder="Suporte <suporte@exemplo.com>"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Reply-To (opcional)</Label>
                  <Input
                    value={accountForm.replyTo}
                    onChange={(e) => setAccountForm({ ...accountForm, replyTo: e.target.value })}
                    placeholder="responder@exemplo.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Assinatura padrão</Label>
                  <Textarea
                    value={accountForm.signature}
                    onChange={(e) => setAccountForm({ ...accountForm, signature: e.target.value })}
                    placeholder="Atenciosamente, Equipe Qualital"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Limite de anexos (MB)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={accountForm.maxAttachmentMb}
                    onChange={(e) => setAccountForm({ ...accountForm, maxAttachmentMb: Number(e.target.value) })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Departamento Padrão</Label>
                    <Select
                      value={accountForm.departmentId?.toString() || "none"}
                      onValueChange={(v) => setAccountForm({ ...accountForm, departmentId: v === "none" ? null : Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {deptsQuery.data?.map(d => (
                          <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Motivo Padrão</Label>
                    <Select
                      value={accountForm.reasonId?.toString() || "none"}
                      onValueChange={(v) => setAccountForm({ ...accountForm, reasonId: v === "none" ? null : Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {reasonsQuery.data?.map(r => (
                          <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Contrato padrão</Label>
                  <Select
                    value={accountForm.defaultContractId?.toString() || "none"}
                    onValueChange={(v) => setAccountForm({ ...accountForm, defaultContractId: v === "none" ? null : Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o contrato..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {contractsQuery.data?.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Tipo de Ticket</Label>
                    <Select
                      value={accountForm.ticketTypeId?.toString() || "none"}
                      onValueChange={(v) => setAccountForm({ ...accountForm, ticketTypeId: v === "none" ? null : Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {ticketTypesQuery.data?.map(t => (
                          <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Criticidade</Label>
                    <Select
                      value={accountForm.criticityId?.toString() || "none"}
                      onValueChange={(v) => setAccountForm({ ...accountForm, criticityId: v === "none" ? null : Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {criticitiesQuery.data?.map(c => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Regra para ticket fechado</Label>
                  <Select
                    value={accountForm.reopenClosedPolicy}
                    onValueChange={(v: "reopen" | "bounce") => setAccountForm({ ...accountForm, reopenClosedPolicy: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reopen">Reabrir ticket</SelectItem>
                      <SelectItem value="bounce">Responder aviso padrão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={accountForm.isDefault}
                    onCheckedChange={(checked) => setAccountForm({ ...accountForm, isDefault: checked })}
                    id="default"
                  />
                  <Label htmlFor="default">Definir como padrão</Label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAccountSubmit} disabled={createAccount.isPending || updateAccount.isPending}>
                    {accountForm.id ? "Salvar alterações" : "Criar conta"}
                  </Button>
                  <Button variant="ghost" onClick={resetForms}>
                    Limpar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle>Credenciais & Testes</CardTitle>
              <CardDescription>Configure SMTP e IMAP/POP3 e valide as conexões</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">SMTP (envio)</h4>
                </div>
                <div className="grid gap-2">
                  <Label>Host</Label>
                  <Input value={smtpForm.host} onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Porta</Label>
                    <Input
                      value={smtpForm.port}
                      onChange={(e) => setSmtpForm({ ...smtpForm, port: e.target.value })}
                      placeholder="587"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Segurança</Label>
                    <Select
                      value={smtpForm.secure}
                      onValueChange={(v: "none" | "starttls" | "ssl") => setSmtpForm({ ...smtpForm, secure: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ssl">SSL/TLS</SelectItem>
                        <SelectItem value="starttls">STARTTLS</SelectItem>
                        <SelectItem value="none">Nenhum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Usuário</Label>
                  <Input
                    value={smtpForm.username}
                    onChange={(e) => setSmtpForm({ ...smtpForm, username: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Senha / App Password</Label>
                  <Input
                    type="password"
                    value={smtpForm.passwordEncrypted}
                    onChange={(e) => setSmtpForm({ ...smtpForm, passwordEncrypted: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleCredentialSubmit(smtpForm)}
                    disabled={upsertCredential.isPending}
                  >
                    Salvar SMTP
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleTest("smtp")}
                    disabled={testConnection.isPending}
                  >
                    {testConnection.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                    Testar envio
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Recepção (IMAP/POP3)</h4>
                </div>
                <div className="grid gap-2">
                  <Label>Protocolo</Label>
                  <Select
                    value={receiveForm.protocol}
                    onValueChange={(v: "imap" | "pop3") => setReceiveForm({ ...receiveForm, protocol: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="imap">IMAP</SelectItem>
                      <SelectItem value="pop3">POP3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Host</Label>
                  <Input
                    value={receiveForm.host}
                    onChange={(e) => setReceiveForm({ ...receiveForm, host: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Porta</Label>
                    <Input
                      value={receiveForm.port}
                      onChange={(e) => setReceiveForm({ ...receiveForm, port: e.target.value })}
                      placeholder={receiveForm.protocol === "imap" ? "993" : "995"}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Segurança</Label>
                    <Select
                      value={receiveForm.secure}
                      onValueChange={(v: "none" | "starttls" | "ssl") => setReceiveForm({ ...receiveForm, secure: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ssl">SSL/TLS</SelectItem>
                        <SelectItem value="starttls">STARTTLS</SelectItem>
                        <SelectItem value="none">Nenhum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Usuário</Label>
                  <Input
                    value={receiveForm.username}
                    onChange={(e) => setReceiveForm({ ...receiveForm, username: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Senha / App Password</Label>
                  <Input
                    type="password"
                    value={receiveForm.passwordEncrypted}
                    onChange={(e) => setReceiveForm({ ...receiveForm, passwordEncrypted: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleCredentialSubmit(receiveForm)}
                    disabled={upsertCredential.isPending}
                  >
                    Salvar recepção
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleTest(receiveForm.protocol)}
                    disabled={testConnection.isPending}
                  >
                    {testConnection.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                    Testar recepção
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Logs de Teste (últimos 20)</h4>
                </div>
                {logsQuery.data && logsQuery.data.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {logsQuery.data.map((log) => (
                      <div key={log.id} className="rounded border p-2 text-sm flex items-start gap-2">
                        {log.success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{log.type.toUpperCase()}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.createdAt).toLocaleString("pt-BR")}
                            </span>
                          </div>
                          <div className="text-muted-foreground">{log.message || "Sem mensagem"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum teste registrado ainda.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}




