import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
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
  GitMerge,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User,
  UserCog,
  Briefcase,
  MessageCircle,
  Upload,
  Plug,
  Search,
  Ban,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  Trophy,
  Send,
  BellRing,
  Activity,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ModeToggle } from "./mode-toggle";
import logoQualital from "@/assets/logo-qualital.png";

type NavItem = {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  inDevelopment?: boolean;
  submenu?: NavItem[];
};

const navigation: NavItem[] = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["admin", "SuperAdmin", "gerente", "atendente"],
  },
  {
    name: "Atendimentos",
    href: "/tickets",
    icon: Ticket,
    roles: ["admin", "SuperAdmin", "gerente", "atendente"],
  },
  {
    name: "Processos",
    href: "/processos",
    icon: GitMerge,
    roles: ["admin", "SuperAdmin", "gerente", "atendente"],
  },
  {
    name: "Chat Interno",
    href: "/whatsapp",
    icon: MessageSquare,
    roles: ["admin", "SuperAdmin", "gerente", "atendente"],
  },
  {
    name: "Clientes",
    href: "/Clientes",
    icon: Users,
    roles: ["admin", "SuperAdmin", "gerente"],
  },
  {
    name: "Contratos",
    href: "/contratos",
    icon: FileText,
    roles: ["admin", "SuperAdmin", "gerente"],
  },
  {
    name: "Departamentos",
    href: "/departamentos",
    icon: Building2,
    roles: ["admin", "SuperAdmin"],
  },
  {
    name: "Relatórios",
    icon: BarChart3,
    roles: ["admin", "SuperAdmin", "gerente"],
    submenu: [
      {
        name: "Resumo Diário",
        href: "/relatorios/resumo-diario",
        icon: CalendarDays,
        roles: ["admin", "SuperAdmin", "gerente"],
      },
      {
        name: "Resumo Semanal",
        href: "/relatorios/resumo-semanal",
        icon: CalendarRange,
        roles: ["admin", "SuperAdmin", "gerente"],
      },
      {
        name: "Resumo Mensal",
        href: "/relatorios/resumo-mensal",
        icon: CalendarClock,
        roles: ["admin", "SuperAdmin", "gerente"],
      },
      {
        name: "Resumo Anual",
        href: "/relatorios/resumo-anual",
        icon: BarChart3,
        roles: ["admin", "SuperAdmin", "gerente"],
      },
      {
        name: "Rankings",
        icon: Trophy,
        roles: ["admin", "SuperAdmin", "gerente"],
        submenu: [
          {
            name: "Clientes",
            href: "/relatorios/rankings/Clientes",
            icon: Users,
            roles: ["admin", "SuperAdmin", "gerente"],
          },
          {
            name: "Coordenadores",
            href: "/relatorios/rankings/coordenadores",
            icon: User,
            roles: ["admin", "SuperAdmin", "gerente"],
          },
          {
            name: "Contratos",
            href: "/relatorios/rankings/contratos",
            icon: FileText,
            roles: ["admin", "SuperAdmin", "gerente"],
          },
          {
            name: "Tipo",
            href: "/relatorios/rankings/tipo",
            icon: BarChart3,
            roles: ["admin", "SuperAdmin", "gerente"],
          },
        ],
      },
      {
        name: "Agendamento de Envio",
        href: "/relatorios/agendamento-envio",
        icon: Send,
        roles: ["admin", "SuperAdmin", "gerente"],
      },
      {
        name: "Alertas de Gestão",
        href: "/relatorios/alertas-gestao",
        icon: BellRing,
        roles: ["admin", "SuperAdmin", "gerente"],
      },
    ],
  },
  {
    name: "Configurações",
    icon: Settings,
    roles: ["admin", "SuperAdmin"],
    submenu: [
      {
        name: "Cadastros",
        icon: Briefcase,
        roles: ["admin", "SuperAdmin"],
        submenu: [
          {
            name: "Qualital",
            href: "/settings/cooperativa",
            icon: Building2,
            roles: ["admin", "SuperAdmin"],
          },
          {
            name: "Usuários",
            href: "/settings/usuarios",
            icon: Users,
            roles: ["admin", "SuperAdmin"],
          },
        ],
      },
      {
        name: "Comunicações",
        icon: MessageCircle,
        roles: ["admin", "SuperAdmin"],
        submenu: [
          {
            name: "Setup WhatsApp",
            href: "/settings/setup-whatsapp",
            icon: Plug,
            roles: ["admin", "SuperAdmin"],
          },
          {
            name: "Setup E-mails",
            href: "/settings/setup-emails",
            icon: Plug,
            roles: ["admin", "SuperAdmin"],
          },
          {
            name: "Layout E-mail",
            href: "/settings/email-layouts",
            icon: FileText,
            roles: ["admin", "SuperAdmin"],
          },
          {
            name: "APIs",
            href: "/settings/apis",
            icon: Plug,
            roles: ["admin", "SuperAdmin"],
            inDevelopment: true,
          },
          {
            name: "Blacklist",
            href: "/settings/blacklist",
            icon: Ban,
            roles: ["admin", "SuperAdmin"],
          },
          {
            name: "Logs WhatsApp",
            href: "/settings/whatsapp-logs",
            icon: FileText,
            roles: ["admin", "SuperAdmin"],
          },
        ],
      },
      {
        name: "Perfil do Usuário",
        href: "/settings/perfil-usuario",
        icon: UserCog,
        roles: ["admin", "SuperAdmin", "gerente", "atendente"],
      },
      {
        name: "Mensagens Automáticas",
        href: "/settings/mensagens-automaticas",
        icon: MessageCircle,
        roles: ["admin", "SuperAdmin"],
      },
      {
        name: "Setup dos Tickets",
        href: "/settings/setup-tickets",
        icon: Settings,
        roles: ["admin", "SuperAdmin"],
      },
      {
        name: "Auditoria",
        href: "/settings/auditoria",
        icon: Activity,
        roles: ["admin", "SuperAdmin"],
      },
    ],
  },
];

