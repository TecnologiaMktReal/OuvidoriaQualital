import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { z } from "zod";
import logoQualital from "@/assets/logo-qualital.png";
import callCenterBg from "@/assets/call-center-bg.jpg";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setLocation("/");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setLocation("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      toast({
        title: "Erro de validação",
        description: validation.error.issues[0]?.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast({
          title: "Conta criada!",
          description: "Verifique seu e-mail para confirmar o cadastro.",
        });
      }
    } catch (error: any) {
      let message = error.message;
      if (error.message.includes("Invalid login credentials")) {
        message = "E-mail ou senha incorretos";
      } else if (error.message.includes("User already registered")) {
        message = "Este e-mail já está cadastrado";
      }
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-white">
      <div 
        className="absolute inset-0 bg-slate-50/50"
      />
      <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px]" />
      <GeometricBorders />
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <div className="mb-6 animate-fade-in">
          <img 
            src="/logo-qualital.png" 
            alt="Qualital - Excelência em Gestão" 
            className="h-20 md:h-24 object-contain"
          />
        </div>
        <div className="text-center mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-wide">
            Sistema de Ouvidoria Qualital
          </h1>
          <div className="w-20 h-1 bg-primary/80 mx-auto mt-3 rounded-full" />
        </div>
        <div 
          className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-8 animate-fade-in"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-foreground">
              {isLogin ? "Acesse sua conta" : "Criar nova conta"}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {isLogin ? "Entre com suas credenciais" : "Preencha os dados abaixo"}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail Corporativo</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@Qualital.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 border-primary/20 focus:border-primary/80"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                {isLogin && (
                  <button type="button" className="text-sm text-primary/80 hover:underline">
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 border-primary/20 focus:border-primary/80"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-full py-6 text-base font-medium shadow-lg hover:shadow-xl transition-all"
            >
              {loading ? "Carregando..." : isLogin ? "Entrar" : "Criar conta"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </form>
          <p className="text-center text-muted-foreground mt-6">
            {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-Qualital-teal font-medium hover:underline"
            >
              {isLogin ? "Criar conta" : "Entrar"}
            </button>
          </p>
        </div>
        <p className="text-center text-sm text-slate-400 mt-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          © 2026 Qualital - Ouvidoria
        </p>
      </div>
    </div>
  );
};

