import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Building2, Truck, BarChart3, Settings, Shield, FileText, AlertTriangle, UserCheck, Menu } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAdminPanel } from '@/hooks/useAdminPanel';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useIsMobile } from '@/hooks/use-mobile';


// Componentes dos módulos (serão criados)
const AdminUsersModule = React.lazy(() => import('./modules/AdminUsersModule'));
const AdminMerchantsModule = React.lazy(() => import('./modules/AdminMerchantsModule'));
const AdminCouriersModule = React.lazy(() => import('./modules/AdminCouriersModule'));
const AdminReportsModule = React.lazy(() => import('./modules/AdminReportsModule'));
const AdminModerationModule = React.lazy(() => import('./modules/AdminModerationModule'));
const AdminSettingsModule = React.lazy(() => import('./modules/AdminSettingsModule'));
const AdminAuditModule = React.lazy(() => import('./modules/AdminAuditModule'));
const AdminPendingModule = React.lazy(() => import('./modules/AdminPendingModule'));

const sidebarItems = [
  { title: 'Dashboard', url: '/admin', icon: BarChart3 },
  { title: 'Cadastros Pendentes', url: '/admin/pending', icon: UserCheck },
  { title: 'Usuários', url: '/admin/users', icon: Users },
  { title: 'Lojistas', url: '/admin/merchants', icon: Building2 },
  { title: 'Motoboys', url: '/admin/couriers', icon: Truck },
  { title: 'Moderação', url: '/admin/moderation', icon: Shield },
  { title: 'Relatórios', url: '/admin/reports', icon: FileText },
  { title: 'Configurações', url: '/admin/settings', icon: Settings },
  { title: 'Auditoria', url: '/admin/audit', icon: AlertTriangle },
];

function AdminSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const isMobile = useIsMobile();

  const isActive = (path: string) => {
    if (path === '/admin') {
      return currentPath === '/admin';
    }
    return currentPath.startsWith(path);
  };

  return (
    <Sidebar 
      className={isMobile ? "w-full" : "w-64 border-r bg-background"} 
      collapsible={isMobile ? "offcanvas" : "icon"}
    >
      <SidebarContent className={isMobile ? "pt-4" : "pt-20"}>
        <SidebarGroup>
          <SidebarGroupLabel>Painel Administrativo</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) => 
                        `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors touch-target ${
                          isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function AdminDashboardOverview() {
  const { reports, currentAdminRole, isLoadingReports } = useAdminPanel();
  const isMobile = useIsMobile();

  if (isLoadingReports) {
    return <LoadingScreen message="Carregando dashboard..." />;
  }

  const kpis = reports?.kpis || {};

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className={`font-bold ${isMobile ? 'text-xl' : 'text-3xl'}`}>Painel Administrativo</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Bem-vindo ao painel administrativo da plataforma
          </p>
        </div>
        <Badge variant="secondary">
          {currentAdminRole}
        </Badge>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="mobile-card-padding">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Pedidos Total</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{kpis.total_orders?.toLocaleString() || '0'}</div>
            <p className="text-xs text-muted-foreground">
              nos últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card className="mobile-card-padding">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Receita Total</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">
              R$ {(kpis.total_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Take rate: {(kpis.take_rate || 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="mobile-card-padding">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Lojas Ativas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{kpis.active_stores || '0'}</div>
            <p className="text-xs text-muted-foreground">
              operando agora
            </p>
          </CardContent>
        </Card>

        <Card className="mobile-card-padding">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Couriers Online</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{kpis.active_couriers || '0'}</div>
            <p className="text-xs text-muted-foreground">
              Taxa cancelamento: {(kpis.cancel_rate || 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
        <Card className="mobile-card-padding">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">
              R$ {(kpis.average_ticket || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-sm text-muted-foreground">
              Receita da plataforma: R$ {(kpis.platform_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="mobile-card-padding">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Métricas de Qualidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Taxa de Cancelamento</span>
                <span className="font-medium text-sm">{(kpis.cancel_rate || 0).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">SLA Compliance</span>
                <span className="font-medium text-green-600 text-sm">85%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">NPS</span>
                <span className="font-medium text-blue-600 text-sm">8.5</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MobileAdminHeader() {
  return (
    <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="touch-target">
          <Menu className="h-5 w-5" />
        </SidebarTrigger>
        <h1 className="text-lg font-semibold truncate">Painel Admin</h1>
      </div>
    </header>
  );
}

export function AdminDashboardNew() {
  const { isCheckingRole, currentAdminRole } = useAdminPanel();
  const isMobile = useIsMobile();

  console.log('AdminDashboardNew - Rendering with role:', currentAdminRole, 'checking:', isCheckingRole);

  if (isCheckingRole) {
    console.log('AdminDashboardNew - Still checking role, showing loading screen');
    return <LoadingScreen message="Verificando permissões..." />;
  }

  if (!currentAdminRole) {
    console.log('AdminDashboardNew - No admin role, showing access denied');
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Você não tem permissão para acessar o painel administrativo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  console.log('AdminDashboardNew - Rendering admin dashboard with role:', currentAdminRole);

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full bg-background">
        {isMobile && <MobileAdminHeader />}
        
        <AdminSidebar />
        
        <main className={`flex-1 ${isMobile ? 'mt-16' : 'p-6'}`}>
          <div className={`${isMobile ? 'p-4 pb-safe' : ''}`}>
            <React.Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route path="/" element={<AdminDashboardOverview />} />
                <Route path="/pending" element={<AdminPendingModule />} />
                <Route path="/users" element={<AdminUsersModule />} />
                <Route path="/merchants" element={<AdminMerchantsModule />} />
                <Route path="/couriers" element={<AdminCouriersModule />} />
                <Route path="/moderation" element={<AdminModerationModule />} />
                <Route path="/reports" element={<AdminReportsModule />} />
                <Route path="/settings" element={<AdminSettingsModule />} />
                <Route path="/audit" element={<AdminAuditModule />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </React.Suspense>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}