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
import { LayoutDashboard, LogOut, Users, BarChart3, ClipboardList, Upload, FileText, Scale, Activity, Settings, Database, ChevronDown, Zap, Menu } from "lucide-react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "./ui/drawer";
import { useState } from "react";

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
      { icon: Zap, label: "Inteligência Operacional", path: "/repuxo/inteligencia" },
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

// Tabs fixas para bottom nav (as mais usadas no dia a dia)
const bottomNavTabs = [
  { icon: Scale, label: "Repuxo", path: "/repuxo/lancamento" },
  { icon: LayoutDashboard, label: "Dashboard", path: "/repuxo/dashboard" },
  { icon: Database, label: "Produtos", path: "/products" },
  { icon: ClipboardList, label: "Apontar", path: "/production" },
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
  const [menuOpen, setMenuOpen] = useState(false);
  const accessibleMenuItems = menuItems.filter(
    item => !item.adminOnly || (user && "role" in user && user.role === "admin")
  );

  const navigateTo = (path: string) => {
    setLocation(path);
    setMenuOpen(false);
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
    <header className="md:hidden border-b bg-background/95 px-4 py-3 sticky top-0 z-40 flex items-center justify-between">
      <img src="/logo-nobre.png" alt={APP_TITLE} className="h-10 object-contain" />
      <div className="flex items-center gap-2">
        {renderUserDropdown("mobile")}
        <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
          <DrawerTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10">
              <Menu className="h-5 w-5" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[80vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-base font-bold text-slate-700">Menu</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-8 space-y-1">
              {accessibleMenuItems.map((section, idx) => (
                <div key={idx} className="mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-2 mb-1">{section.label}</p>
                  {section.children.map(child => {
                    const isActive = location === child.path;
                    return (
                      <button
                        key={child.path}
                        onClick={() => navigateTo(child.path)}
                        className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-sm font-medium transition-colors min-h-[52px] ${
                          isActive
                            ? "bg-indigo-50 text-indigo-700 font-bold"
                            : "text-slate-600 hover:bg-slate-50 active:bg-slate-100"
                        }`}
                      >
                        <child.icon className={`h-5 w-5 shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                        <span>{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </header>
  );

  const MobileBottomNav = () => (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t flex items-stretch h-16">
      {bottomNavTabs.map((tab) => {
        const exactActive = location === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigateTo(tab.path)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors min-h-[44px] ${
              exactActive ? "text-indigo-600" : "text-slate-400 hover:text-slate-600 active:text-indigo-500"
            }`}
          >
            <tab.icon className={`h-6 w-6 shrink-0 transition-transform ${exactActive ? "scale-110" : ""}`} />
            <span className={`text-[10px] font-semibold leading-none ${exactActive ? "text-indigo-600" : ""}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {isMobile ? <MobileHeader /> : <DesktopHeader />}
      <main className={`flex-1 p-4 ${isMobile ? "pb-20" : ""}`}>{children}</main>
      {isMobile && <MobileBottomNav />}
    </div>
  );
}
