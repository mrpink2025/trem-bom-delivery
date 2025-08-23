import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Building2, Truck, BarChart3, Settings, Shield, FileText, AlertTriangle, UserCheck } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAdminPanel } from '@/hooks/useAdminPanel';
import { LoadingScreen } from '@/components/ui/loading-screen';


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

  const isActive = (path: string) => {
    if (path === '/admin') {
      return currentPath === '/admin';
    }
    return currentPath.startsWith(path);
  };

  return (
    <Sidebar className="w-64 border-r bg-background">
      <SidebarContent>
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
                        `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                          isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
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

  if (isLoadingReports) {
    return <LoadingScreen message="Carregando dashboard..." />;
  }

  const kpis = reports?.kpis || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Painel Administrativo</h1>
          <p className="text-muted-foreground">
            Bem-vindo ao painel administrativo da plataforma
          </p>
        </div>
        <Badge variant="secondary">
          {currentAdminRole}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Total</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.total_orders?.toLocaleString() || '0'}</div>
            <p className="text-xs text-muted-foreground">
              nos últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(kpis.total_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Take rate: {(kpis.take_rate || 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lojas Ativas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.active_stores || '0'}</div>
            <p className="text-xs text-muted-foreground">
              operando agora
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Couriers Online</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.active_couriers || '0'}</div>
            <p className="text-xs text-muted-foreground">
              Taxa cancelamento: {(kpis.cancel_rate || 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              R$ {(kpis.average_ticket || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-muted-foreground">
              Receita da plataforma: R$ {(kpis.platform_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Métricas de Qualidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Taxa de Cancelamento</span>
                <span className="font-medium">{(kpis.cancel_rate || 0).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>SLA Compliance</span>
                <span className="font-medium text-green-600">85%</span>
              </div>
              <div className="flex justify-between">
                <span>NPS</span>
                <span className="font-medium text-blue-600">8.5</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function AdminDashboardNew() {
  const { isCheckingRole, currentAdminRole } = useAdminPanel();

  console.log('AdminDashboardNew - Rendering with role:', currentAdminRole, 'checking:', isCheckingRole);

  if (isCheckingRole) {
    console.log('AdminDashboardNew - Still checking role, showing loading screen');
    return <LoadingScreen message="Verificando permissões..." />;
  }

  if (!currentAdminRole) {
    console.log('AdminDashboardNew - No admin role, showing access denied');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
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
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <main className="flex-1 p-6">
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
        </main>
      </div>
    </SidebarProvider>
  );
}