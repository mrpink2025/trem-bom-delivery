import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Bell, Check, X, Settings, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: string;
}

interface NotificationSettings {
  orders: boolean;
  promotions: boolean;
  system: boolean;
  email: boolean;
  push: boolean;
}

const RealtimeNotificationCenter = React.memo(() => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'orders' | 'system'>('all');
  const [settings, setSettings] = useState<NotificationSettings>({
    orders: true,
    promotions: true,
    system: true,
    email: false,
    push: true
  });

  // Use realtime notifications hook
  const { sendTestNotification, isConnected } = useRealtimeNotifications({
    onNewNotification: useCallback((notification: any) => {
      console.log('🔔 New notification received in center:', notification);
      setNotifications(prev => [notification, ...prev]);
    }, []),
    autoToast: false // We'll handle toasts manually here
  });

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Erro ao carregar notificações",
        description: "Não foi possível carregar as notificações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId
            ? { ...notif, read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );

      toast({
        title: "Todas as notificações foram marcadas como lidas",
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [user, toast]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.filter(notif => notif.id !== notificationId)
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  // Get notification icon based on type
  const getNotificationIcon = useCallback((type: string) => {
    switch (type) {
      case 'order_status_update':
        return '📦';
      case 'delivery_update':
        return '🚚';
      case 'payment_confirmed':
        return '💳';
      case 'restaurant_approved':
        return '🎉';
      case 'promotion':
        return '🎁';
      case 'system':
        return '⚙️';
      default:
        return '🔔';
    }
  }, []);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    switch (filter) {
      case 'unread':
        filtered = notifications.filter(n => !n.read);
        break;
      case 'orders':
        filtered = notifications.filter(n => 
          n.type.includes('order') || n.type.includes('delivery')
        );
        break;
      case 'system':
        filtered = notifications.filter(n => 
          n.type === 'system' || n.type === 'restaurant_approved'
        );
        break;
      default:
        break;
    }

    return filtered;
  }, [notifications, filter]);

  // Count unread notifications
  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.read).length
  , [notifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs p-0"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent side="right" className="w-96 p-0">
        <SheetHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Notificações</span>
              {isConnected && (
                <div className="w-2 h-2 bg-green-500 rounded-full" title="Conectado ao tempo real" />
              )}
            </SheetTitle>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={sendTestNotification}>
                Teste
              </Button>
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <Check className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="p-6 pt-4 space-y-4">
          {/* Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="unread">Não lidas</SelectItem>
                <SelectItem value="orders">Pedidos</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Notifications List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center text-muted-foreground py-8">
                Carregando notificações...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma notificação encontrada</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`cursor-pointer transition-colors ${
                    notification.read ? 'opacity-75' : 'border-primary/20 bg-primary/5'
                  }`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <span className="text-lg">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-sm truncate">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(notification.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <Separator />

          {/* Settings */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Configurações</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs">Notificações de Pedidos</span>
                <Switch
                  checked={settings.orders}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, orders: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Promoções</span>
                <Switch
                  checked={settings.promotions}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, promotions: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Sistema</span>
                <Switch
                  checked={settings.system}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, system: checked }))
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
});

RealtimeNotificationCenter.displayName = 'RealtimeNotificationCenter';

export default RealtimeNotificationCenter;