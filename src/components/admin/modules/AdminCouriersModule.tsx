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
import { Search, CheckCircle, XCircle, Clock, AlertTriangle, FileText, Bike, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Courier {
  id: string;
  full_name: string;
  phone: string;
  cpf: string;
  birth_date: string;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  plate: string;
  vehicle_brand: string;
  vehicle_model: string;
  created_at: string;
  submitted_at: string;
  approved_at: string;
  rejection_reason?: string;
  suspended_reason?: string;
  courier_documents: Array<{
    id: string;
    type: string;
    verified: boolean;
    file_url: string;
  }>;
}

export default function AdminCouriersModule() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('UNDER_REVIEW');
  const [actionDialog, setActionDialog] = useState<{ open: boolean; courier?: Courier; action?: 'approve' | 'reject' | 'suspend' }>({ open: false });
  const [reason, setReason] = useState('');
  const { toast } = useToast();

  const { data: couriers, isLoading, refetch } = useQuery({
    queryKey: ['admin-couriers', searchTerm, selectedStatus],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('courier-admin-pending', {
        method: 'GET',
        body: {
          search: searchTerm,
          status: selectedStatus === 'all' ? undefined : selectedStatus,
          page: 1,
          limit: 50
        }
      });

      if (error) throw error;
      return data.couriers as Courier[];
    },
  });

  const handleCourierAction = async () => {
    if (!actionDialog.courier || !actionDialog.action) return;

    try {
      let functionName = '';
      let body: any = { courier_id: actionDialog.courier.id };

      switch (actionDialog.action) {
        case 'approve':
          functionName = 'courier-admin-approve';
          if (reason) body.notes = reason;
          break;
        case 'reject':
          functionName = 'courier-admin-reject';
          body.reason = reason;
          break;
        case 'suspend':
          functionName = 'courier-admin-suspend';
          body.reason = reason;
          break;
      }

      const { error } = await supabase.functions.invoke(functionName, {
        method: 'POST',
        body
      });

      if (error) throw error;

      toast({
        title: "Ação realizada com sucesso",
        description: `Courier ${actionDialog.action === 'approve' ? 'aprovado' : actionDialog.action === 'reject' ? 'rejeitado' : 'suspenso'} com sucesso.`,
      });

      setActionDialog({ open: false });
      setReason('');
      refetch();
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
      DRAFT: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Rascunho' },
      UNDER_REVIEW: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Em Análise' },
      APPROVED: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Aprovado' },
      REJECTED: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejeitado' },
      SUSPENDED: { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle, label: 'Suspenso' },
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

  const getDocumentCompleteness = (documents: any[]) => {
    const requiredDocs = ['CNH', 'CRLV', 'SELFIE'];
    const providedDocs = documents.map(d => d.type);
    const completeness = (providedDocs.filter(doc => requiredDocs.includes(doc)).length / requiredDocs.length) * 100;
    return Math.round(completeness);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">Carregando...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Bike className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{couriers?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Em Análise</p>
                <p className="text-2xl font-bold">{couriers?.filter(c => c.status === 'UNDER_REVIEW').length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Aprovados</p>
                <p className="text-2xl font-bold">{couriers?.filter(c => c.status === 'APPROVED').length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Rejeitados</p>
                <p className="text-2xl font-bold">{couriers?.filter(c => c.status === 'REJECTED').length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Suspensos</p>
                <p className="text-2xl font-bold">{couriers?.filter(c => c.status === 'SUSPENDED').length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF ou placa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
              <TabsList>
                <TabsTrigger value="UNDER_REVIEW">Em Análise</TabsTrigger>
                <TabsTrigger value="APPROVED">Aprovados</TabsTrigger>
                <TabsTrigger value="REJECTED">Rejeitados</TabsTrigger>
                <TabsTrigger value="SUSPENDED">Suspensos</TabsTrigger>
                <TabsTrigger value="all">Todos</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Couriers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Motoboys Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Courier</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Documentos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submissão</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {couriers?.map((courier) => (
                <TableRow key={courier.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{courier.full_name}</div>
                      <div className="text-sm text-muted-foreground">{courier.phone}</div>
                      <div className="text-sm text-muted-foreground">CPF: {courier.cpf}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{courier.vehicle_brand} {courier.vehicle_model}</div>
                      <div className="text-sm text-muted-foreground">Placa: {courier.plate}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${getDocumentCompleteness(courier.courier_documents)}%` }}
                        />
                      </div>
                      <span className="text-sm">{getDocumentCompleteness(courier.courier_documents)}%</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {courier.courier_documents.length} documentos
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(courier.status)}</TableCell>
                  <TableCell>
                    {courier.submitted_at ? new Date(courier.submitted_at).toLocaleDateString('pt-BR') : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {courier.status === 'UNDER_REVIEW' && (
                        <>
                          <Dialog open={actionDialog.open && actionDialog.courier?.id === courier.id && actionDialog.action === 'approve'} onOpenChange={(open) => !open && setActionDialog({ open: false })}>
                            <DialogTrigger asChild>
                              <Button size="sm" onClick={() => setActionDialog({ open: true, courier, action: 'approve' })}>
                                Aprovar
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Aprovar Courier</DialogTitle>
                                <DialogDescription>
                                  Aprovar o cadastro de {courier.full_name}?
                                </DialogDescription>
                              </DialogHeader>
                              <Textarea
                                placeholder="Notas sobre a aprovação (opcional)"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                              />
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setActionDialog({ open: false })}>
                                  Cancelar
                                </Button>
                                <Button onClick={handleCourierAction}>
                                  Aprovar
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Dialog open={actionDialog.open && actionDialog.courier?.id === courier.id && actionDialog.action === 'reject'} onOpenChange={(open) => !open && setActionDialog({ open: false })}>
                            <DialogTrigger asChild>
                              <Button variant="destructive" size="sm" onClick={() => setActionDialog({ open: true, courier, action: 'reject' })}>
                                Rejeitar
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Rejeitar Courier</DialogTitle>
                                <DialogDescription>
                                  Rejeitar o cadastro de {courier.full_name}?
                                </DialogDescription>
                              </DialogHeader>
                              <Textarea
                                placeholder="Motivo da rejeição (obrigatório)"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                required
                              />
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setActionDialog({ open: false })}>
                                  Cancelar
                                </Button>
                                <Button variant="destructive" onClick={handleCourierAction} disabled={!reason.trim()}>
                                  Rejeitar
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}

                      {courier.status === 'APPROVED' && (
                        <Dialog open={actionDialog.open && actionDialog.courier?.id === courier.id && actionDialog.action === 'suspend'} onOpenChange={(open) => !open && setActionDialog({ open: false })}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setActionDialog({ open: true, courier, action: 'suspend' })}>
                              Suspender
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Suspender Courier</DialogTitle>
                              <DialogDescription>
                                Suspender {courier.full_name}?
                              </DialogDescription>
                            </DialogHeader>
                            <Textarea
                              placeholder="Motivo da suspensão (obrigatório)"
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              required
                            />
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setActionDialog({ open: false })}>
                                Cancelar
                              </Button>
                              <Button variant="destructive" onClick={handleCourierAction} disabled={!reason.trim()}>
                                Suspender
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}