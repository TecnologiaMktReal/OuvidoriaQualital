// client/src/pages/ResetPassword.tsx
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Lock,
  Loader2,
  CheckCircle,
  ShieldCheck,
  Triangle,
  ArrowRight,
} from "lucide-react";

const Qualital_LOGO_URL =
  "https://aedirlkgmglxotajdnqt.supabase.co/storage/v1/object/sign/image/logo-qualital%20branco.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV83NjJmMDg0OS01ZTU4LTRmNGItOTMzMS03ZjQ2YmJhYjA4ZjAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZS9sb2dvLWNvb3BlZHUgYnJhbmNvLnBuZyIsImlhdCI6MTc2NTQ1ODc0NCwiZXhwIjozMzMwMTQ1ODc0NH0.EfmM2MksPEY2lBuzMWyTRtNQnB_w4HeUm0gK87XYgdk";

const ResetPassword = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    // Verificar se existe um hash de recuperação ou sessão ativa
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Em um fluxo de recovery, o Supabase já autentica o usuário via link
      // Se não houver sessão, talvez o link tenha expirado ou seja inválido
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter no mínimo 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "Por favor, verifique se as senhas são iguais.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Sua senha foi atualizada. Você será redirecionado.",
      });
      setIsSuccess(true);

      // Redirecionar após 2 segundos para dar tempo de ver o sucesso
      setTimeout(() => {
        setLocation("/");
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar senha",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden bg-[#020617] font-sans selection:bg-green-500 selection:text-white">
      {/* Fundo dinâmico (idêntico ao Login) */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-[#020617] to-[#020617]" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
        {[
          { id: 1, color: "#16a34a", size: 120, x: "5%", y: "10%", rot: 0, delay: 0 },
          { id: 2, color: "#1e40af", size: 180, x: "-5%", y: "30%", rot: 45, delay: 2 },
          { id: 3, color: "#0ea5e9", size: 100, x: "8%", y: "50%", rot: 15, delay: 4 },
        ].map((shape) => (
          <motion.div
            key={shape.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0.35, 0.7, 0.35],
              y: [0, -30, 0],
              rotate: [shape.rot, shape.rot + 10, shape.rot],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 8 + shape.id,
              repeat: Infinity,
              ease: "easeInOut",
              delay: shape.delay,
            }}
            className="absolute blur-sm"
            style={{ left: shape.x, top: shape.y }}
          >
            <svg width={shape.size} height={shape.size} viewBox="0 0 100 100" fill="none">
              <path d="M50 0L100 100H0L50 0Z" fill={shape.color} fillOpacity="0.6" />
            </svg>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-[460px] relative z-10 p-6"
      >
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-green-500 to-blue-500 rounded-[2rem] opacity-30 blur transition duration-1000" />
        <div className="relative bg-[#0b1121]/90 backdrop-blur-xl border border-white/10 rounded-[1.9rem] p-8 shadow-2xl overflow-hidden">
          <div className="text-center mb-8 relative flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              transition={{ repeat: Infinity, repeatType: "reverse", duration: 2 }}
              className="inline-block"
            >
              {!logoError ? (
                <img
                  src={Qualital_LOGO_URL}
                  alt="Qualital"
                  className="h-14 mx-auto mb-2 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="h-14 w-14 mb-2 relative mx-auto flex items-center justify-center">
                  <Triangle className="absolute text-blue-600 fill-current w-14 h-14 rotate-180 opacity-80" />
                  <Triangle className="absolute text-green-500 fill-current w-10 h-10 translate-y-1" />
                </div>
              )}
            </motion.div>
            <h2 className="text-white text-xl font-bold mt-4">Redefinir Senha</h2>
            <p className="text-slate-400 text-sm">Crie uma nova senha segura para sua conta.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-blue-400 ml-1 tracking-wider">Nova Senha</label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-[#141b2d] border border-slate-700/50 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-blue-400 ml-1 tracking-wider">Confirmar Nova Senha</label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-[#141b2d] border border-slate-700/50 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.985 }}
              type="submit"
              disabled={loading || isSuccess}
              className={`w-full py-4 px-6 rounded-xl font-bold text-white text-lg relative overflow-hidden group transition-all duration-300 ${
                isSuccess ? "bg-green-600" : "bg-gradient-to-r from-blue-600 to-blue-800"
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
                      <span>Salvando...</span>
                    </motion.div>
                  ) : isSuccess ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center space-x-2"
                    >
                      <CheckCircle className="w-6 h-6" />
                      <span>Senha Atualizada</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="default"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center space-x-2"
                    >
                      <span>Salvar Nova Senha</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <div className="flex items-center justify-center space-x-2 text-slate-500 text-xs uppercase tracking-widest font-semibold">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span>Conexão Segura</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;



