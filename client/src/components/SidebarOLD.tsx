import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Ticket,
  Users,
  FileText,
  Building2,
  MessageSquare,
  Settings,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
  UserCog,
  Briefcase,
  MessageCircle,
  List,
  Upload,
  Plug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSupabaseAuth } from "@/_core/hooks/useSupabaseAuth";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["admin", "gerente", "atendente"],
  },
  {
    name: "Tickets",
    href: "/tickets",
    icon: Ticket,
    roles: ["admin", "gerente", "atendente"],
    inDevelopment: true,
  },
  {
    name: "WhatsApp",
    href: "/whatsapp-chat",
    icon: MessageSquare,
    roles: ["admin", "gerente", "atendente"],
  },
  {
    name: "Clientes",
    href: "/Clientes",
    icon: Users,
    roles: ["admin", "gerente"],
  },
  {
    name: "Contratos",
    href: "/contratos",
    icon: FileText,
    roles: ["admin", "gerente"],
  },
  {
    name: "Departamentos",
    href: "/departamentos",
    icon: Building2,
    roles: ["admin"],
  },
  {
    name: "Relatórios",
    href: "/relatorios",
    icon: BarChart3,
    roles: ["admin", "gerente"],
    inDevelopment: true,
  },
  {
    name: "Configurações",
    icon: Settings,
    roles: ["admin"],
    submenu: [
      {
        name: "Usuários",
        href: "/settings/usuarios",
        icon: User,
      },
      {
        name: "Perfil do Usuário",
        href: "/settings/perfil-usuario",
        icon: UserCog,
        inDevelopment: true,
      },
      {
        name: "Cooperativa",
        href: "/settings/cooperativa",
        icon: Briefcase,
      },
      {
        name: "Mensagens Automáticas",
        href: "/settings/mensagens-automaticas",
        icon: MessageCircle,
      },
      {
        name: "Setup WhatsApp",
        href: "/settings/setup-whatsapp",
        icon: Plug,
      },
      {
        name: "Setup E-mails",
        href: "/settings/setup-emails",
        icon: Plug,
      },
      {
        name: "Setup dos Tickets",
        href: "/settings/setup-tickets",
        icon: Settings,
      },
      {
        name: "Importações",
        href: "/settings/importacoes",
        icon: Upload,
      },
      {
        name: "APIs",
        href: "/settings/apis",
        icon: Plug,
        inDevelopment: true,
      },
    ],
  },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout, loading } = useSupabaseAuth();
  const { data: backendUser } = trpc.auth.me.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const [collapsed, setCollapsed] = React.useState(false);
  const [expandedMenu, setExpandedMenu] = React.useState<string | null>(null);
  const displayName =
    backendUser?.fullName?.trim() ||
    ((user?.user_metadata?.name as string | undefined)?.trim() ?? "") ||
    user?.email ||
    "Usuário";
  const displayInitial = displayName.charAt(0).toUpperCase() || "U";
  // Escolhe role de forma defensiva: só considera admin/gerente se vier explicitamente
  const allowedRoles = ["admin", "gerente", "atendente", "user"];
  const pickRole = (...roles: (string | undefined)[]) => {
    for (const r of roles) {
      if (r && allowedRoles.includes(r)) return r;
    }
    return "atendente";
  };
  const backendRole = (backendUser as any)?.role as string | undefined;
  const effectiveRole = pickRole(
    backendUser?.profileRole,
    backendRole,
    user?.user_metadata?.role as string | undefined,
    user?.role !== "authenticated" ? (user?.role as string | undefined) : undefined
  );
  const sidebarNickname =
    backendUser?.nickname?.trim() ||
    backendUser?.fullName?.trim() ||
    displayName;
  const sidebarProfileLabel =
    backendUser?.profileName ||
    (backendUser?.profileRole
      ? backendUser.profileRole.charAt(0).toUpperCase() +
        backendUser.profileRole.slice(1)
      : effectiveRole);
  const sidebarSubtitle = [sidebarProfileLabel, backendUser?.departmentName]
    .filter(Boolean)
    .join(" - ");
  const sidebarAvatar = backendUser?.avatarUrl;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      toast.error("Erro ao fazer logout");
    }
  };

  // Filtrar navegação baseado no role do usuário
  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(effectiveRole)
  );

  return (
    <div className={cn(
      "flex h-full flex-col border-r bg-gradient-to-b from-[#0c2856] to-[#005487] text-white shadow-xl transition-all duration-300",
      collapsed ? "w-20" : "w-64"
    )}>
      {/* Logo e Botão Toggle */}
      <div className="relative border-b border-white/10">
        {/* Botão Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 text-white hover:bg-white/10 h-8 w-8 z-10"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
        
        {/* Logo e Texto */}
        {!collapsed ? (
          <div className="flex flex-col items-center justify-center py-6 px-4">
            <img 
              src="/logo-qualital.png" 
              alt="Qualital" 
              className="h-16 w-auto brightness-0 invert mb-3"
            />
            <span className="text-xl font-bold tracking-tight whitespace-nowrap">Helpdesk</span>
          </div>
        ) : (
          <div className="flex items-center justify-center py-6">
            <img 
              src="/favicon.png" 
              alt="Qualital" 
              className="h-12 w-12 object-contain"
            />
          </div>
        )}
      </div>

      {/* Navegação */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {filteredNavigation.map((item) => {
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isExpanded = expandedMenu === item.name;
            const isActive = item.href ? location === item.href : false;
            const isSubmenuActive = hasSubmenu && item.submenu.some(sub => location === sub.href);

            return (
              <div key={item.name}>
                {/* Item principal */}
                {hasSubmenu ? (
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer",
                      isSubmenuActive || isExpanded
                        ? "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                        : "text-white/70 hover:bg-white/10 hover:text-white",
                      collapsed && "justify-center"
                    )}
                    onClick={() => setExpandedMenu(isExpanded ? null : item.name)}
                    title={collapsed ? item.name : undefined}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 whitespace-nowrap">{item.name}</span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <Link href={item.href!}>
                    <div
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer",
                        isActive
                          ? "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                          : "text-white/70 hover:bg-white/10 hover:text-white",
                        collapsed && "justify-center"
                      )}
                      title={collapsed ? item.name : undefined}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="whitespace-nowrap">{item.name}</span>
                          {item.inDevelopment && (
                            <span className="ml-auto text-[10px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded font-semibold">DEV</span>
                          )}
                        </>
                      )}
                    </div>
                  </Link>
                )}

                {/* Submenu */}
                {hasSubmenu && isExpanded && !collapsed && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-white/20 pl-3">
                    {item.submenu.map((subItem) => {
                      const isSubActive = location === subItem.href;
                      return (
                        <Link key={subItem.name} href={subItem.href}>
                          <div
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 cursor-pointer",
                              isSubActive
                                ? "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                                : "text-white/60 hover:bg-white/10 hover:text-white"
                            )}
                            onClick={(e) => {
                              if (subItem.inDevelopment) {
                                e.preventDefault();
                                toast.info("Em Desenvolvimento");
                              }
                            }}
                          >
                            <subItem.icon className="h-4 w-4 flex-shrink-0" />
                            <span className="whitespace-nowrap">{subItem.name}</span>
                            {subItem.inDevelopment && (
                              <span className="ml-auto text-[10px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded">DEV</span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Informações do usuário */}
      <div className="border-t border-white/10 p-4">
        {!collapsed ? (
          <>
            <div className="mb-3 flex items-center gap-3">
              <Avatar className="h-10 w-10 flex-shrink-0">
                {sidebarAvatar ? (
                  <AvatarImage src={sidebarAvatar} alt={sidebarNickname} />
                ) : null}
                <AvatarFallback>{displayInitial}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-semibold text-white">
                  {sidebarNickname}
                </p>
                <p className="truncate text-xs text-white/70">
                  {sidebarSubtitle || effectiveRole}
                </p>
              </div>
            </div>
            <Separator className="mb-3 bg-white/10" />
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white transition-all duration-200"
              onClick={handleLogout}
              disabled={loading}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Avatar className="h-10 w-10">
              {sidebarAvatar ? (
                <AvatarImage src={sidebarAvatar} alt={sidebarNickname} />
              ) : null}
              <AvatarFallback>{displayInitial}</AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="icon"
              className="w-full bg-white/10 text-white hover:bg-white/20 hover:text-white transition-all duration-200"
              onClick={handleLogout}
              disabled={loading}
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}




