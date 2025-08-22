import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Search, CheckCircle, XCircle, Clock, AlertTriangle, FileText, Store, Users, ThumbsUp, ThumbsDown, Ban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useStoreAdmin } from '@/hooks/useStoreAdmin';
import { format } from 'date-fns';

interface Restaurant {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  owner_id: string;
  profiles: {
    full_name: string | null;
  } | null;
}

export default function AdminMerchantsModule() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [rejectionReason, setRejectionReason] = useState('');
  const [suspensionReason, setSuspensionReason] = useState('');
  const { toast } = useToast();
  
  // Use the store admin hook for pending approvals
  const { pendingStores, loadingPending, actions, isProcessing } = useStoreAdmin();

  const { data: restaurants, isLoading, refetch } = useQuery({
    queryKey: ['admin-restaurants', searchTerm, selectedStatus],
    queryFn: async () => {
      let query = supabase
        .from('restaurants')
        .select(`
          id,
          name,
          is_active,
          created_at,
          owner_id
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      if (selectedStatus !== 'all') {
        query = query.eq('is_active', selectedStatus === 'active');
      }

      const { data: restaurantsData, error } = await query;
      if (error) throw error;

      // Fetch owner profiles separately
      const restaurantsWithProfiles = await Promise.all(
        (restaurantsData || []).map(async (restaurant) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', restaurant.owner_id)
            .maybeSingle();
          
          return {
            ...restaurant,
            profiles: profile
          };
        })
      );

      return restaurantsWithProfiles as Restaurant[];
    },
  });

  const handleToggleStatus = async (restaurantId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ is_active: !currentStatus })
        .eq('id', restaurantId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Loja ${!currentStatus ? 'ativada' : 'desativada'} com sucesso.`,
      });

      refetch();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: error.message,
      });
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Ativa
      </Badge>
    ) : (
      <Badge variant="secondary">
        <XCircle className="w-3 h-3 mr-1" />
        Inativa
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Lojistas</h1>
          <p className="text-muted-foreground">Módulo de aprovação KYB e gestão de lojistas</p>
        </div>
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
      <div>
        <h1 className="text-3xl font-bold">Gestão de Lojistas</h1>
        <p className="text-muted-foreground">
          Módulo de aprovação KYB e gestão de lojistas
        </p>
      </div>

      {/* Pending Approvals Section */}
      {loadingPending ? (
        <div className="text-center py-8">
          <p>Carregando aprovações pendentes...</p>
        </div>
      ) : pendingStores && pendingStores.length > 0 ? (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Clock className="h-5 w-5" />
              Aprovações Pendentes ({pendingStores.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Loja</TableHead>
                  <TableHead>Proprietário</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingStores.map((store: any) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">
                      {store.name}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{store.profiles?.full_name || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">{store.profiles?.email || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(store.created_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => actions.approve(store.id)}
                          disabled={isProcessing}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              disabled={isProcessing}
                            >
                              <ThumbsDown className="h-4 w-4 mr-1" />
                              Rejeitar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Rejeitar Loja</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p>Informe o motivo da rejeição:</p>
                              <Textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Ex: Documentação incompleta, dados incorretos..."
                              />
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setRejectionReason('')}>
                                  Cancelar
                                </Button>
                                <Button 
                                  variant="destructive"
                                  onClick={() => {
                                    actions.reject(store.id, rejectionReason);
                                    setRejectionReason('');
                                  }}
                                  disabled={!rejectionReason.trim()}
                                >
                                  Rejeitar
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Store className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total de Lojas</p>
                <p className="text-2xl font-bold">{restaurants?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Ativas</p>
                <p className="text-2xl font-bold">{restaurants?.filter(r => r.is_active).length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Inativas</p>
                <p className="text-2xl font-bold">{restaurants?.filter(r => !r.is_active).length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Novos (30d)</p>
                <p className="text-2xl font-bold">
                  {restaurants?.filter(r => {
                    const createdAt = new Date(r.created_at);
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    return createdAt > thirtyDaysAgo;
                  }).length || 0}
                </p>
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
                placeholder="Buscar por nome, email ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
              <TabsList>
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="active">Ativas</TabsTrigger>
                <TabsTrigger value="inactive">Inativas</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Restaurants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lojistas Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loja</TableHead>
                <TableHead>Proprietário</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restaurants?.map((restaurant) => (
                <TableRow key={restaurant.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{restaurant.name}</div>
                      <div className="text-sm text-muted-foreground">ID: {restaurant.id.slice(0, 8)}...</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{restaurant.profiles?.full_name || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">Owner ID: {restaurant.owner_id.slice(0, 8)}...</div>
                    </div>
                  </TableCell>
                  <TableCell>N/A</TableCell>
                  <TableCell>N/A</TableCell>
                  <TableCell>{getStatusBadge(restaurant.is_active)}</TableCell>
                  <TableCell>{new Date(restaurant.created_at).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant={restaurant.is_active ? "destructive" : "default"}
                            size="sm"
                          >
                            {restaurant.is_active ? 'Desativar' : 'Ativar'}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {restaurant.is_active ? 'Desativar' : 'Ativar'} Loja
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja {restaurant.is_active ? 'desativar' : 'ativar'} a loja "{restaurant.name}"?
                              {restaurant.is_active && " Esta ação impedirá novos pedidos."}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleToggleStatus(restaurant.id, restaurant.is_active)}
                            >
                              Confirmar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      {restaurant.is_active && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Suspender Loja</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p>Informe o motivo da suspensão:</p>
                              <Textarea
                                value={suspensionReason}
                                onChange={(e) => setSuspensionReason(e.target.value)}
                                placeholder="Ex: Violação dos termos, qualidade inadequada..."
                              />
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setSuspensionReason('')}>
                                  Cancelar
                                </Button>
                                <Button 
                                  variant="destructive"
                                  onClick={() => {
                                    actions.suspend(restaurant.id, suspensionReason);
                                    setSuspensionReason('');
                                  }}
                                  disabled={!suspensionReason.trim()}
                                >
                                  Suspender
                                </Button>
                              </div>
                            </div>
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