const GeometricBorders = () => {
  return (
    <>
      <div className="absolute top-0 bottom-0 left-0 w-48 md:w-64 lg:w-80 overflow-hidden pointer-events-none">
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMinYMin slice" viewBox="0 0 300 800">
          <defs>
            <linearGradient id="greenGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8dc63f" />
              <stop offset="100%" stopColor="#6ea32f" />
            </linearGradient>
            <linearGradient id="blueGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00488d" />
              <stop offset="100%" stopColor="#003366" />
            </linearGradient>
            <linearGradient id="tealGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00aeef" />
              <stop offset="100%" stopColor="#008ecc" />
            </linearGradient>
            <linearGradient id="lightBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8BC4E0" />
              <stop offset="100%" stopColor="#5BA4C9" />
            </linearGradient>
            <linearGradient id="shineL" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0">
                <animate attributeName="offset" values="-0.2;1.2" dur="3s" repeatCount="indefinite" />
              </stop>
              <stop offset="10%" stopColor="white" stopOpacity="0.4">
                <animate attributeName="offset" values="-0.1;1.3" dur="3s" repeatCount="indefinite" />
              </stop>
              <stop offset="20%" stopColor="white" stopOpacity="0">
                <animate attributeName="offset" values="0;1.4" dur="3s" repeatCount="indefinite" />
              </stop>
            </linearGradient>
          </defs>
          <polygon points="0,0 180,0 0,120" fill="url(#blueGrad1)" />
          <polygon points="0,0 120,0 60,80" fill="url(#greenGrad1)" />
          <polygon points="120,0 180,0 180,50 120,80" fill="url(#tealGrad1)" />
          <polygon points="0,80 100,0 120,80 0,160" fill="#8dc63f" />
          <polygon points="0,120 180,0 200,60 0,200" fill="url(#blueGrad1)" />
          <polygon points="0,160 120,80 100,160 0,220" fill="url(#tealGrad1)" />
          <polygon points="0,200 150,100 180,150 0,300" fill="url(#greenGrad1)" />
          <polygon points="0,220 100,160 80,220 0,280" fill="url(#lightBlueGrad)" />
          <polygon points="0,280 160,150 180,200 0,380" fill="url(#blueGrad1)" />
          <polygon points="0,300 100,220 120,280 0,400" fill="#8dc63f" />
          <polygon points="0,350 80,280 100,350 0,430" fill="url(#tealGrad1)" />
          <polygon points="0,400 140,280 160,340 0,500" fill="url(#blueGrad1)" />
          <polygon points="0,430 100,350 80,420 0,480" fill="url(#lightBlueGrad)" />
          <polygon points="0,480 120,380 140,440 0,560" fill="url(#greenGrad1)" />
          <polygon points="0,500 160,380 180,450 0,620" fill="url(#blueGrad1)" />
          <polygon points="0,560 100,480 120,560 0,650" fill="url(#tealGrad1)" />
          <polygon points="0,620 140,500 160,570 0,720" fill="#8dc63f" />
          <polygon points="0,650 80,580 100,660 0,740" fill="url(#lightBlueGrad)" />
          <polygon points="0,720 160,580 180,660 0,800" fill="url(#blueGrad1)" />
          <polygon points="0,740 100,660 80,740 0,800" fill="url(#greenGrad1)" />
          <polygon points="0,780 120,700 140,780 0,800" fill="url(#tealGrad1)" />
          <rect x="0" y="0" width="300" height="800" fill="url(#shineL)" />
        </svg>
      </div>
      <div className="absolute left-52 md:left-72 top-1/4 pointer-events-none">
        <svg width="30" height="30" viewBox="0 0 30 30">
          <polygon points="15,0 30,30 0,30" fill="#00488d" opacity="0.8" />
        </svg>
      </div>
      <div className="absolute left-40 md:left-56 top-2/3 pointer-events-none">
        <svg width="24" height="24" viewBox="0 0 24 24">
          <polygon points="12,24 0,0 24,0" fill="#8dc63f" opacity="0.7" />
        </svg>
      </div>
      <div className="absolute top-0 bottom-0 right-0 w-48 md:w-64 lg:w-80 overflow-hidden pointer-events-none">
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMaxYMin slice" viewBox="0 0 300 800">
          <defs>
            <linearGradient id="greenGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8dc63f" />
              <stop offset="100%" stopColor="#6ea32f" />
            </linearGradient>
            <linearGradient id="blueGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00488d" />
              <stop offset="100%" stopColor="#003366" />
            </linearGradient>
            <linearGradient id="tealGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00aeef" />
              <stop offset="100%" stopColor="#008ecc" />
            </linearGradient>
            <linearGradient id="lightBlueGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#86d8f5" />
              <stop offset="100%" stopColor="#00aeef" />
            </linearGradient>
            <linearGradient id="shineR" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="white" stopOpacity="0">
                <animate attributeName="offset" values="-0.2;1.2" dur="3.5s" repeatCount="indefinite" />
              </stop>
              <stop offset="10%" stopColor="white" stopOpacity="0.4">
                <animate attributeName="offset" values="-0.1;1.3" dur="3.5s" repeatCount="indefinite" />
              </stop>
              <stop offset="20%" stopColor="white" stopOpacity="0">
                <animate attributeName="offset" values="0;1.4" dur="3.5s" repeatCount="indefinite" />
              </stop>
            </linearGradient>
          </defs>
          <polygon points="300,0 120,0 300,120" fill="url(#tealGrad2)" />
          <polygon points="300,0 180,0 240,80" fill="url(#greenGrad2)" />
          <polygon points="180,0 120,0 120,50 180,80" fill="url(#blueGrad2)" />
          <polygon points="300,80 200,0 180,80 300,160" fill="#5BA4C9" />
          <polygon points="300,120 120,0 100,60 300,200" fill="url(#blueGrad2)" />
          <polygon points="300,160 180,80 200,160 300,220" fill="url(#greenGrad2)" />
          <polygon points="300,200 150,100 120,150 300,300" fill="url(#tealGrad2)" />
          <polygon points="300,220 200,160 220,220 300,280" fill="url(#blueGrad2)" />
          <polygon points="300,280 140,150 120,200 300,380" fill="url(#greenGrad2)" />
          <polygon points="300,300 200,220 180,280 300,400" fill="url(#blueGrad2)" />
          <polygon points="300,350 220,280 200,350 300,430" fill="url(#tealGrad2)" />
          <polygon points="300,400 160,280 140,340 300,500" fill="#8dc63f" />
          <polygon points="300,430 200,350 220,420 300,480" fill="url(#blueGrad2)" />
          <polygon points="300,480 180,380 160,440 300,560" fill="url(#lightBlueGrad2)" />
          <polygon points="300,500 140,380 120,450 300,620" fill="url(#greenGrad2)" />
          <polygon points="300,560 200,480 180,560 300,650" fill="url(#blueGrad2)" />
          <polygon points="300,620 160,500 140,570 300,720" fill="url(#tealGrad2)" />
          <polygon points="300,650 220,580 200,660 300,740" fill="url(#blueGrad2)" />
          <polygon points="300,720 140,580 120,660 300,800" fill="url(#greenGrad2)" />
          <polygon points="300,740 200,660 220,740 300,800" fill="url(#tealGrad2)" />
          <polygon points="300,780 180,700 160,780 300,800" fill="url(#blueGrad2)" />
          <rect x="0" y="0" width="300" height="800" fill="url(#shineR)" />
        </svg>
      </div>
      <div className="absolute right-52 md:right-72 top-1/3 pointer-events-none">
        <svg width="25" height="25" viewBox="0 0 25 25">
          <polygon points="12.5,25 0,0 25,0" fill="#5BA4C9" opacity="0.7" />
        </svg>
      </div>
      <div className="absolute right-44 md:right-60 bottom-1/4 pointer-events-none">
        <svg width="20" height="20" viewBox="0 0 20 20">
          <polygon points="10,0 20,20 0,20" fill="#00488d" opacity="0.6" />
        </svg>
      </div>
    </>
  );
};

export default Auth;



