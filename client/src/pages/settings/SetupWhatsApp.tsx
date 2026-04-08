import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Plug,
  RefreshCw,
  ShieldCheck,
  Phone,
  Globe,
  LockKeyhole,
  Power,
  PowerOff,
  QrCode,
  Chrome,
  Sparkles,
  Check,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FormState = {
  phoneNumberId: string;
  businessAccountId: string;
  phoneNumber: string;
  appId: string;
  webhookUrl: string;
  accessToken: string;
  verifyToken: string;
  appSecret: string;
};

const statusStyles: Record<
  string,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  connected: { label: "Conectado", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  disabled: { label: "Desabilitado", color: "bg-gray-100 text-gray-800", icon: AlertCircle },
  not_configured: { label: "Não configurado", color: "bg-orange-100 text-orange-800", icon: AlertCircle },
  disconnected: { label: "Desconectado", color: "bg-red-100 text-red-800", icon: AlertCircle },
  error: { label: "Erro", color: "bg-red-100 text-red-800", icon: AlertCircle },
  qr_ready: { label: "Aguardando QR", color: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
  authenticating: { label: "Sincronizando...", color: "bg-blue-100 text-blue-800", icon: RefreshCw },
};

function formatDate(value?: string | null) {
  if (!value) return "Nunca";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function SetupWhatsApp() {
  const { data: config, isLoading, refetch } = trpc.whatsapp.getConfig.useQuery();
  const { data: status, refetch: refetchStatus } = trpc.whatsapp.getStatus.useQuery(undefined, {
    refetchInterval: 10000,
  });
  const { data: modeData, refetch: refetchMode } = trpc.whatsapp.getMode.useQuery();
  const qrStatus = status?.qr;
  const cloudStatus = status?.cloud;
  const qrHealth = status?.qrHealth;
  const qrDepsOk = qrHealth?.ok !== false;

  const saveMutation = trpc.whatsapp.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso");
      setForm((prev) => ({ ...prev, accessToken: "", verifyToken: "", appSecret: "" }));
      refetch();
      refetchStatus();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao salvar configurações");
    },
  });

  const testMutation = trpc.whatsapp.testConnection.useMutation({
    onSuccess: (result) => {
      if (result.ok) {
        toast.success("Conexão validada com sucesso");
      } else {
        toast.error(result.error || "Falha ao testar conexão");
      }
      refetchStatus();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao testar conexão");
    },
  });

  const setModeMutation = trpc.whatsapp.setMode.useMutation({
    onSuccess: (data, variables) => {
      toast.success("Modo atualizado");
      refetchMode();
      refetchStatus();
      // Scroll automático para a configuração do modo selecionado
      setTimeout(() => {
        const targetId = variables.mode === "cloud_api" ? "cloud-api-config" : "qr-config";
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao alterar modo");
    },
  });

  const initQrMutation = trpc.whatsapp.initializeQr.useMutation({
    onSuccess: () => {
      toast.success("Sessão QR iniciada");
      refetchStatus();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao iniciar QR");
    },
  });

  const disconnectQrMutation = trpc.whatsapp.disconnectQr.useMutation({
    onSuccess: () => {
      toast.success("Sessão QR desconectada");
      refetchStatus();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao desconectar QR");
    },
  });

  const [form, setForm] = useState<FormState>({
    phoneNumberId: "",
    businessAccountId: "",
    phoneNumber: "",
    appId: "",
    webhookUrl: "",
    accessToken: "",
    verifyToken: "",
    appSecret: "",
  });

  useEffect(() => {
    if (!config) return;
    setForm((prev) => ({
      ...prev,
      phoneNumberId: config.phoneNumberId || "",
      businessAccountId: config.businessAccountId || "",
      phoneNumber: config.phoneNumber || "",
      appId: config.appId || "",
      webhookUrl: config.webhookUrl || "",
    }));
  }, [config]);

  const activeMode = modeData?.mode || "cloud_api";
  const currentStatus = useMemo(() => {
    if (activeMode === "qr") {
      return qrStatus?.status || "disconnected";
    }
    return cloudStatus?.status || config?.status || "not_configured";
  }, [activeMode, cloudStatus?.status, config?.status, qrStatus?.status]);
  const statusInfo = statusStyles[currentStatus] || statusStyles["not_configured"];
  const StatusIcon = statusInfo.icon;

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.phoneNumberId.trim()) {
      toast.error("Informe o phone_number_id");
      return;
    }
    saveMutation.mutate({
      phoneNumberId: form.phoneNumberId.trim(),
      businessAccountId: form.businessAccountId.trim() || undefined,
      phoneNumber: form.phoneNumber.trim() || undefined,
      appId: form.appId.trim() || undefined,
      webhookUrl: form.webhookUrl.trim() || undefined,
      accessToken: form.accessToken.trim() || undefined,
      verifyToken: form.verifyToken.trim() || undefined,
      appSecret: form.appSecret.trim() || undefined,
    });
  };

  const handleTestConnection = () => {
    testMutation.mutate();
  };

  const handleSetMode = (mode: "cloud_api" | "qr") => {
    // Se já está no modo selecionado, apenas rola para a configuração
    if (activeMode === mode) {
      const targetId = mode === "cloud_api" ? "cloud-api-config" : "qr-config";
      setTimeout(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return;
    }
    setModeMutation.mutate({ mode });
  };

  return (
    <Layout>
      <div className="space-y-8 p-4">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
              <Plug className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Setup WhatsApp
              </h1>
              <p className="text-muted-foreground">
                Escolha e configure sua integração oficial do WhatsApp
              </p>
            </div>
            <div className="ml-auto">
              <Badge className={statusInfo.color}>
                <StatusIcon className="mr-1 h-4 w-4" />
                {statusInfo.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Error Alerts */}
        {(activeMode === "qr" ? qrStatus?.lastError : cloudStatus?.lastError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro recente</AlertTitle>
            <AlertDescription>
              {activeMode === "qr" ? qrStatus?.lastError : cloudStatus?.lastError}
            </AlertDescription>
          </Alert>
        )}
        {activeMode === "qr" && !qrDepsOk && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Dependência ausente</AlertTitle>
            <AlertDescription className="text-sm">
              {qrHealth?.message ??
                "Chromium não encontrado. Instale chromium ou defina PUPPETEER_EXECUTABLE_PATH para o binário."}
            </AlertDescription>
          </Alert>
        )}

        {/* Integration Type Selector - New Premium Design */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Meta Oficial (Cloud API) */}
          <Card
            className={cn(
              "cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] relative overflow-hidden group",
              activeMode === "cloud_api"
                ? "ring-2 ring-blue-500 shadow-xl border-blue-200 bg-gradient-to-br from-blue-50 to-white"
                : "hover:border-blue-300"
            )}
            onClick={() => handleSetMode("cloud_api")}
          >
            {/* Background Gradient Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Selected Badge */}
            {activeMode === "cloud_api" && (
              <div className="absolute top-4 right-4 z-10">
                <div className="bg-blue-500 text-white rounded-full p-1.5 shadow-lg">
                  <Check className="h-5 w-5" />
                </div>
              </div>
            )}

            <CardHeader className="relative z-10">
              <div className="flex items-start gap-4">
                {/* Meta Logo SVG */}
                <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow">
                  <svg className="h-10 w-10 text-white" viewBox="0 0 36 36" fill="currentColor">
                    <path d="M20.3 12.5c0-1.2.3-2.3.8-3.3l-1.3-.7c-.7 1.2-1 2.6-1 4v8.1c0 2.9-2.4 5.3-5.3 5.3s-5.3-2.4-5.3-5.3c0-2.9 2.4-5.3 5.3-5.3h.8v-1.5h-.8c-3.7 0-6.8 3-6.8 6.8s3 6.8 6.8 6.8 6.8-3 6.8-6.8v-8.1zm7.5-6.8C24.1 5.7 21 8.8 21 12.5s3 6.8 6.8 6.8 6.8-3 6.8-6.8-3.1-6.8-6.8-6.8zm0 12.1c-2.9 0-5.3-2.4-5.3-5.3s2.4-5.3 5.3-5.3 5.3 2.4 5.3 5.3-2.4 5.3-5.3 5.3z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl font-bold mb-2 flex items-center gap-2">
                    Meta Oficial
                    {activeMode === "cloud_api" && (
                      <Sparkles className="h-5 w-5 text-blue-500 animate-pulse" />
                    )}
                  </CardTitle>
                  <CardDescription className="text-base">
                    Integração oficial via WhatsApp Business API da Meta
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Alta estabilidade</span>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Sem QR Code</span>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Recomendado</span>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Produção</span>
                </div>
              </div>
              {activeMode === "cloud_api" && (
                <div className="pt-3 border-t">
                  <Button
                    variant="default"
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById("cloud-api-config")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Configurar Meta Oficial
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chrome QRCode */}
          <Card
            className={cn(
              "cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] relative overflow-hidden group",
              activeMode === "qr"
                ? "ring-2 ring-emerald-500 shadow-xl border-emerald-200 bg-gradient-to-br from-emerald-50 to-white"
                : "hover:border-emerald-300"
            )}
            onClick={() => handleSetMode("qr")}
          >
            {/* Background Gradient Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Selected Badge */}
            {activeMode === "qr" && (
              <div className="absolute top-4 right-4 z-10">
                <div className="bg-emerald-500 text-white rounded-full p-1.5 shadow-lg">
                  <Check className="h-5 w-5" />
                </div>
              </div>
            )}

            <CardHeader className="relative z-10">
              <div className="flex items-start gap-4">
                {/* Chrome Icon */}
                <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow">
                  <div className="relative">
                    <Chrome className="h-10 w-10 text-white" />
                    <QrCode className="h-5 w-5 text-white absolute -bottom-1 -right-1 bg-emerald-600 rounded p-0.5" />
                  </div>
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl font-bold mb-2 flex items-center gap-2">
                    Chrome QRCode
                    {activeMode === "qr" && (
                      <Sparkles className="h-5 w-5 text-emerald-500 animate-pulse" />
                    )}
                  </CardTitle>
                  <CardDescription className="text-base">
                    Conexão via WhatsApp Web (necessita escanear QR periodicamente)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Setup rápido</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Sem Meta</span>
                </div>
                <div className="flex items-center gap-2 text-orange-500">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Reconexão</span>
                </div>
                <div className="flex items-center gap-2 text-blue-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Testes/Dev</span>
                </div>
              </div>
              {activeMode === "qr" && (
                <div className="pt-3 border-t">
                  <Button
                    variant="default"
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById("qr-config")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Configurar QR Code
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Meta Oficial Configuration Panel */}
        {activeMode === "cloud_api" && (
          <div id="cloud-api-config" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-blue-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <KeyRound className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Credenciais Meta Business</CardTitle>
                    <CardDescription>
                      Configure as credenciais obtidas no Meta Business Manager
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number ID (phone_number_id)
                  </Label>
                  <Input
                    placeholder="Ex: 123456789012345"
                    value={form.phoneNumberId}
                    onChange={(e) => handleChange("phoneNumberId", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Business Account ID</Label>
                  <Input
                    placeholder="Ex: 987654321"
                    value={form.businessAccountId}
                    onChange={(e) => handleChange("businessAccountId", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número do WhatsApp (visualização)</Label>
                  <Input
                    placeholder="Ex: +55 11 99999-9999"
                    value={form.phoneNumber}
                    onChange={(e) => handleChange("phoneNumber", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>App ID</Label>
                  <Input
                    placeholder="ID do aplicativo do Meta"
                    value={form.appId}
                    onChange={(e) => handleChange("appId", e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    URL do Webhook
                  </Label>
                  <Input
                    placeholder="https://seu-dominio.com/api/webhooks/whatsapp"
                    value={form.webhookUrl}
                    onChange={(e) => handleChange("webhookUrl", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4" />
                    Access Token (permanente)
                  </Label>
                  <Input
                    type="password"
                    placeholder={config?.hasAccessToken ? "Token já configurado (não exibido)" : "Cole o token"}
                    value={form.accessToken}
                    onChange={(e) => handleChange("accessToken", e.target.value)}
                  />
                  {config?.hasAccessToken && (
                    <p className="text-xs text-muted-foreground">
                      Origem: {config.source.accessToken === "env" ? "variável de ambiente" : "salvo de forma segura"}{" "}
                      {config.accessTokenHint ? `(${config.accessTokenHint})` : ""}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Verify Token (webhook)
                  </Label>
                  <Input
                    type="password"
                    placeholder={config?.hasVerifyToken ? "Token já configurado (não exibido)" : "Defina um verify token"}
                    value={form.verifyToken}
                    onChange={(e) => handleChange("verifyToken", e.target.value)}
                  />
                  {config?.hasVerifyToken && (
                    <p className="text-xs text-muted-foreground">
                      Guardado de forma segura {config.verifyTokenHint ? `(${config.verifyTokenHint})` : ""}
                    </p>
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="flex items-center gap-2">
                    <LockKeyhole className="h-4 w-4" />
                    App Secret (validação de assinatura)
                  </Label>
                  <Input
                    type="password"
                    placeholder={config?.hasAppSecret ? "App secret configurado" : "Opcional, recomendado"}
                    value={form.appSecret}
                    onChange={(e) => handleChange("appSecret", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSave} disabled={saveMutation.isPending || isLoading} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Salvar configurações
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleTestConnection} disabled={testMutation.isPending}>
                {testMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Testar conexão
                  </>
                )}
              </Button>
            </div>

            {/* Status Info */}
            <Card>
              <CardHeader>
                <CardTitle>Status da Integração Meta</CardTitle>
                <CardDescription>Saúde, última sincronização e eventos recentes</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Último teste</p>
                  <p className="text-base font-semibold">{formatDate(cloudStatus?.lastTestAt || config?.lastTestAt)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Último webhook</p>
                  <p className="text-base font-semibold">{formatDate(cloudStatus?.lastWebhookAt || config?.lastWebhookAt)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Origem das credenciais</p>
                  <p className="text-base font-semibold">
                    Token: {config?.source.accessToken === "env" ? "ambiente" : config?.source.accessToken === "db" ? "armazenado" : "indefinido"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Verify token: {config?.source.verifyToken === "env" ? "ambiente" : config?.source.verifyToken === "db" ? "armazenado" : "indefinido"}
                  </p>
                </div>
                {config?.webhookUrl && (
                  <div className="md:col-span-3 rounded-lg border p-4 bg-muted/40">
                    <p className="text-sm text-muted-foreground">URL configurada no Meta</p>
                    <p className="font-mono text-sm break-all">{config.webhookUrl}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* QR Code Configuration Panel */}
        {activeMode === "qr" && (
          <div id="qr-config" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-emerald-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500 rounded-lg">
                    <QrCode className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>WhatsApp Web QR Code</CardTitle>
                    <CardDescription>Gerencie sua sessão via QR Code do WhatsApp Web</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={statusInfo.color}>
                    <StatusIcon className="mr-1 h-4 w-4" />
                    {statusInfo.label}
                  </Badge>
                  {qrStatus?.connectedPhone && (
                    <span className="text-sm text-muted-foreground">
                      Número conectado: {qrStatus.connectedPhone}
                    </span>
                  )}
                </div>

                {qrStatus?.lastError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription className="text-xs">{qrStatus.lastError}</AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => initQrMutation.mutate()}
                    disabled={initQrMutation.isPending || !qrDepsOk}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                  >
                    {initQrMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Inicializando...
                      </>
                    ) : (
                      <>
                        <Power className="mr-2 h-4 w-4" />
                        Gerar/Recarregar QR
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => disconnectQrMutation.mutate()}
                    disabled={disconnectQrMutation.isPending}
                  >
                    {disconnectQrMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Desconectando...
                      </>
                    ) : (
                      <>
                        <PowerOff className="mr-2 h-4 w-4" />
                        Desconectar sessão
                      </>
                    )}
                  </Button>
                </div>

                {qrStatus?.status === "qr_ready" && qrStatus?.qrCode && (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <div className="p-4 bg-white rounded-2xl shadow-2xl border-4 border-emerald-500">
                      <img
                        src={qrStatus.qrCode}
                        alt="QR Code WhatsApp"
                        className="h-64 w-64 rounded-lg"
                      />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-lg font-semibold text-emerald-600">
                        Escaneie com seu WhatsApp
                      </p>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Abra o WhatsApp no seu celular → Menu (⋮) → Aparelhos conectados → Conectar um aparelho
                      </p>
                    </div>
                  </div>
                )}

                {qrStatus?.status === "connected" && (
                  <Alert className="border-emerald-200 bg-emerald-50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <AlertTitle className="text-emerald-900">Sessão conectada com sucesso!</AlertTitle>
                    <AlertDescription className="text-emerald-700">
                      WhatsApp Web está conectado e funcionando. Para reautenticar, gere um novo QR ou desconecte a sessão.
                    </AlertDescription>
                  </Alert>
                )}

                {qrStatus?.status === "authenticating" && (
                  <Alert className="border-blue-200 bg-blue-50">
                    <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                    <AlertTitle className="text-blue-900">Sincronizando Mensagens</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      O WhatsApp está processando seu histórico (isso pode levar alguns minutos). Mantenha seu celular conectado à internet e não o desconecte.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Security Note */}
        <Alert className="border-amber-200 bg-amber-50">
          <ShieldCheck className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">Segurança e Privacidade</AlertTitle>
          <AlertDescription className="text-amber-700">
            A Qualital, atenta à segurança, realiza a máscara dos tokens, os quais não são retornados pela API após o envio. Todas as credenciais são criptografadas antes de serem armazenadas.
          </AlertDescription>
        </Alert>
      </div>
    </Layout>
  );
}




