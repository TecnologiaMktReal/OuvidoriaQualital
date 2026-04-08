import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Upload, Send, CheckCircle2, AlertCircle, FileText, User, Shield, MessageSquare, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// --- Schema de Validação ---
const ouvidoriaSchema = z.object({
  mode: z.enum(["identificado", "anonimo"]),
  name: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  reasonId: z.coerce.number().min(1, "Selecione um assunto"),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres"),
  files: z.any().optional(), 
}).superRefine((data, ctx) => {
  if (data.mode === "identificado") {
    if (!data.name || data.name.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nome é obrigatório",
        path: ["name"],
      });
    }
    if (!data.cpf || data.cpf.length < 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CPF válido é obrigatório",
        path: ["cpf"],
      });
    }
    if (!data.email && !data.phone) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Informe ao menos E-mail ou Telefone para contato",
            path: ["email"], // aponta erro no email visualmente
        });
    }
  }
});

type OuvidoriaForm = z.infer<typeof ouvidoriaSchema>;

export default function Ouvidoria() {
  const [submitted, setSubmitted] = useState<{ protocol: string; id: number } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { data: reasons, isLoading: isLoadingReasons } = trpc.public.getReasons.useQuery();
  const createTicket = trpc.public.createTicket.useMutation();

  const form = useForm<OuvidoriaForm>({
    resolver: zodResolver(ouvidoriaSchema) as any,
    defaultValues: {
      mode: "identificado",
      name: "",
      email: "",
      phone: "",
      cpf: "",
      description: "",
      reasonId: 0, // 0 as empty placeholder
    },
  });

  const mode = form.watch("mode");
  const isAnonymous = mode === "anonimo";

  // Conversor de File para Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const onSubmit = async (data: OuvidoriaForm) => {
    try {
      setIsUploading(true);
      
      const attachments = [];
      if (files.length > 0) {
        for (const file of files) {
           const base64 = await fileToBase64(file);
           attachments.push(base64);
        }
      }

      const result = await createTicket.mutateAsync({
        isAnonymous: data.mode === "anonimo",
        name: data.name,
        email: data.email,
        phone: data.phone,
        cpf: data.cpf,
        reasonId: Number(data.reasonId),
        description: data.description,
        attachments: attachments,
      });

      setSubmitted({ protocol: result.protocol || "???", id: Number(result.id) });
      toast.success("Manifestação registrada com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar manifestação");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white border-slate-200 text-slate-900 shadow-2xl">
          <CardContent className="pt-8 flex flex-col items-center text-center space-y-6">
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg mb-4"
            >
              <CheckCircle2 className="w-10 h-10 text-white" />
            </motion.div>
            
            <h2 className="text-3xl font-bold text-slate-900">Recebemos sua mensagem!</h2>
            
            <div className="bg-slate-50 p-4 rounded-lg w-full border border-slate-200">
              <p className="text-slate-500 text-sm uppercase tracking-wider mb-1">Seu Protocolo</p>
              <p className="text-2xl font-mono font-bold text-blue-600 select-all">{submitted.protocol}</p>
            </div>

            <p className="text-slate-600 leading-relaxed">
              Sua manifestação foi encaminhada para nossa Ouvidoria.
              {isAnonymous 
                ? " Como você optou pelo anonimato, não entraremos em contato, mas analisaremos o caso com rigor."
                : " Analisaremos o caso e entraremos em contato em breve."}
            </p>

            <Button 
                onClick={() => { setSubmitted(null); form.reset(); setFiles([]); }} 
                className="w-full bg-primary text-white hover:bg-primary/90 font-bold"
            >
              Nova Manifestação
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative flex flex-col font-sans selection:bg-primary selection:text-white bg-white">
       {/* Background Overlay */}
       <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-white" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
       </div>
       
       {/* Content */}
       <div className="relative z-10 container mx-auto px-6 md:px-12 lg:px-24 py-8 flex-grow flex flex-col md:flex-row items-center justify-center gap-12">
          
          {/* Left Side - Hero */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-slate-900 max-w-lg space-y-6"
          >
            <img src="/logo-qualital.png" alt="Ouvidoria Qualital" className="h-20 mb-8" />
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-blue-600 tracking-wide uppercase">Ouvidoria Qualital</h2>
              <h1 className="text-5xl font-black tracking-tight leading-tight text-slate-900">
                Sua voz é <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/80">importante</span>.
              </h1>
            </div>
            
            <p className="text-lg text-slate-600 leading-relaxed">
              Este é um espaço seguro para você enviar denúncias, elogios, sugestões ou reclamações diretamente à Ouvidoria da Qualital.
            </p>

            <div className="flex gap-4 pt-4">
                <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span>Dados protegidos</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
                    <User className="w-4 h-4 text-blue-600" />
                    <span>Opção anônima</span>
                </div>
            </div>
            
            <div className="pt-8 border-t border-slate-200">
                <p className="text-sm text-slate-500 mb-2">Prefere enviar um e-mail?</p>
                <a href="mailto:ouvidoria@Qualital.com.br" className="text-blue-600 hover:text-blue-700 transition-colors font-medium flex items-center gap-2">
                    <Send className="w-4 h-4" /> ouvidoria@Qualital.com.br
                </a>
            </div>
          </motion.div>

          {/* Right Side - Form */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full max-w-xl"
          >
            <Card className="bg-white border-slate-200 shadow-2xl overflow-hidden">
                <div className="h-2 w-full bg-gradient-to-r from-primary via-primary/80 to-primary" />
                <CardHeader>
                    <CardTitle className="text-2xl text-slate-900">Nova Manifestação</CardTitle>
                    <CardDescription className="text-slate-500">Preencha os dados abaixo para abrir um chamado.</CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
                        
                        {/* Identificação Switch */}
                        <div className="p-1 bg-slate-100 rounded-lg flex gap-1">
                            <button
                                type="button"
                                onClick={() => form.setValue("mode", "identificado")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${!isAnonymous ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                <User className="w-4 h-4" />
                                Identificado
                            </button>
                            <button
                                type="button"
                                onClick={() => form.setValue("mode", "anonimo")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${isAnonymous ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                <Shield className="w-4 h-4" />
                                Anônimo
                            </button>
                        </div>

                        <AnimatePresence mode="wait">
                            {!isAnonymous && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-4 overflow-hidden"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Nome Completo <span className="text-red-500">*</span></Label>
                                            <Input id="name" placeholder="Seu nome" {...form.register("name")} className="bg-slate-50 border-slate-200" />
                                            {form.formState.errors.name && <p className="text-red-500 text-xs">{form.formState.errors.name.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="cpf">CPF <span className="text-red-500">*</span></Label>
                                            <Input id="cpf" placeholder="000.000.000-00" {...form.register("cpf")} className="bg-slate-50 border-slate-200" />
                                            {form.formState.errors.cpf && <p className="text-red-500 text-xs">{form.formState.errors.cpf.message}</p>}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">E-mail</Label>
                                            <Input id="email" type="email" placeholder="seu@email.com" {...form.register("email")} className="bg-slate-50 border-slate-200" />
                                            {form.formState.errors.email && <p className="text-red-500 text-xs">{form.formState.errors.email.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Telefone/WhatsApp</Label>
                                            <Input id="phone" placeholder="(00) 00000-0000" {...form.register("phone")} className="bg-slate-50 border-slate-200" />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-2">
                            <Label>Assunto <span className="text-red-500">*</span></Label>
                            <Select 
                                onValueChange={(val) => form.setValue("reasonId", Number(val))} 
                                defaultValue={form.watch("reasonId") ? String(form.watch("reasonId")) : undefined}
                            >
                                <SelectTrigger className="bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="Selecione o assunto da manifestação" />
                                </SelectTrigger>
                                <SelectContent>
                                    {isLoadingReasons ? (
                                        <div className="p-2 flex justify-center"><Loader2 className="animate-spin w-4 h-4" /></div>
                                    ) : (
                                        reasons?.map((reason: any) => (
                                            <SelectItem key={reason.id} value={String(reason.id)}>
                                                {reason.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            {form.formState.errors.reasonId && <p className="text-red-500 text-xs">{form.formState.errors.reasonId.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descrição Detalhada <span className="text-red-500">*</span></Label>
                            <Textarea 
                                id="description" 
                                placeholder="Descreva aqui sua solicitação, denúncia, sugestão ou elogio com o máximo de detalhes possível..." 
                                className="min-h-[120px] bg-slate-50 border-slate-200 resize-none"
                                {...form.register("description")}
                            />
                             {form.formState.errors.description && <p className="text-red-500 text-xs">{form.formState.errors.description.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>Anexos (Opcional)</Label>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md cursor-pointer transition text-sm font-medium border border-slate-300 border-dashed">
                                    <Upload className="w-4 h-4" />
                                    Selecionar Arquivos
                                    <input type="file" multiple className="hidden" onChange={handleFileChange} />
                                </label>
                                {files.length > 0 && <span className="text-sm text-slate-600">{files.length} arquivo(s) selecionado(s)</span>}
                            </div>
                        </div>

                        <Button 
                            type="submit" 
                            disabled={createTicket.isPending || isUploading}
                            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/80/90 text-white font-bold h-12 shadow-lg transition-all"
                        >
                            {createTicket.isPending || isUploading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</>
                            ) : (
                                <><Send className="mr-2 h-4 w-4" /> Enviar Manifestação</>
                            )}
                        </Button>

                    </form>
                </CardContent>
            </Card>
          </motion.div>
       </div>
       
       <footer className="relative z-10 py-6 text-center text-slate-500 text-sm">
         <p>© {new Date().getFullYear()} Qualital - Ouvidoria. Todos os direitos reservados.</p>
       </footer>
    </div>
  );
}



