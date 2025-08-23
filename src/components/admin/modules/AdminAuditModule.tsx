import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Search, Download, Shield, Database, User, FileText, Eye, Trash2, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { addDays, format } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface AdminAction {
  id: string;
  actor_admin_id: string;
  action: string;
  target_table: string;
  target_id: string;
  reason: string;
  diff: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

interface GDPRErasure {
  id: string;
  user_id: string;
  requested_at: string;
  process_after: string;
  processed_at: string;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  erasure_type: 'SOFT' | 'ANON' | 'HARD';
  requested_by_admin: string;
  reason: string;
  notes: string;
}

export default function AdminAuditModule() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [selectedAction, setSelectedAction] = useState('all');
  const { toast } = useToast();

  const { data: auditLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['admin-audit-logs', searchTerm, dateRange, selectedAction],
    queryFn: async () => {
      let query = supabase
        .from('admin_actions_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (dateRange?.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('created_at', dateRange.to.toISOString());
      }

      if (searchTerm) {
        query = query.or(`action.ilike.%${searchTerm}%,target_table.ilike.%${searchTerm}%,reason.ilike.%${searchTerm}%`);
      }

      if (selectedAction !== 'all') {
        query = query.eq('action', selectedAction);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AdminAction[];
    },
  });

  const { data: gdprQueue, isLoading: isLoadingGDPR } = useQuery({
    queryKey: ['gdpr-erasure-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gdpr_erasure_queue')
        .select('*')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return data as GDPRErasure[];
    },
  });

  // Mock security alerts
  const securityAlerts = [
    {
      id: '1',
      type: 'suspicious_login',
      severity: 'high',
      description: 'Múltiplas tentativas de login falharam para admin',
      timestamp: new Date().toISOString(),
      resolved: false
    },
    {
      id: '2',
      type: 'data_access',
      severity: 'medium',
      description: 'Acesso incomum aos dados de usuários',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      resolved: true
    }
  ];

  const getActionBadge = (action: string) => {
    const actionMap: Record<string, { color: string; label: string }> = {
      'CREATE': { color: 'bg-green-100 text-green-800', label: 'Criar' },
      'UPDATE': { color: 'bg-blue-100 text-blue-800', label: 'Atualizar' },
      'DELETE': { color: 'bg-red-100 text-red-800', label: 'Excluir' },
      'SUSPEND': { color: 'bg-orange-100 text-orange-800', label: 'Suspender' },
      'RESTORE': { color: 'bg-green-100 text-green-800', label: 'Restaurar' },
      'VIEW_REPORTS': { color: 'bg-purple-100 text-purple-800', label: 'Visualizar' },
    };

    const config = actionMap[action] || { color: 'bg-gray-100 text-gray-800', label: action };

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      'PENDING': { color: 'bg-yellow-100 text-yellow-800', label: 'Pendente' },
      'PROCESSED': { color: 'bg-green-100 text-green-800', label: 'Processado' },
      'FAILED': { color: 'bg-red-100 text-red-800', label: 'Falhado' },
    };

    const config = statusMap[status] || { color: 'bg-gray-100 text-gray-800', label: status };

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const severityMap: Record<string, { color: string; label: string }> = {
      'low': { color: 'bg-green-100 text-green-800', label: 'Baixa' },
      'medium': { color: 'bg-yellow-100 text-yellow-800', label: 'Média' },
      'high': { color: 'bg-red-100 text-red-800', label: 'Alta' },
      'critical': { color: 'bg-red-100 text-red-800', label: 'Crítica' },
    };

    const config = severityMap[severity] || { color: 'bg-gray-100 text-gray-800', label: severity };

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const exportLogs = () => {
    toast({
      title: "Exportando logs",
      description: "O download será iniciado em breve...",
    });
  };

  return (
    <div className="space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Ações Admin (30d)</p>
                <p className="text-2xl font-bold">{auditLogs?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <User className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Solicitações LGPD</p>
                <p className="text-2xl font-bold">{gdprQueue?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Dados Anônimos</p>
                <p className="text-2xl font-bold">{gdprQueue?.filter(g => g.status === 'PROCESSED').length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Alertas de Segurança</p>
                <p className="text-2xl font-bold">{securityAlerts.filter(a => !a.resolved).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="audit">
        <TabsList>
          <TabsTrigger value="audit">Logs de Auditoria</TabsTrigger>
          <TabsTrigger value="gdpr">Conformidade LGPD</TabsTrigger>
          <TabsTrigger value="security">Alertas de Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4 items-end">
                <div className="space-y-2 flex-1">
                  <Label>Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por ação, tabela ou motivo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Período</Label>
                  <DatePickerWithRange
                    date={dateRange}
                    onDateChange={setDateRange}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ação</Label>
                  <select 
                    value={selectedAction} 
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="all">Todas</option>
                    <option value="CREATE">Criar</option>
                    <option value="UPDATE">Atualizar</option>
                    <option value="DELETE">Excluir</option>
                    <option value="SUSPEND">Suspender</option>
                    <option value="VIEW_REPORTS">Visualizar</option>
                  </select>
                </div>
                <Button onClick={exportLogs}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Audit Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Registro de Ações Administrativas</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingLogs ? (
                <div className="animate-pulse">Carregando logs...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ação</TableHead>
                      <TableHead>Tabela/Recurso</TableHead>
                      <TableHead>ID do Alvo</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell>{log.target_table}</TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{log.target_id}</span>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">{log.reason}</div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{log.ip_address}</span>
                        </TableCell>
                        <TableCell>
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Detalhes da Ação</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Ação</Label>
                                    <p>{log.action}</p>
                                  </div>
                                  <div>
                                    <Label>Tabela</Label>
                                    <p>{log.target_table}</p>
                                  </div>
                                  <div>
                                    <Label>IP</Label>
                                    <p className="font-mono">{log.ip_address}</p>
                                  </div>
                                  <div>
                                    <Label>Data/Hora</Label>
                                    <p>{new Date(log.created_at).toLocaleString('pt-BR')}</p>
                                  </div>
                                </div>
                                <div>
                                  <Label>Motivo</Label>
                                  <p>{log.reason}</p>
                                </div>
                                <div>
                                  <Label>User Agent</Label>
                                  <p className="text-sm font-mono bg-muted p-2 rounded">{log.user_agent}</p>
                                </div>
                                {log.diff && (
                                  <div>
                                    <Label>Mudanças (diff)</Label>
                                    <pre className="text-sm bg-muted p-2 rounded overflow-auto">
                                      {JSON.stringify(log.diff, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gdpr" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Solicitações de Exclusão/Anonimização (LGPD)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingGDPR ? (
                <div className="animate-pulse">Carregando dados LGPD...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Solicitado em</TableHead>
                      <TableHead>Processar após</TableHead>
                      <TableHead>Processado em</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gdprQueue?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <span className="font-mono text-sm">{item.user_id}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.erasure_type}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          {new Date(item.requested_at).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {new Date(item.process_after).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {item.processed_at ? new Date(item.processed_at).toLocaleString('pt-BR') : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">{item.reason}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alertas de Segurança</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Severidade</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {securityAlerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>
                        <Badge variant="outline">{alert.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">{alert.description}</div>
                      </TableCell>
                      <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                      <TableCell>
                        {new Date(alert.timestamp).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        {alert.resolved ? (
                          <Badge className="bg-green-100 text-green-800">Resolvido</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!alert.resolved && (
                            <Button size="sm">
                              Resolver
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}