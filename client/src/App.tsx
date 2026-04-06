// client/src/App.tsx
import { ComponentType, useEffect } from "react";
import { Route, Switch as RouterSwitch, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { useSupabaseAuth } from "@/_core/hooks/useSupabaseAuth";
import Login from "@/pages/Login";
import Ouvidoria from "@/pages/Ouvidoria";
import Home from "@/pages/Home";
import Tickets from "@/pages/Tickets";
import TicketsPlaceholder from "@/pages/TicketsPlaceholder";
import Processos from "@/pages/Processos";
import Clientes from "@/pages/Clientes";
import Contratos from "@/pages/Contratos";
import Departamentos from "@/pages/Departamentos";
import RelatoriosPlaceholder from "@/pages/RelatoriosPlaceholder";
import ResumoDiario from "@/pages/relatorios/ResumoDiario";
import ResumoSemanal from "@/pages/relatorios/ResumoSemanal";
import ResumoMensal from "@/pages/relatorios/ResumoMensal";
import ResumoAnual from "@/pages/relatorios/ResumoAnual";
import RankingAtendimento from "@/pages/relatorios/RankingAtendimento";
import RankingClientes from "@/pages/relatorios/RankingClientes";
import RankingCoordenadores from "@/pages/relatorios/RankingCoordenadores";
import RankingContratos from "@/pages/relatorios/RankingContratos";
import RankingTipos from "@/pages/relatorios/RankingTipos";
import AgendamentoEnvio from "@/pages/relatorios/AgendamentoEnvio";
import AlertasGestao from "@/pages/relatorios/AlertasGestao";
import WhatsAppChat from "@/pages/WhatsAppChat";
import Configuracoes from "@/pages/Configuracoes";
import ComponentShowcase from "@/pages/ComponentShowcase";
import SettingsAPIs from "@/pages/settings/APIs";
import SettingsCooperativa from "@/pages/settings/Empresa";
import SettingsMensagensAutomaticas from "@/pages/settings/MensagensAutomaticas";
import SettingsPerfilUsuario from "@/pages/settings/PerfilUsuario";
import SettingsUsuarios from "@/pages/settings/Usuarios";
import SettingsSetupWhatsApp from "@/pages/settings/SetupWhatsApp";
import SettingsSetupTickets from "@/pages/settings/SetupTickets";
import SettingsSetupEmails from "@/pages/settings/SetupEmails";
import SettingsEmailLayouts from "@/pages/settings/EmailLayouts";
import SettingsBlacklist from "@/pages/settings/Blacklist";
import SettingsWhatsappLogs from "@/pages/settings/WhatsappLogs";
import SettingsAuditoria from "@/pages/settings/Auditoria";
import ValidarAcesso from "@/pages/ValidarAcesso";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";
import FixAdmin from "@/pages/FixAdmin";
import InternalChat from "@/pages/InternalChat";
import ReportPDF from "@/pages/ReportPDF";

interface RouteDefinition {
  path: string;
  component: ComponentType<any>;
}

const publicRoutes: RouteDefinition[] = [
  { path: "/auth", component: Login },
  { path: "/login", component: Login },
  { path: "/validar-acesso", component: ValidarAcesso },
  // 🔧 ROTA TEMPORÁRIA - DELETAR APÓS CORRIGIR ADMIN
  { path: "/fix-admin", component: FixAdmin },
  { path: "/reset-password", component: ResetPassword },
  { path: "/ouvidoria", component: Ouvidoria },
];

const protectedRoutes: RouteDefinition[] = [
  { path: "/", component: Home },
  { path: "/home", component: Home },
  { path: "/tickets", component: Tickets },
  { path: "/processos", component: Processos },
  { path: "/tickets/placeholder", component: TicketsPlaceholder },
  { path: "/Clientes", component: Clientes },
  { path: "/contratos", component: Contratos },
  { path: "/departamentos", component: Departamentos },
  { path: "/relatorios", component: RelatoriosPlaceholder },
  { path: "/relatorios/resumo-diario", component: ResumoDiario },
  { path: "/relatorios/resumo-semanal", component: ResumoSemanal },
  { path: "/relatorios/resumo-mensal", component: ResumoMensal },
  { path: "/relatorios/resumo-anual", component: ResumoAnual },
  { path: "/relatorios/ranking-atendimento", component: RankingAtendimento },
  { path: "/relatorios/rankings/Clientes", component: RankingClientes },
  { path: "/relatorios/rankings/coordenadores", component: RankingCoordenadores },
  { path: "/relatorios/rankings/contratos", component: RankingContratos },
  { path: "/relatorios/rankings/tipo", component: RankingTipos },
  { path: "/relatorios/agendamento-envio", component: AgendamentoEnvio },
  { path: "/relatorios/alertas-gestao", component: AlertasGestao },
  { path: "/whatsapp", component: InternalChat },
  { path: "/whatsapp-chat", component: WhatsAppChat },
  { path: "/configuracoes", component: Configuracoes },
  { path: "/component-showcase", component: ComponentShowcase },
  { path: "/settings/usuarios", component: SettingsUsuarios },
  { path: "/settings/perfil-usuario", component: SettingsPerfilUsuario },
  { path: "/settings/cooperativa", component: SettingsCooperativa },
  { path: "/settings/empresa", component: SettingsCooperativa }, // legado
  { path: "/settings/mensagens-automaticas", component: SettingsMensagensAutomaticas },
  { path: "/settings/apis", component: SettingsAPIs },
  { path: "/settings/setup-whatsapp", component: SettingsSetupWhatsApp },
  { path: "/settings/setup-tickets", component: SettingsSetupTickets },
  { path: "/settings/setup-emails", component: SettingsSetupEmails },
  { path: "/settings/email-layouts", component: SettingsEmailLayouts },
  { path: "/settings/blacklist", component: SettingsBlacklist },
  { path: "/settings/whatsapp-logs", component: SettingsWhatsappLogs },
  { path: "/settings/auditoria", component: SettingsAuditoria },
  { path: "/relatorios/pdf-grade-10", component: ReportPDF },
];

interface ProtectedRouteProps {
  component: ComponentType<any>;
}

const ProtectedRoute = ({ component: Component }: ProtectedRouteProps) => {
  const { user, loading } = useSupabaseAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/auth");
    }
  }, [loading, user, setLocation]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <Component />;
};

const withProtection = (Component: ComponentType<any>) => () => (
  <ProtectedRoute component={Component} />
);

function App() {
  return (
    <>
      <RouterSwitch>
        {publicRoutes.map(({ path, component }) => (
          <Route key={path} path={path} component={component} />
        ))}
        {protectedRoutes.map(({ path, component }) => (
          <Route key={path} path={path} component={withProtection(component)} />
        ))}
        <Route component={NotFound} />
      </RouterSwitch>
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}

export default App;



