import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Search, UserX, Shield, RotateCcw, Trash2, LogOut, Edit } from 'lucide-react';
import { useAdminPanel } from '@/hooks/useAdminPanel';
import { LoadingScreen } from '@/components/ui/loading-screen';

interface ActionDialogProps {
  action: string;
  userId: string;
  userName: string;
  onConfirm: (reason: string, extra?: any) => void;
  trigger: React.ReactNode;
}

function ActionDialog({ action, userId, userName, onConfirm, trigger }: ActionDialogProps) {
  const [reason, setReason] = useState('');
  const [extra, setExtra] = useState<any>({});

  const getActionConfig = () => {
    switch (action) {
      case 'suspend':
        return {
          title: 'Suspender Usuário',
          description: `Tem certeza que deseja suspender ${userName}?`,
          fields: (
            <div className="space-y-4">
              <div>
                <Label htmlFor="reason">Motivo da suspensão</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Descreva o motivo da suspensão..."
                />
              </div>
              <div>
                <Label htmlFor="duration">Duração</Label>
                <Select onValueChange={(value) => setExtra({ ...extra, duration: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a duração" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 hora</SelectItem>
                    <SelectItem value="24h">24 horas</SelectItem>
                    <SelectItem value="7d">7 dias</SelectItem>
                    <SelectItem value="30d">30 dias</SelectItem>
                    <SelectItem value="permanent">Permanente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )
        };
      case 'ban':
        return {
          title: 'Banir Usuário',
          description: `Tem certeza que deseja banir permanentemente ${userName}?`,
          fields: (
            <div>
              <Label htmlFor="reason">Motivo do banimento</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Descreva o motivo do banimento..."
              />
            </div>
          )
        };
      case 'delete':
        return {
          title: 'Excluir Usuário',
          description: `Selecione o tipo de exclusão para ${userName}:`,
          fields: (
            <div className="space-y-4">
              <div>
                <Label htmlFor="reason">Motivo da exclusão</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Descreva o motivo da exclusão..."
                />
              </div>
              <div>
                <Label htmlFor="type">Tipo de exclusão</Label>
                <Select onValueChange={(value) => setExtra({ ...extra, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SOFT">Soft Delete (desativar conta)</SelectItem>
                    <SelectItem value="ANON">Anonimizar (LGPD)</SelectItem>
                    <SelectItem value="HARD">Exclusão Permanente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )
        };
      default:
        return {
          title: 'Confirmar Ação',
          description: `Tem certeza que deseja executar esta ação em ${userName}?`,
          fields: (
            <div>
              <Label htmlFor="reason">Motivo</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Descreva o motivo..."
              />
            </div>
          )
        };
    }
  };

  const config = getActionConfig();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{config.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {config.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          {config.fields}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(reason, extra)}
            disabled={!reason.trim()}
          >
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function AdminUsersModule() {
  const { 
    users, 
    isLoadingUsers, 
    suspendUser, 
    banUser, 
    restoreUser, 
    deleteUser, 
    forceLogoutUser,
    isProcessingUserAction,
    currentAdminRole 
  } = useAdminPanel();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');

  if (isLoadingUsers) {
    return <LoadingScreen message="Carregando usuários..." />;
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === '' || 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery);
    
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    
    return matchesSearch && matchesRole;
  });

  const getUserStatus = (user: any) => {
    const activeSuspension = user.user_suspensions?.find((s: any) => s.is_active);
    if (activeSuspension) {
      return { status: activeSuspension.type, variant: 'destructive' as const };
    }
    return { status: 'ATIVO', variant: 'default' as const };
  };

  const handleSuspendUser = async (reason: string, extra: any) => {
    // This will be handled by the dialog's userId prop
  };

  const handleDeleteUser = async (reason: string, extra: any) => {
    // This will be handled by the dialog's userId prop
  };

  const getDurationMs = (duration: string) => {
    switch (duration) {
      case '1h': return 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      default: return 0;
    }
  };

  const canPerformAction = (action: string) => {
    switch (action) {
      case 'suspend':
      case 'ban':
      case 'delete':
        return ['SUPERADMIN', 'ADMIN'].includes(currentAdminRole || '');
      case 'force_logout':
        return ['SUPERADMIN', 'ADMIN', 'SUPPORT'].includes(currentAdminRole || '');
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por papel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os papéis</SelectItem>
                <SelectItem value="client">Cliente</SelectItem>
                <SelectItem value="seller">Lojista</SelectItem>
                <SelectItem value="courier">Courier</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuários ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const userStatus = getUserStatus(user);
                
                return (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">
                      {user.full_name || 'Nome não informado'}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role}</Badge>
                      {user.admin_users?.[0] && (
                        <Badge variant="secondary" className="ml-1">
                          {user.admin_users[0].role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={userStatus.variant}>
                        {userStatus.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {canPerformAction('force_logout') && (
                          <ActionDialog
                            action="force_logout"
                            userId={user.user_id}
                            userName={user.full_name}
                            onConfirm={(reason) => forceLogoutUser(user.user_id, reason)}
                            trigger={
                              <Button variant="outline" size="sm" disabled={isProcessingUserAction}>
                                <LogOut className="h-3 w-3" />
                              </Button>
                            }
                          />
                        )}
                        
                        {userStatus.status === 'ATIVO' && canPerformAction('suspend') && (
                          <ActionDialog
                            action="suspend"
                            userId={user.user_id}
                            userName={user.full_name}
                            onConfirm={async (reason, extra) => {
                              const endsAt = extra.duration === 'permanent' ? undefined : 
                                new Date(Date.now() + getDurationMs(extra.duration)).toISOString();
                              await suspendUser(user.user_id, reason, endsAt);
                            }}
                            trigger={
                              <Button variant="outline" size="sm" disabled={isProcessingUserAction}>
                                <UserX className="h-3 w-3" />
                              </Button>
                            }
                          />
                        )}

                        {userStatus.status !== 'ATIVO' && canPerformAction('suspend') && (
                          <ActionDialog
                            action="restore"
                            userId={user.user_id}
                            userName={user.full_name}
                            onConfirm={(reason) => restoreUser(user.user_id, reason)}
                            trigger={
                              <Button variant="outline" size="sm" disabled={isProcessingUserAction}>
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            }
                          />
                        )}

                        {canPerformAction('ban') && (
                          <ActionDialog
                            action="ban"
                            userId={user.user_id}
                            userName={user.full_name}
                            onConfirm={(reason) => banUser(user.user_id, reason)}
                            trigger={
                              <Button variant="outline" size="sm" disabled={isProcessingUserAction}>
                                <Shield className="h-3 w-3" />
                              </Button>
                            }
                          />
                        )}

                        {canPerformAction('delete') && (
                          <ActionDialog
                            action="delete"
                            userId={user.user_id}
                            userName={user.full_name}
                            onConfirm={async (reason, extra) => {
                              await deleteUser(user.user_id, reason, extra.type || 'SOFT');
                            }}
                            trigger={
                              <Button variant="destructive" size="sm" disabled={isProcessingUserAction}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            }
                          />
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
    </div>
  );
}