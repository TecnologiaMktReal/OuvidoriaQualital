// client/src/pages/Login.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  CheckCircle,
  ShieldCheck,
  Triangle,
} from "lucide-react";

// Logo será carregada via path absoluto na pasta public

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

type AuthMode = "login" | "register" | "forgot";

const Login = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [somosCoopError, setSomosCoopError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) setLocation("/");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setLocation("/");
    });

    return () => subscription.unsubscribe();
  }, [setLocation]);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setIsSuccess(false);
  };

  const switchMode = (newMode: AuthMode) => {
    resetForm();
    setMode(newMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setIsSuccess(false);

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        
        if (error) {
          console.error("Erro Supabase Auth (Reset Password):", error);
          throw error;
        }

        toast({
          title: "E-mail enviado",
          description: "Se o e-mail existir, enviamos um link para redefinir sua senha. Verifique também sua caixa de spam.",
        });
        setIsSuccess(true);
        return;
      }

      const validatedData = loginSchema.parse({ email, password });

      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: validatedData.email,
          password: validatedData.password,
        });
        if (error) {
          toast({
            title: "Erro ao entrar",
            description: error.message.includes("Invalid login credentials")
              ? "Email ou senha incorretos"
              : error.message,
            variant: "destructive",
          });
        } else {
          toast({ title: "Sucesso!", description: "Login realizado com sucesso" });
          setIsSuccess(true);
        }
      } else if (mode === "register") {
        if (password !== confirmPassword) {
          toast({
            title: "Erro",
            description: "As senhas não coincidem",
            variant: "destructive",
          });
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: validatedData.email,
          password: validatedData.password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) {
          toast({
            title: "Erro ao cadastrar",
            description: error.message.includes("User already registered")
              ? "Email já cadastrado. Faça login."
              : error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Cadastro realizado",
            description: "Verifique seu email para confirmar o acesso.",
          });
          setIsSuccess(true);
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.issues[0]?.message,
          variant: "destructive",
        });
      } else {
        const errorMsg = (error as any)?.message || "Ocorreu um erro inesperado. Tente novamente.";
        toast({
          title: "Erro",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden bg-slate-50 font-sans selection:bg-qualital-green selection:text-white">
      {/* Fundo dinâmico (Clean) */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-slate-100 via-white to-slate-50" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        
        {/* Subtle decorative shapes */}
        <motion.div 
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute top-20 right-[15%] w-96 h-96 bg-qualital-blue/5 rounded-full blur-3xl" 
        />
        <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 15, repeat: Infinity, delay: 2 }}
            className="absolute bottom-20 left-[10%] w-[30rem] h-[30rem] bg-qualital-green/5 rounded-full blur-3xl" 
        />
      </div>

      {/* Conteúdo principal */}
      <div className="z-10 w-full max-w-6xl flex flex-col lg:flex-row items-center justify-between p-6 gap-12">
        {/* Texto hero */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="hidden lg:block flex-1 text-slate-900 space-y-6"
        >
          <div className="inline-flex items-center space-x-2 bg-qualital-blue/10 px-4 py-2 rounded-full border border-qualital-blue/10 backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-qualital-blue" />
            <span className="text-sm font-bold tracking-wide text-qualital-blue uppercase">Segurança Qualital</span>
          </div>

          <h1 className="text-7xl font-black tracking-tight leading-tight text-slate-900">
            Excelência <br />
            em <span className="text-transparent bg-clip-text bg-gradient-to-r from-qualital-blue to-qualital-cyan">Gestão</span>.
          </h1>

          <p className="text-xl text-slate-500 max-w-lg leading-relaxed border-l-4 border-qualital-green pl-4">
            Acesse a plataforma oficial de Ouvidoria e Atendimento Qualital para gerenciar manifestações com eficiência.
          </p>
        </motion.div>

        {/* Card de login */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="w-full max-w-[460px] relative group"
        >
          <div className="relative bg-white border border-slate-200 rounded-[1.9rem] p-10 shadow-2xl overflow-hidden min-h-[500px] flex flex-col justify-center">
            
            <div className="text-center mb-10 relative">
                <img
                  src="/logo-qualital.png"
                  alt="Qualital"
                  className="h-20 mx-auto mb-2 object-contain"
                  onError={() => setLogoError(true)}
                />
                <h2 className="text-slate-900 text-2xl font-bold mt-4 tracking-tight">Painel Administrativo</h2>
                <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-medium">Benvindo de volta</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-slate-500 ml-1 tracking-widest">E-mail Corporativo</label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-qualital-blue/20 focus:border-qualital-blue transition-all font-sans"
                    placeholder="seu@e-mail.com.br"
                    required
                  />
                </div>
              </div>

              {mode !== "forgot" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-xs uppercase font-bold text-qualital-cyan tracking-wider">Senha</label>
                  </div>
                  <div className="relative group/input">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-qualital-blue/20 focus:border-qualital-blue transition-all font-sans"
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
                  {mode === "login" && (
                    <div className="flex justify-end pr-1">
                      <button
                        type="button"
                        onClick={() => switchMode("forgot")}
                        className="text-[10px] uppercase font-bold text-qualital-blue/70 hover:text-qualital-blue tracking-wider transition-colors"
                      >
                        Esqueceu sua senha?
                      </button>
                    </div>
                  )}
                </div>
              )}

              {mode === "register" && (
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-slate-500 ml-1 tracking-wider">Confirmar Senha</label>
                  <div className="relative group/input">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-qualital-blue/20 focus:border-qualital-blue transition-all font-sans"
                      placeholder="Repita sua senha"
                      required
                    />
                  </div>
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.985 }}
                type="submit"
                disabled={loading}
                className={`w-full py-4 px-6 rounded-xl font-bold text-white text-lg relative overflow-hidden group transition-all duration-300 ${
                  isSuccess ? "bg-qualital-green" : "bg-gradient-to-r from-qualital-blue to-blue-900"
                }`}
              >
                <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:animate-[shimmer_1.5s_infinite]" />
                <div className="relative flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {loading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center space-x-2"
                      >
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>
                          {mode === "forgot" ? "Enviando..." : "Autenticando..."}
                        </span>
                      </motion.div>
                    ) : isSuccess ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center space-x-2"
                      >
                        <CheckCircle className="w-6 h-6" />
                        <span>Autorizado</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="default"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center space-x-2"
                      >
                        <span>
                          {mode === "login" && "Entrar no Sistema"}
                          {mode === "register" && "Criar Conta"}
                          {mode === "forgot" && "Enviar E-mail"}
                        </span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-400 space-y-2">
              {mode === "register" && (
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="text-blue-300 hover:text-white font-semibold transition-colors"
                >
                  Já tem conta? Entrar
                </button>
              )}
              {mode === "forgot" && (
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="text-blue-300 hover:text-white font-semibold transition-colors"
                >
                  Voltar para o login
                </button>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 text-center">
              <div className="flex items-center justify-center space-x-2 text-slate-500 text-xs uppercase tracking-widest font-semibold">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                <span>Ambiente Seguro</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-4 text-center w-full z-10 pointer-events-none">
        <p className="text-slate-600 text-[10px] uppercase tracking-[0.2em]">SISTEMA INTERNO OUVIDORIA - Qualital - 2026</p>
      </div>
    </div>
  );
};

export default Login;



