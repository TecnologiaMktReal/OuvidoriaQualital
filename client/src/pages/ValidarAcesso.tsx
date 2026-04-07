import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  CheckCircle,
  ShieldCheck,
  Triangle,
} from "lucide-react";

// Mesmos recursos da tela de login
import logoQualital from "@/assets/logo-qualital.png";

export default function ValidarAcesso() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [somosCoopError, setSomosCoopError] = useState(false);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const name = params.get("name") || "Usuário";
  const profile = params.get("profile") || "Perfil";
  const expectedEmail = params.get("email")?.toLowerCase();

  const verifyEmailMutation = trpc.auth.verifyEmail.useMutation();

  const handleLogout = useCallback(async () => {
    console.log("[Auth] Limpando sessão para validação...");
    await supabase.auth.signOut();
  }, []);

  useEffect(() => {
    let mounted = true;
    const hasHashToken = window.location.hash.includes("access_token=") || window.location.hash.includes("id_token=");

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      console.log(`[Auth] Evento: ${event}`, !!session);
      
      if (session) {
        if (expectedEmail && session.user?.email?.toLowerCase() !== expectedEmail) {
          console.warn("[Auth] Sessão de outro usuário detectada. Efetuando logout.");
          await handleLogout();
          return;
        }
        setSessionReady(true);
        setLoading(false);
      }
    });

    const validate = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          if (expectedEmail && session.user?.email?.toLowerCase() !== expectedEmail) {
            await handleLogout();
          } else {
            if (mounted) {
              setSessionReady(true);
              setLoading(false);
            }
            return;
          }
        }

        const tokenHash = params.get("token_hash");
        const codeParam = params.get("code");
        const errorMsg = params.get("error_description") || params.get("error");

        if (errorMsg) {
          throw new Error(decodeURIComponent(errorMsg).replace(/\+/g, " "));
        }

        if (tokenHash) {
          console.log("[Auth] Validando token_hash...");
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: (params.get("type") as any) || 'invite',
          });
          if (error) throw error;
          if (mounted && data.session) setSessionReady(true);
        } else if (codeParam) {
          console.log("[Auth] Trocando code por sessão...");
          const { data, error } = await supabase.auth.exchangeCodeForSession(codeParam);
          if (error) throw error;
          if (mounted && data.session) setSessionReady(true);
        } else if (hasHashToken) {
          console.log("[Auth] Token detectado no hash, aguardando SDK...");
          setTimeout(() => {
            if (mounted && !sessionReady) setLoading(false);
          }, 6000);
        } else {
          // Fallback: se não carregou em 2s, libera a tela para erro ou tentativa manual
          setTimeout(() => {
            if (mounted && !sessionReady) setLoading(false);
          }, 2000);
        }
      } catch (err: any) {
        console.error("[Auth] Falha na validação:", err);
        if (mounted) {
          toast({
            title: "Link inválido ou expirado",
            description: err?.message || "Solicite um novo convite.",
            variant: "destructive",
          });
          setLoading(false);
        }
      }
    };

    validate();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [params, toast, sessionReady, expectedEmail, handleLogout]);

  const handleSave = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!password || password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "Use ao menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }
    if (password !== passwordConfirm) {
      toast({
        title: "Senhas diferentes",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      console.log("[Auth] Atualizando senha do usuário...");
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        console.error("[Auth] Erro ao atualizar senha:", error);
        throw error;
      }
      
      console.log("[Auth] Sincronizando e-mail no backend...");
      await verifyEmailMutation.mutateAsync();
      
      setIsSuccess(true);
      toast({
        title: "Sucesso!",
        description: "Senha definida com sucesso. Redirecionando...",
      });

      // Redirecionamento forçado para garantir boot limpo do sistema
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (err: any) {
      console.error("[Auth] Falha fatal no salvamento:", err);
      toast({ title: "Erro ao ativar conta", description: err?.message ?? "Tente novamente ou fale com o suporte.", variant: "destructive" });
    } finally {
      if (!isSuccess) setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden bg-slate-50 font-sans selection:bg-primary selection:text-white">
      {/* Fundo dinâmico (Clean) */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-slate-100 via-white to-slate-50" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <motion.div 
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute top-20 right-[15%] w-96 h-96 bg-primary/5 rounded-full blur-3xl" 
        />
        <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 15, repeat: Infinity, delay: 2 }}
            className="absolute bottom-20 left-[10%] w-[30rem] h-[30rem] bg-primary/5 rounded-full blur-3xl" 
        />
      </div>

      <div className="z-10 w-full max-w-lg p-6 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full bg-white border border-slate-200 rounded-[2rem] p-10 shadow-2xl relative overflow-hidden"
        >
          <div className="text-center mb-8 relative z-10">
            <img
              src="/logo-qualital.png"
              alt="Qualital"
              className="h-20 mx-auto mb-4 object-contain"
            />
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {configRef.current.label}
            </h2>
            <div className="relative z-10 border-t border-slate-100 pt-6 mt-4">
              <p className="text-slate-500 text-center text-sm mb-6">
                Siga as instruções abaixo para {type === "recovery" ? "redefinir sua senha" : "ativar seu acesso oficial"}.
              </p>
            </div>
          </div>

          <div className="relative z-10">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4 text-primary font-sans">
                <Loader2 className="w-12 h-12 animate-spin" />
                <span className="text-sm font-medium animate-pulse uppercase tracking-widest text-xs">Sincronizando...</span>
              </div>
            ) : !sessionReady ? (
              <div className="text-center py-6 space-y-4">
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm font-sans leading-relaxed">
                  Não foi possível validar este link. Ele pode ter expirado ou já ter sido utilizado.
                </div>
                <button
                   onClick={() => window.location.href = "/auth"}
                   className="text-primary hover:text-primary/80 transition-colors text-xs font-bold uppercase tracking-[0.2em] pt-2"
                >
                  Voltar para o Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-6 relative z-10">
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-slate-500 ml-1 tracking-widest">Sua Nova Senha</label>
                  <div className="relative group/input">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-sans"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-slate-500 ml-1 tracking-widest">Confirme a Senha</label>
                  <div className="relative group/input">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type="password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-sans"
                      placeholder="Repita a senha"
                      required
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.985 }}
                  type="submit"
                  disabled={submitting}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-white text-lg relative overflow-hidden group transition-all duration-300 ${
                    isSuccess ? "bg-primary" : "bg-gradient-to-r from-primary to-primary/90"
                  }`}
                >
                  <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:animate-[shimmer_1.5s_infinite]" />
                  <div className="relative flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      {submitting ? (
                        <motion.div key="loading" className="flex items-center space-x-2">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span>Ativando...</span>
                        </motion.div>
                      ) : isSuccess ? (
                        <motion.div key="success" className="flex items-center space-x-2">
                          <CheckCircle className="w-6 h-6" />
                          <span>Conta Pronta!</span>
                        </motion.div>
                      ) : (
                        <motion.div key="default" className="flex items-center space-x-2">
                          <span>Salvar e Acessar</span>
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>
              </form>
            )}

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <div className="flex items-center justify-center space-x-2 text-slate-400 text-xs uppercase tracking-widest font-bold">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Segurança Qualital</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-6 text-center w-full z-10 pointer-events-none">
        <p className="text-slate-400 text-[10px] uppercase tracking-[0.4em] font-medium">© 2026 QUALITAL - EXCELÊNCIA EM GESTÃO</p>
      </div>
    </div>
  );
}



