/**
 * Página temporária para corrigir role de admin
 * DELETAR APÓS USO POR SEGURANÇA
 * 
 * Acesse: http://localhost:3000/fix-admin (local) ou https://Qualitalsicia.zeabur.com/fix-admin (produção)
 */
import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { CheckCircle2, XCircle, AlertCircle, Shield } from "lucide-react";

export default function FixAdmin() {
  const [email, setEmail] = useState("");
  const [securityKey, setSecurityKey] = useState("");
  const [checkResult, setCheckResult] = useState<{
    success?: boolean;
    error?: string;
    user?: {
      id: number;
      email: string | null;
      name: string | null;
      userRole: string;
      profileRole?: string;
      profileTypeName?: string;
      profileTypeId?: number;
    };
  } | null>(null);
  const [fixResult, setFixResult] = useState<{
    success: boolean;
    message: string;
    user: any;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState<"admin" | "SuperAdmin">("admin");

  const checkUserMutation = trpc.fixAdmin.checkUser.useMutation({
    onSuccess: (data) => {
      setCheckResult(data);
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
      setCheckResult(null);
    },
  });

  const fixToAdminMutation = trpc.fixAdmin.fixToAdmin.useMutation({
    onSuccess: (data) => {
      setFixResult(data);
      setError(null);
      // Recarregar após 2 segundos
      setTimeout(() => {
        (window as any).location.href = "/";
      }, 2000);
    },
    onError: (err) => {
      setError(err.message);
      setFixResult(null);
    },
  });

  const handleCheck = () => {
    if (!email) {
      setError("Informe seu email");
      return;
    }
    setError(null);
    setCheckResult(null);
    checkUserMutation.mutate({ email });
  };

  const handleFix = () => {
    if (!email || !securityKey) {
      setError("Informe o email e a chave de segurança");
      return;
    }
    setError(null);
    setFixResult(null);
    fixToAdminMutation.mutate({ email, securityKey, targetRole });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-500" />
            <CardTitle>🔧 Correção de Role Admin / SuperAdmin</CardTitle>
          </div>
          <CardDescription>
            Esta é uma ferramenta temporária para corrigir permissões de usuário.
            <br />
            <span className="text-red-500 font-semibold">IMPORTANTE: Delete esta página após o uso por segurança!</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seção 1: Verificar Status */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">1. Verificar Status Atual</h3>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="seu.email@Qualital.coop.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleCheck} disabled={checkUserMutation.isPending}>
                {checkUserMutation.isPending ? "Verificando..." : "Verificar"}
              </Button>
            </div>

            {checkResult && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1 text-sm">
                    <p><strong>Email:</strong> {checkResult.user?.email}</p>
                    <p><strong>Nome:</strong> {checkResult.user?.name}</p>
                    <p><strong>Role (users):</strong> {checkResult.user?.userRole}</p>
                    <p><strong>Role (profile):</strong> {checkResult.user?.profileRole || "Não definido"}</p>
                    <p><strong>Tipo de Perfil:</strong> {checkResult.user?.profileTypeName || "Não definido"}</p>
                    
                    {(checkResult.user?.profileRole === "admin" || checkResult.user?.profileRole === "SuperAdmin") && 
                     (checkResult.user?.userRole === "admin" || checkResult.user?.userRole === "SuperAdmin") ? (
                      <div className="flex items-center gap-2 text-green-600 mt-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-semibold">Usuário já é admin/SuperAdmin!</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600 mt-2">
                        <XCircle className="w-4 h-4" />
                        <span className="font-semibold">Usuário NÃO é admin. Precisa corrigir!</span>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Seção 2: Corrigir Role */}
          {checkResult && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold text-lg">2. Corrigir Permissões</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Papel de Destino (Role):</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="targetRole" 
                        value="admin" 
                        checked={targetRole === "admin"} 
                        onChange={() => setTargetRole("admin")}
                      />
                      <span>Admin (Padrão)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="targetRole" 
                        value="SuperAdmin" 
                        checked={targetRole === "SuperAdmin"} 
                        onChange={() => setTargetRole("SuperAdmin")}
                      />
                      <span className="text-red-600 font-bold">SuperAdmin (Acesso Total)</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Chave de Segurança (FIX_ADMIN_SECURITY_KEY)"
                    value={securityKey}
                    onChange={(e) => setSecurityKey(e.target.value)}
                  />
                  <Alert>
                    <AlertDescription className="text-xs">
                      <strong>Chave de Segurança:</strong> Defina a variável de ambiente{" "}
                      <code className="bg-gray-100 px-1 py-0.5 rounded">FIX_ADMIN_SECURITY_KEY</code> no Zeabur.
                      <br />
                      Se não estiver definida, o valor padrão é: <code className="bg-gray-100 px-1 py-0.5 rounded">change-me-123</code>
                    </AlertDescription>
                  </Alert>
                </div>

                <Button 
                  onClick={handleFix} 
                  disabled={fixToAdminMutation.isPending}
                  className="w-full bg-red-600 hover:bg-red-700 h-12"
                >
                  {fixToAdminMutation.isPending ? "Corrigindo..." : `🔧 Corrigir para ${targetRole}`}
                </Button>
              </div>
            </div>
          )}

          {/* Mensagens de Sucesso/Erro */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {fixResult && fixResult.success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>{fixResult.message}</strong>
                <br />
                Redirecionando para o dashboard em 2 segundos...
              </AlertDescription>
            </Alert>
          )}

          {/* Instruções Alternativas */}
          <div className="border-t pt-4">
            <details className="text-sm text-gray-600">
              <summary className="cursor-pointer font-semibold hover:text-gray-900">
                📋 Método Alternativo: Executar SQL Manualmente
              </summary>
              <div className="mt-2 space-y-2 bg-gray-50 p-3 rounded">
                <p>1. Acesse o painel do Zeabur</p>
                <p>2. Navegue até o seu banco MySQL</p>
                <p>3. Abra o console SQL</p>
                <p>4. Execute o script <code className="bg-gray-200 px-1 rounded">fix-admin-role.sql</code></p>
                <p>5. Faça logout e login novamente</p>
              </div>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




