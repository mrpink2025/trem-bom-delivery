import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Search, AlertTriangle, MessageCircle, Flag, Shield, Eye, Ban, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Report {
  id: string;
  type: 'user' | 'order' | 'review' | 'chat';
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  created_at: string;
  reporter_id: string;
  target_id: string;
  reporter?: {
    full_name: string;
    email: string;
  };
}

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  room_id: string;
  created_at: string;
  flagged: boolean;
  sender?: {
    full_name: string;
  };
}

export default function AdminModerationModule() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [actionDialog, setActionDialog] = useState<{ open: boolean; report?: Report; action?: 'resolve' | 'dismiss' }>({ open: false });
  const [resolution, setResolution] = useState('');
  const { toast } = useToast();

  // Mock data for reports
  const mockReports: Report[] = [
    {
      id: '1',
      type: 'user',
      status: 'pending',
      severity: 'high',
      description: 'Usuário utilizando linguagem ofensiva durante entrega',
      created_at: new Date().toISOString(),
      reporter_id: 'user1',
      target_id: 'user2',
      reporter: { full_name: 'João Silva', email: 'joao@email.com' }
    },
    {
      id: '2',
      type: 'chat',
      status: 'investigating',
      severity: 'medium',
      description: 'Mensagens inadequadas no chat do pedido',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      reporter_id: 'user3',
      target_id: 'chat1',
      reporter: { full_name: 'Maria Santos', email: 'maria@email.com' }
    },
    {
      id: '3',
      type: 'review',
      status: 'resolved',
      severity: 'low',
      description: 'Avaliação falsa sobre restaurante',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      reporter_id: 'user4',
      target_id: 'review1',
      reporter: { full_name: 'Pedro Costa', email: 'pedro@email.com' }
    }
  ];

  // Mock data for flagged messages
  const mockFlaggedMessages: ChatMessage[] = [
    {
      id: '1',
      content: 'Mensagem com conteúdo inapropriado que foi reportada...',
      sender_id: 'user1',
      room_id: 'room1',
      created_at: new Date().toISOString(),
      flagged: true,
      sender: { full_name: 'João Silva' }
    },
    {
      id: '2',
      content: 'Outra mensagem que precisa de moderação...',
      sender_id: 'user2',
      room_id: 'room2',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      flagged: true,
      sender: { full_name: 'Maria Santos' }
    }
  ];

  const reports = mockReports.filter(report => {
    const matchesSearch = searchTerm === '' || 
      report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reporter?.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || report.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleReportAction = async () => {
    if (!actionDialog.report || !actionDialog.action) return;

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Ação realizada com sucesso",
        description: `Relatório ${actionDialog.action === 'resolve' ? 'resolvido' : 'descartado'} com sucesso.`,
      });

      setActionDialog({ open: false });
      setResolution('');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao realizar ação",
        description: error.message,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pendente' },
      investigating: { color: 'bg-blue-100 text-blue-800', icon: Search, label: 'Investigando' },
      resolved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Resolvido' },
      dismissed: { color: 'bg-gray-100 text-gray-800', icon: Ban, label: 'Descartado' },
    };

    const config = statusMap[status as keyof typeof statusMap];
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const severityMap = {
      low: { color: 'bg-green-100 text-green-800', label: 'Baixa' },
      medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Média' },
      high: { color: 'bg-orange-100 text-orange-800', label: 'Alta' },
      critical: { color: 'bg-red-100 text-red-800', label: 'Crítica' },
    };

    const config = severityMap[severity as keyof typeof severityMap];

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    const typeMap = {
      user: AlertTriangle,
      order: Flag,
      review: MessageCircle,
      chat: MessageCircle,
    };

    return typeMap[type as keyof typeof typeMap] || AlertTriangle;
  };

  return (
    <div className="space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Relatórios Pendentes</p>
                <p className="text-2xl font-bold">{reports.filter(r => r.status === 'pending').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Search className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Em Investigação</p>
                <p className="text-2xl font-bold">{reports.filter(r => r.status === 'investigating').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <MessageCircle className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Mensagens Flagadas</p>
                <p className="text-2xl font-bold">{mockFlaggedMessages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Taxa de Resolução</p>
                <p className="text-2xl font-bold">94%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
          <TabsTrigger value="chat">Chat Moderação</TabsTrigger>
          <TabsTrigger value="automation">Automação</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar relatórios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
                  <TabsList>
                    <TabsTrigger value="pending">Pendentes</TabsTrigger>
                    <TabsTrigger value="investigating">Investigando</TabsTrigger>
                    <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
                    <TabsTrigger value="all">Todos</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Reports Table */}
          <Card>
            <CardHeader>
              <CardTitle>Relatórios de Moderação</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Reportado por</TableHead>
                    <TableHead>Severidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => {
                    const TypeIcon = getTypeIcon(report.type);
                    return (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TypeIcon className="h-4 w-4" />
                            <span className="capitalize">{report.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">{report.description}</div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{report.reporter?.full_name}</div>
                            <div className="text-sm text-muted-foreground">{report.reporter?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getSeverityBadge(report.severity)}</TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell>{new Date(report.created_at).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(report.status === 'pending' || report.status === 'investigating') && (
                              <>
                                <Dialog open={actionDialog.open && actionDialog.report?.id === report.id && actionDialog.action === 'resolve'} onOpenChange={(open) => !open && setActionDialog({ open: false })}>
                                  <DialogTrigger asChild>
                                    <Button size="sm" onClick={() => setActionDialog({ open: true, report, action: 'resolve' })}>
                                      Resolver
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Resolver Relatório</DialogTitle>
                                      <DialogDescription>
                                        Resolver este relatório como solucionado?
                                      </DialogDescription>
                                    </DialogHeader>
                                    <Textarea
                                      placeholder="Descreva a resolução tomada..."
                                      value={resolution}
                                      onChange={(e) => setResolution(e.target.value)}
                                      required
                                    />
                                    <DialogFooter>
                                      <Button variant="outline" onClick={() => setActionDialog({ open: false })}>
                                        Cancelar
                                      </Button>
                                      <Button onClick={handleReportAction} disabled={!resolution.trim()}>
                                        Resolver
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>

                                <Dialog open={actionDialog.open && actionDialog.report?.id === report.id && actionDialog.action === 'dismiss'} onOpenChange={(open) => !open && setActionDialog({ open: false })}>
                                  <DialogTrigger asChild>
                                    <Button variant="destructive" size="sm" onClick={() => setActionDialog({ open: true, report, action: 'dismiss' })}>
                                      Descartar
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Descartar Relatório</DialogTitle>
                                      <DialogDescription>
                                        Descartar este relatório sem ação?
                                      </DialogDescription>
                                    </DialogHeader>
                                    <Textarea
                                      placeholder="Motivo do descarte..."
                                      value={resolution}
                                      onChange={(e) => setResolution(e.target.value)}
                                      required
                                    />
                                    <DialogFooter>
                                      <Button variant="outline" onClick={() => setActionDialog({ open: false })}>
                                        Cancelar
                                      </Button>
                                      <Button variant="destructive" onClick={handleReportAction} disabled={!resolution.trim()}>
                                        Descartar
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mensagens Flagadas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Remetente</TableHead>
                    <TableHead>Sala</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockFlaggedMessages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell>
                        <div className="max-w-xs truncate bg-red-50 p-2 rounded">
                          {message.content}
                        </div>
                      </TableCell>
                      <TableCell>{message.sender?.full_name}</TableCell>
                      <TableCell>{message.room_id}</TableCell>
                      <TableCell>{new Date(message.created_at).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm">
                            <Ban className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Regras de Moderação Automática</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Sistema de automação de moderação em construção...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}