import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Shield, ShieldAlert, Bell, BellOff, Wifi, WifiOff } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { useAuth } from '@/contexts/AuthContext';

export const SecurityStatusBadge = () => {
  const { user } = useAuth();
  const { 
    isSupported: pushSupported, 
    isSubscribed: pushSubscribed, 
    subscribe: subscribeToPush, 
    unsubscribe: unsubscribeFromPush 
  } = usePushNotifications();
  
  const { 
    isOnline, 
    syncInProgress, 
    pendingActionsCount,
    syncPendingActions 
  } = useOfflineStorage();

  const [securityLevel, setSecurityLevel] = useState<'high' | 'medium' | 'low'>('high');

  useEffect(() => {
    // Calculate security level based on various factors
    let level: 'high' | 'medium' | 'low' = 'high';
    
    if (!pushSubscribed && pushSupported) {
      level = 'medium';
    }
    
    if (!isOnline && pendingActionsCount > 0) {
      level = 'medium';
    }
    
    setSecurityLevel(level);
  }, [pushSubscribed, pushSupported, isOnline, pendingActionsCount]);

  const getSecurityColor = () => {
    switch (securityLevel) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'destructive';
      default: return 'default';
    }
  };

  const getSecurityIcon = () => {
    switch (securityLevel) {
      case 'high': return <Shield className="h-3 w-3" />;
      case 'medium': return <ShieldAlert className="h-3 w-3" />;
      case 'low': return <ShieldAlert className="h-3 w-3" />;
      default: return <Shield className="h-3 w-3" />;
    }
  };

  const handlePushToggle = async () => {
    if (pushSubscribed) {
      await unsubscribeFromPush();
    } else {
      await subscribeToPush();
    }
  };

  if (!user) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Badge 
          variant={getSecurityColor()}
          className="cursor-pointer flex items-center gap-1 hover:opacity-80 transition-opacity"
        >
          {getSecurityIcon()}
          Segurança
        </Badge>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Status de Segurança
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Security Level */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                {getSecurityIcon()}
                Nível de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {securityLevel === 'high' && 'Excelente'}
                  {securityLevel === 'medium' && 'Bom'}
                  {securityLevel === 'low' && 'Precisa de atenção'}
                </span>
                <Badge variant={getSecurityColor()}>
                  {securityLevel.toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Push Notifications */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                {pushSubscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                Notificações Push
              </CardTitle>
              <CardDescription className="text-xs">
                Receba atualizações sobre seus pedidos em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {pushSupported ? (pushSubscribed ? 'Ativado' : 'Desativado') : 'Não suportado'}
              </span>
              {pushSupported && (
                <Button
                  size="sm"
                  variant={pushSubscribed ? "secondary" : "default"}
                  onClick={handlePushToggle}
                >
                  {pushSubscribed ? 'Desativar' : 'Ativar'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Offline Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                Status de Conexão
              </CardTitle>
              <CardDescription className="text-xs">
                Funciona mesmo quando você está offline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                  <Badge variant={isOnline ? 'default' : 'secondary'}>
                    {isOnline ? 'Conectado' : 'Desconectado'}
                  </Badge>
                </div>
                
                {pendingActionsCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {pendingActionsCount} ações pendentes
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={syncPendingActions}
                      disabled={!isOnline || syncInProgress}
                    >
                      {syncInProgress ? 'Sincronizando...' : 'Sincronizar'}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Security Tips */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Dicas de Segurança</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Mantenha as notificações ativadas</li>
                <li>• Verifique sempre os detalhes do pedido</li>
                <li>• Use conexão segura (HTTPS)</li>
                <li>• Não compartilhe dados pessoais no chat</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};