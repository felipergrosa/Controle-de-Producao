import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_TITLE } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { LayoutDashboard, LogOut, Users, BarChart3, ClipboardList, Upload, FileText, Scale, Activity, Settings, Database, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

type MenuItem = {
  icon: any;
  label: string;
  adminOnly?: boolean;
  children: {
    icon: any;
    label: string;
    path: string;
  }[];
};

const menuItems: MenuItem[] = [
  {
    icon: LayoutDashboard,
    label: "Painel Geral",
    adminOnly: false,
    children: [
      { icon: LayoutDashboard, label: "Dashboard Geral", path: "/dashboard" },
      { icon: BarChart3, label: "Relatório Diário", path: "/report" },
    ]
  },
  {
    icon: ClipboardList,
    label: "Apontamentos",
    adminOnly: false,
    children: [
      { icon: ClipboardList, label: "Lançamento de Apontamento", path: "/production" },
    ]
  },
  {
    icon: Activity,
    label: "Repuxo",
    adminOnly: false,
    children: [
      { icon: Activity, label: "Dashboard de Repuxo", path: "/repuxo/dashboard" },
      { icon: Scale, label: "Lançamento de Repuxados", path: "/repuxo/lancamento" },
      { icon: Settings, label: "Gerenciador de Cadastros", path: "/repuxo/gerenciador" },
    ]
  },
  {
    icon: Database,
    label: "Produtos",
    adminOnly: false,
    children: [
      { icon: LayoutDashboard, label: "Consulta de Produtos", path: "/products" },
      { icon: Upload, label: "Importar Produtos", path: "/import" },
    ]
  },
  {
    icon: Users,
    label: "Admin",
    adminOnly: true,
    children: [
      { icon: Users, label: "Usuários", path: "/users" },
      { icon: FileText, label: "Logs de Auditoria", path: "/audit-logs" },
    ]
  }
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user } = useAuth();
  const [location, setLocation] = useLocation();

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    if (location !== "/login") {
      setLocation("/login");
    }
    return <DashboardLayoutSkeleton />;
  }

  return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
};

function DashboardLayoutContent({
  children,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const displayUser = user || { name: "Usuário", email: "usuario@sistema.com" };
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const accessibleMenuItems = menuItems.filter(
    item => !item.adminOnly || (user && "role" in user && user.role === "admin")
  );
  const activeMenuItem = menuItems.find(item => item.children.some(child => child.path === location));

  const navigateTo = (path: string) => {
    setLocation(path);
  };

  const renderMenuButtons = (options?: { inactiveVariant?: "ghost" | "outline"; className?: string }) =>
    accessibleMenuItems.map((item, idx) => {
      const hasActiveChild = item.children.some(child => child.path === location);
      const inactiveVariant = options?.inactiveVariant ?? "ghost";
      
      const triggerButton = (
        <Button
          variant={hasActiveChild ? "default" : inactiveVariant}
          size={options?.inactiveVariant === "outline" ? "icon" : "sm"}
          className={`${hasActiveChild ? "shadow" : ""} ${options?.className ?? "flex items-center gap-1.5 px-3 h-10"} select-none`.trim()}
          title={item.label}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {options?.inactiveVariant !== "outline" && (
            <>
              <span className="hidden lg:inline text-xs font-bold uppercase tracking-wider">{item.label}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground/80 shrink-0" />
            </>
          )}
        </Button>
      );

      return (
        <DropdownMenu key={idx}>
          <DropdownMenuTrigger asChild>
            {options?.inactiveVariant === "outline" ? (
              triggerButton
            ) : (
              <div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {triggerButton}
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">{item.label}</TooltipContent>
                </Tooltip>
              </div>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 shadow-md">
            {item.children.map(child => {
              const isChildActive = location === child.path;
              return (
                <DropdownMenuItem
                  key={child.path}
                  onClick={() => navigateTo(child.path)}
                  className={`cursor-pointer gap-2.5 py-2 text-xs font-semibold ${isChildActive ? "bg-indigo-50/80 text-indigo-700 font-bold hover:bg-indigo-50/80" : "text-slate-600 hover:text-slate-900"}`}
                >
                  <child.icon className={`h-4 w-4 shrink-0 ${isChildActive ? "text-indigo-600" : "text-slate-400"}`} />
                  <span>{child.label}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    });

  const renderUserDropdown = (mode: "desktop" | "mobile") => {
    const showDetails = mode === "desktop" ? "hidden lg:flex" : "flex";
    const buttonPadding = mode === "desktop" ? "px-3 py-1.5" : "px-3 py-1.5";
    const gap = mode === "desktop" ? "gap-3" : "gap-2";
    const avatarSize = mode === "desktop" ? "h-8 w-8" : "h-8 w-8";
    const containerClasses = mode === "desktop"
      ? "flex items-center gap-3 rounded-full border px-3 py-1.5 hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      : `flex items-center ${gap} rounded-full border ${buttonPadding} hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring`;
    const detailsClasses = `${showDetails} flex-col items-start text-left`;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={containerClasses}>
            <Avatar className={`${avatarSize} border`}>
              <AvatarFallback className="text-xs font-medium">
                {displayUser?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className={detailsClasses}>
              <span className="text-sm font-medium leading-none">
                {displayUser?.name || "-"}
              </span>
              <span className="text-xs text-muted-foreground leading-none">
                {displayUser?.email || "-"}
              </span>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={logout}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const DesktopHeader = () => (
    <header className="hidden md:flex items-center justify-between border-b bg-background/95 px-6 py-4">
      <div className="flex items-center gap-3">
        <img src="/logo-nobre.png" alt={APP_TITLE} className="h-16 object-contain" />
      </div>
      <TooltipProvider>
        <div className="flex items-center justify-end gap-2">
          {renderMenuButtons()}
          {renderUserDropdown("desktop")}
        </div>
      </TooltipProvider>
    </header>
  );

  const MobileHeader = () => (
    <header className="md:hidden border-b bg-background/95 px-3 py-3 space-y-3 sticky top-0 z-40">
      <div className="flex items-center justify-between gap-3">
        <img src="/logo-nobre.png" alt={APP_TITLE} className="h-12 object-contain" />
        {renderUserDropdown("mobile")}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {renderMenuButtons({ inactiveVariant: "outline", className: "h-12 w-12" })}
      </div>
    </header>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {isMobile ? <MobileHeader /> : <DesktopHeader />}
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
