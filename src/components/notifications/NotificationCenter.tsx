import React, { useState } from 'react';
import { Bell, Settings, Volume2, VolumeX, Filter, CheckCheck, Package, MapPin, CreditCard, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { VoiceAssistant } from './VoiceAssistant';

type NotificationFilter = 'all' | 'unread' | 'orders' | 'delivery' | 'system';

const notificationCategories = {
  order: { label: 'Pedidos', color: 'bg-blue-500' },
  delivery: { label: 'Entrega', color: 'bg-green-500' },
  payment: { label: 'Pagamento', color: 'bg-yellow-500' },
  system: { label: 'Sistema', color: 'bg-gray-500' },
  promotion: { label: 'Promoção', color: 'bg-purple-500' }
};

export default function NotificationCenter() {
  const { toast } = useToast();
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { 
    isSupported, 
    isSubscribed, 
    subscribe, 
    unsubscribe, 
    sendTestNotification 
  } = usePushNotifications();
  
  const [isOpen, setIsOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>('all');

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    
    const type = notification.type?.toLowerCase() || 'system';
    if (filter === 'orders') return type.includes('order') || type.includes('pedido');
    if (filter === 'delivery') return type.includes('delivery') || type.includes('entrega');
    if (filter === 'system') return type.includes('system') || type.includes('sistema');
    
    return true;
  });

  const getNotificationCategory = (type: string) => {
    const lowerType = type?.toLowerCase() || 'system';
    if (lowerType.includes('order') || lowerType.includes('pedido')) return 'order';
    if (lowerType.includes('delivery') || lowerType.includes('entrega')) return 'delivery';
    if (lowerType.includes('payment') || lowerType.includes('pagamento')) return 'payment';
    if (lowerType.includes('promotion') || lowerType.includes('promo')) return 'promotion';
    return 'system';
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_confirmed':
      case 'order_update':
        return <Package className="w-4 h-4" />;
      case 'payment':
        return <CreditCard className="w-4 h-4" />;
      case 'delivery':
        return <MapPin className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const handleNotificationClick = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const togglePushNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const playNotificationSound = () => {
    if (soundEnabled && 'Audio' in window) {
      const audio = new Audio('/notification-sound.mp3');
      audio.play().catch(() => {
        console.log('🔔 Nova notificação!');
      });
    }
  };

  return (
    <>
      {/* Voice Assistant - Hidden by default, only shows when needed */}
      <VoiceAssistant />
      
      {/* Notification Bell */}
      <div className="relative">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="relative bg-background/80 backdrop-blur-sm border-border/50"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          
          <SheetContent className="w-full sm:w-96">
            <SheetHeader className="flex flex-row items-center justify-between">
              <SheetTitle>Notificações</SheetTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                  >
                    Marcar todas como lidas
                  </Button>
                )}
              </div>
            </SheetHeader>

            {/* Filter Bar */}
            <div className="flex items-center gap-2 mt-4">
              <Filter className="h-4 w-4" />
              <Select value={filter} onValueChange={(value: NotificationFilter) => setFilter(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filtrar notificações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="unread">Não lidas</SelectItem>
                  <SelectItem value="orders">Pedidos</SelectItem>
                  <SelectItem value="delivery">Entrega</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showSettings && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-sm">Configurações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isSupported && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Push Notifications</span>
                      <Switch
                        checked={isSubscribed}
                        onCheckedChange={togglePushNotifications}
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Assistente de Voz</span>
                    <Switch
                      checked={voiceEnabled}
                      onCheckedChange={setVoiceEnabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Sons de Notificação</span>
                    <Switch
                      checked={soundEnabled}
                      onCheckedChange={setSoundEnabled}
                    />
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={sendTestNotification}
                    className="w-full"
                  >
                    Testar Notificação
                  </Button>
                </CardContent>
              </Card>
            )}

            <ScrollArea className="h-[calc(100vh-280px)] mt-4">
              {filteredNotifications.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {filter === 'all' ? 'Nenhuma notificação' : `Nenhuma notificação de ${filter}`}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotifications.map((notification) => {
                    const category = getNotificationCategory(notification.type);
                    const categoryInfo = notificationCategories[category];
                    
                    return (
                      <Card 
                        key={notification.id}
                        className={`cursor-pointer transition-all duration-200 hover:bg-accent hover:shadow-md ${
                          !notification.read ? 'border-primary shadow-sm' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex gap-3 flex-1">
                              <div className={`w-2 h-2 rounded-full mt-2 ${categoryInfo.color}`} />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-sm">{notification.title}</h4>
                                  <Badge variant="secondary" className="text-xs">
                                    {categoryInfo.label}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {notification.message}
                                </p>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(notification.created_at).toLocaleString('pt-BR')}
                                </span>
                              </div>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}