type SidebarContextValue = {
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  activeItem: string;
  setActiveItem: (v: string) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

const customStyles = `
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .animate-spin-slow {
    animation: spin-slow 25s linear infinite;
  }
  .animate-spin-slower {
    animation: spin-slow 40s linear infinite reverse;
  }
`;

function useSidebarContext() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("SidebarContext não encontrado");
  return ctx;
}

export default function Sidebar() {
  const [location] = useLocation();
  const { user, supabaseUser, logout, loading } = useAuth();
  const backendUser = user;

  const [expanded, setExpanded] = useState(true);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState("Dashboard");

  // Contador de tickets abertos para o sidebar
  const { data: openTicketsCount } = trpc.tickets.getOpenCount.useQuery(undefined, {
    refetchInterval: 30000, // Atualiza a cada 30 segundos
    staleTime: 25000,
  });

  const displayName =
    backendUser?.fullName?.trim() ||
    ((supabaseUser?.user_metadata?.name as string | undefined)?.trim() ?? "") ||
    supabaseUser?.email ||
    "Usuário";
  const displayInitial = displayName.charAt(0).toUpperCase() || "U";
  const allowedRoles = ["admin", "SuperAdmin", "gerente", "atendente", "user"];
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
    supabaseUser?.user_metadata?.role as string | undefined,
    supabaseUser?.role !== "authenticated" ? (supabaseUser?.role as string | undefined) : undefined
  );

  const sidebarNickname = backendUser?.nickname?.trim() || backendUser?.fullName?.trim() || displayName;
  const sidebarProfileLabel =
    backendUser?.profileName ||
    (backendUser?.profileRole ? backendUser.profileRole.charAt(0).toUpperCase() + backendUser.profileRole.slice(1) : effectiveRole);
  const sidebarDepartmentLabel = backendUser?.departmentName || null;
  const sidebarAvatar = backendUser?.avatarUrl;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      toast.error("Erro ao fazer logout");
    }
  };

  const filteredNavigation = useMemo(
    () => navigation.filter((item) => item.roles.includes(effectiveRole)),
    [effectiveRole]
  );

  useEffect(() => {
    const matchParent = filteredNavigation.find((item) => item.href && item.href === location);
    if (matchParent) {
      setActiveItem(matchParent.name);
      setOpenSubmenu(null);
      return;
    }
    const matchWithSub = filteredNavigation.find(
      (item) =>
        item.submenu &&
        item.submenu.some(
          (sub) => sub.href === location || sub.submenu?.some((child) => child.href === location)
        )
    );
    if (matchWithSub) {
      setActiveItem(matchWithSub.name);
      setOpenSubmenu(matchWithSub.name);
    }
  }, [location, filteredNavigation]);

  return (
    <div className="relative h-screen">
      <style>{customStyles}</style>
      <SidebarContext.Provider value={{ expanded, setExpanded, activeItem, setActiveItem }}>
        <aside
          className={cn(
            "h-full relative flex flex-col bg-white text-slate-600 transition-all duration-300 ease-in-out border-r border-slate-200 shadow-xl overflow-hidden",
            expanded ? "w-72" : "w-20"
          )}
        >
          <BackgroundFX />

          {/* Header */}
          <div className="relative h-32 flex items-center justify-center z-10">
            <HeaderLogo expanded={expanded} />
            <button
              onClick={() => setExpanded((c) => !c)}
              className="p-1.5 rounded-full bg-primary hover:bg-primary/90 text-white transition-all absolute -right-3 top-1/2 -translate-y-1/2 shadow-lg border border-white z-20 hover:scale-110"
              aria-label="Alternar menu"
            >
              {expanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>

          {/* Lista */}
          <ul className="relative z-10 flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {filteredNavigation.map((item) => {
              const hasSubmenu = !!item.submenu?.length;
              const isOpen = openSubmenu === item.name;
              const isActive = activeItem === item.name && !hasSubmenu ? true : item.href === location;
              const isSubActive = !!item.submenu?.some(
                (sub) => sub.href === location || sub.submenu?.some((child) => child.href === location)
              );

              return (
                <SidebarItem
                  key={item.name}
                  item={item}
                  isOpen={isOpen}
                  isActive={isActive || isSubActive}
                  onToggle={() => setOpenSubmenu(isOpen ? null : item.name)}
                  hasSubmenu={hasSubmenu}
                  badge={item.name === "Atendimentos" ? openTicketsCount : undefined}
                >
                  {item.submenu?.map((sub) =>
                    sub.submenu?.length ? (
                      <NestedSubmenu key={sub.name} item={sub} currentPath={location} />
                    ) : (
                      <SubItem key={sub.name} item={sub} isActive={location === sub.href} />
                    )
                  )}
                </SidebarItem>
              );
            })}
          </ul>

          {/* Footer */}
          <div className={cn("relative z-10 border-t border-slate-800 p-3 transition-all duration-300 space-y-2", expanded ? "" : "flex flex-col items-center")}>
            <ModeToggle expanded={expanded} />
            <div
              className={cn(
                "flex items-center gap-3 rounded-xl p-2 cursor-pointer hover:bg-slate-800/50 transition-colors group",
                expanded ? "" : "justify-center"
              )}
            >
              <div className="relative">
                <img
                  src={sidebarAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(sidebarNickname)}&background=0ea5e9&color=fff`}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full border-2 border-slate-700 shadow-sm group-hover:border-blue-500 transition-colors object-cover"
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#0f172a] rounded-full" />
              </div>

              <div className={cn("flex justify-between items-center overflow-hidden transition-all duration-300", expanded ? "w-40 opacity-100 ml-1" : "w-0 opacity-0")}>
                <div className="leading-4 text-left">
                  <h4 className="font-semibold text-slate-900 text-sm truncate">{sidebarNickname}</h4>
                  <div className="text-xs text-slate-500 leading-tight flex flex-col uppercase tracking-tighter">
                    <span className="truncate">{sidebarProfileLabel || effectiveRole}</span>
                    {sidebarDepartmentLabel && <span className="truncate">{sidebarDepartmentLabel}</span>}
                  </div>
                </div>
                <Settings size={16} className="text-slate-500 group-hover:text-white transition-colors" />
              </div>
            </div>

            <button
              className={cn(
                "mt-3 w-full flex items-center justify-center gap-2 rounded-lg border border-slate-700/70 text-slate-300 hover:text-white hover:border-slate-500 px-3 py-2 transition-all",
                expanded ? "" : "p-2 w-10 h-10"
              )}
              onClick={handleLogout}
              disabled={loading}
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
              {expanded && <span className="text-sm font-medium">Sair</span>}
            </button>
          </div>
        </aside>
      </SidebarContext.Provider>
    </div>
  );
}

function BackgroundFX() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <svg className="absolute -top-10 -left-10 w-64 h-64 text-primary/80/20 animate-spin-slow blur-xl" viewBox="0 0 100 100" fill="currentColor">
        <path d="M50 0 L100 100 L0 100 Z" />
      </svg>
      <svg className="absolute top-1/3 -right-20 w-80 h-80 text-primary/10 animate-spin-slower blur-xl" viewBox="0 0 100 100" fill="currentColor">
        <path d="M50 0 L100 100 L0 100 Z" />
      </svg>
      <svg className="absolute -bottom-20 -left-10 w-96 h-96 text-primary/20 animate-spin-slow blur-2xl" viewBox="0 0 100 100" fill="currentColor">
        <path d="M50 0 L100 100 L0 100 Z" />
      </svg>
    </div>
  );
}

function HeaderLogo({ expanded }: { expanded: boolean }) {
  return (
    <>
      <div
        className={cn(
          "flex flex-col gap-2 overflow-hidden transition-all duration-300 absolute left-6 top-1/2 -translate-y-1/2",
          expanded ? "opacity-100 w-[calc(100%-32px)] delay-100" : "opacity-0 w-0 pointer-events-none"
        )}
      >
        <img
          src="/logo-qualital.png"
          alt="Qualital Logo"
          className="h-16 object-contain self-start drop-shadow-sm"
        />
        <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/80 uppercase tracking-widest whitespace-nowrap pl-1 drop-shadow-sm">
          Sistema Interno Ouvidoria
        </span>
      </div>

      <div
        className={cn(
          "transition-all duration-300 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          !expanded ? "opacity-100 scale-100 delay-200" : "opacity-0 scale-0 w-0 pointer-events-none"
        )}
      >
        <img
          src="/favicon.png"
          alt="Qualital Icon"
          className="h-10 w-10 object-contain drop-shadow-lg brightness-110"
        />
      </div>
    </>
  );
}

function SidebarItem({
  item,
  isOpen,
  isActive,
  onToggle,
  hasSubmenu,
  badge,
  children,
}: {
  item: NavItem;
  isOpen: boolean;
  isActive: boolean;
  onToggle: () => void;
  hasSubmenu: boolean;
  badge?: number | string;
  children?: React.ReactNode;
}) {
  const { expanded, setExpanded, setActiveItem } = useSidebarContext();
  const baseClasses =
    "relative group flex items-center py-2.5 px-3 my-1 font-medium rounded-xl cursor-pointer transition-all duration-300 ease-in-out";

  const handleClick = () => {
    if (hasSubmenu) {
      if (!expanded) {
        setExpanded(true);
        setTimeout(() => onToggle(), 150);
      } else {
        onToggle();
      }
      setActiveItem(item.name);
    }
  };

  const content = (
    <div
      className={cn(
        baseClasses,
        isActive
          ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-md shadow-primary/20"
          : "text-slate-500 hover:bg-slate-100 hover:text-primary",
        !expanded && "justify-center"
      )}
      onClick={handleClick}
      title={!expanded ? item.name : undefined}
    >
      <span className={cn(isActive ? "text-white" : "text-slate-400 group-hover:text-primary", "transition-colors duration-200")}>
        <item.icon className="h-5 w-5" />
      </span>
      <span className={cn("overflow-hidden transition-all duration-300 ease-in-out", expanded ? "w-44 ml-3 opacity-100" : "w-0 ml-0 opacity-0")}>
        {item.name}
      </span>

      {expanded && (
        <div className="absolute right-3 flex items-center gap-2">
          {item.inDevelopment && !hasSubmenu && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-yellow-500/20 text-primary/80">DEV</span>
          )}
          {badge !== undefined && badge !== null && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
              {badge}
            </span>
          )}
          {hasSubmenu && (
            <ChevronDown size={14} className={cn("transition-transform duration-300", isOpen ? "rotate-180 text-primary/80" : "text-slate-400")} />
          )}
        </div>
      )}
    </div>
  );

  if (hasSubmenu) {
    return (
      <>
        <li>{content}</li>
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            expanded && isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <ul className="pl-4 ml-3 border-l-2 border-slate-800 space-y-1 my-1 pb-2">{children}</ul>
        </div>
      </>
    );
  }

  return (
    <li>
      <Link
        href={item.href || "#"}
        onClick={() => setActiveItem(item.name)}
        className="block"
      >
        {content}
      </Link>
    </li>
  );
}

function NestedSubmenu({ item, currentPath }: { item: NavItem; currentPath: string }) {
  const { expanded } = useSidebarContext();
  const [open, setOpen] = useState(item.submenu?.some((sub) => sub.href === currentPath) || false);

  return (
    <li>
      <button
        type="button"
        className={cn(
          "w-full flex items-center justify-between p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 text-sm transition-colors group",
          open && "bg-slate-800/60 text-white"
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="text-slate-500 group-hover:text-primary/80 transition-colors">
            <item.icon className="h-4 w-4" />
          </span>
          <span className={cn(!expanded && "sr-only")}>{item.name}</span>
        </div>
        <ChevronDown
          size={14}
          className={cn(
            "transition-transform duration-300",
            open ? "rotate-180 text-primary/80" : "text-slate-400"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          open ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <ul className="pl-4 ml-2 mt-1 space-y-1 border-l border-slate-800/60">
          {item.submenu?.map((sub) => (
            <SubItem key={sub.name} item={sub} isActive={currentPath === sub.href} />
          ))}
        </ul>
      </div>
    </li>
  );
}

function SubItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const { expanded, setActiveItem } = useSidebarContext();

  return (
    <li>
      <Link
        href={item.href || "#"}
        onClick={(e) => {
          if (item.inDevelopment) {
            e.preventDefault();
            toast.info("Em Desenvolvimento");
            return;
          }
          setActiveItem(item.name);
        }}
        className={cn(
          "flex items-center justify-between p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 cursor-pointer text-sm transition-colors group",
          isActive && "bg-slate-800/60 text-white"
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-slate-500 group-hover:text-primary/80 transition-colors">
            <item.icon className="h-4 w-4" />
          </span>
          <span className={cn(!expanded && "sr-only")}>{item.name}</span>
        </div>
        {item.inDevelopment && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 uppercase">DEV</span>
        )}
      </Link>
    </li>
  );
}



