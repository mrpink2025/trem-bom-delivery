import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DeliveryMap } from '@/components/map/DeliveryMap';
import { 
  Clock, 
  Package, 
  Truck, 
  CheckCircle, 
  MapPin, 
  MessageCircle, 
  Phone,
  RefreshCw,
  Filter,
  Eye,
  CreditCard,
  ChefHat,
  Timer,
  AlertTriangle,
  Shield,
  DollarSign,
  X,
  Check
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Order {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  estimated_delivery_time?: string;
  courier_id?: string | null;
  restaurant_id: string;
  user_id: string;
  items: any;
  delivery_address: any;
  restaurant_address?: any;
  restaurant_name?: string;
  courier_location?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
  status_updated_at?: string;
  restaurants?: any;
}

const ORDER_STATUSES = {
  pending_payment: { 
    label: 'Aguardando Pagamento', 
    icon: CreditCard, 
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', 
    progress: 10,
    description: 'Processando pagamento...'
  },
  confirmed: { 
    label: 'Confirmado', 
    icon: CheckCircle, 
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', 
    progress: 25,
    description: 'Pedido confirmado pelo restaurante'
  },
  preparing: { 
    label: 'Preparando', 
    icon: ChefHat, 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', 
    progress: 50,
    description: 'Sendo preparado na cozinha'
  },
  ready: { 
    label: 'Pronto', 
    icon: Package, 
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200', 
    progress: 65,
    description: 'Aguardando entregador'
  },
  courier_assigned: { 
    label: 'Entregador Designado', 
    icon: Truck, 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', 
    progress: 75,
    description: 'Entregador a caminho do restaurante'
  },
  picked_up: { 
    label: 'Coletado', 
    icon: Package, 
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', 
    progress: 85,
    description: 'Pedido coletado pelo entregador'
  },
  out_for_delivery: { 
    label: 'Saiu para Entrega', 
    icon: Truck, 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', 
    progress: 90,
    description: 'A caminho do seu endereço'
  },
  delivered: { 
    label: 'Entregue', 
    icon: CheckCircle, 
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', 
    progress: 100,
    description: 'Pedido entregue com sucesso'
  },
  cancelled: { 
    label: 'Cancelado', 
    icon: Clock, 
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', 
    progress: 0,
    description: 'Pedido cancelado'
  },
};

const STATUS_FILTERS = [
  { key: 'all', label: 'Todos', icon: RefreshCw },
  { key: 'active', label: 'Ativos', icon: Timer },
  { key: 'pending_payment', label: 'Pagamento', icon: CreditCard },
  { key: 'preparing', label: 'Preparando', icon: ChefHat },
  { key: 'out_for_delivery', label: 'Entrega', icon: Truck },
  { key: 'delivered', label: 'Entregues', icon: CheckCircle },
];

export function OrderStatusDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('active');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Carregar pedidos do usuário
  const fetchOrders = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          restaurants!inner (
            name,
            address
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Buscar localizações dos entregadores para pedidos ativos
      const activeOrders = ordersData?.filter(order => 
        ['courier_assigned', 'picked_up', 'out_for_delivery'].includes(order.status)
      ) || [];

      const ordersWithLocation = await Promise.all(
        (ordersData || []).map(async (order) => {
          let courierLocation = null;
          
          if (order.courier_id && activeOrders.some(o => o.id === order.id)) {
            try {
              const { data: locationData } = await supabase
                .from('courier_locations')
                .select('latitude, longitude, timestamp')
                .eq('courier_id', order.courier_id)
                .order('timestamp', { ascending: false })
                .limit(1)
                .single();
              
              courierLocation = locationData;
            } catch (err) {
              console.log('No location data for courier:', order.courier_id);
            }
          }

          return {
            ...order,
            restaurant_name: (Array.isArray(order.restaurants) && order.restaurants.length > 0) 
              ? order.restaurants[0].name 
              : 'Restaurante',
            restaurant_address: (Array.isArray(order.restaurants) && order.restaurants.length > 0) 
              ? order.restaurants[0].address 
              : null,
            courier_location: courierLocation
          };
        })
      );

      setOrders(ordersWithLocation);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os pedidos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Configurar atualizações em tempo real
  useEffect(() => {
    if (!user) return;

    fetchOrders();

    // Configurar canal de real-time para pedidos
    const ordersChannel = supabase
      .channel('orders-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('Order updated:', payload);
        fetchOrders(); // Recarregar pedidos quando houver mudanças
      })
      .subscribe();

    // Configurar canal para localizações de entregadores
    const locationChannel = supabase
      .channel('courier-locations')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'courier_locations'
      }, (payload) => {
        console.log('Courier location updated:', payload);
        // Atualizar apenas se for um entregador dos nossos pedidos ativos
        const activeOrderCouriers = orders
          .filter(o => ['courier_assigned', 'picked_up', 'out_for_delivery'].includes(o.status))
          .map(o => o.courier_id)
          .filter(Boolean);
        
        if (activeOrderCouriers.includes(payload.new.courier_id)) {
          fetchOrders();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(locationChannel);
    };
  }, [user]);

  // Filtrar pedidos baseado no filtro ativo
  const filteredOrders = orders.filter(order => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') {
      return !['delivered', 'cancelled'].includes(order.status);
    }
    return order.status === activeFilter;
  });

  const getStatusConfig = (status: string) => {
    return ORDER_STATUSES[status as keyof typeof ORDER_STATUSES] || ORDER_STATUSES.confirmed;
  };

  // Funções para gerenciamento de pagamento
  const [paymentActions, setPaymentActions] = useState<{[key: string]: 'processing' | null}>({});

  const verifyPaymentStatus = async (orderId: string) => {
    try {
      setPaymentActions(prev => ({ ...prev, [orderId]: 'processing' }));
      
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { orderId }
      });

      if (error) throw error;

      toast({
        title: 'Verificação de Pagamento',
        description: data.verified ? 'Pagamento verificado com sucesso!' : 'Pagamento ainda não processado.',
        variant: data.verified ? 'default' : 'destructive'
      });

      if (data.verified) {
        fetchOrders(); // Recarregar pedidos se pagamento foi verificado
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast({
        title: 'Erro na Verificação',
        description: 'Não foi possível verificar o status do pagamento.',
        variant: 'destructive'
      });
    } finally {
      setPaymentActions(prev => ({ ...prev, [orderId]: null }));
    }
  };

  const acceptPayment = async (orderId: string) => {
    try {
      setPaymentActions(prev => ({ ...prev, [orderId]: 'processing' }));
      
      // Verificar se o usuário tem permissão para aceitar o pagamento
      const order = orders.find(o => o.id === orderId);
      if (!order || order.user_id !== user?.id) {
        throw new Error('Você não tem permissão para aceitar este pagamento');
      }

      const { data, error } = await supabase
        .from('orders')
        .update({ 
          status: 'confirmed',
          status_updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('user_id', user?.id) // Verificação adicional de segurança
        .select();

      if (error) throw error;

      toast({
        title: 'Pagamento Aceito',
        description: 'O pagamento foi aceito e o pedido está sendo processado.',
        variant: 'default'
      });

      fetchOrders(); // Recarregar pedidos
    } catch (error) {
      console.error('Error accepting payment:', error);
      toast({
        title: 'Erro ao Aceitar Pagamento',
        description: error instanceof Error ? error.message : 'Não foi possível aceitar o pagamento.',
        variant: 'destructive'
      });
    } finally {
      setPaymentActions(prev => ({ ...prev, [orderId]: null }));
    }
  };

  const rejectPayment = async (orderId: string) => {
    try {
      setPaymentActions(prev => ({ ...prev, [orderId]: 'processing' }));
      
      // Verificar se o usuário tem permissão para rejeitar o pagamento
      const order = orders.find(o => o.id === orderId);
      if (!order || order.user_id !== user?.id) {
        throw new Error('Você não tem permissão para rejeitar este pagamento');
      }

      const { data, error } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          status_updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('user_id', user?.id) // Verificação adicional de segurança
        .select();

      if (error) throw error;

      toast({
        title: 'Pagamento Rejeitado',
        description: 'O pagamento foi rejeitado e o pedido foi cancelado.',
        variant: 'destructive'
      });

      fetchOrders(); // Recarregar pedidos
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast({
        title: 'Erro ao Rejeitar Pagamento',
        description: error instanceof Error ? error.message : 'Não foi possível rejeitar o pagamento.',
        variant: 'destructive'
      });
    } finally {
      setPaymentActions(prev => ({ ...prev, [orderId]: null }));
    }
  };

  const OrderCard = ({ order }: { order: Order }) => {
    const statusConfig = getStatusConfig(order.status);
    const StatusIcon = statusConfig.icon;
    const hasActiveDelivery = ['courier_assigned', 'picked_up', 'out_for_delivery'].includes(order.status);

    return (
      <Card className="hover:shadow-md transition-all duration-200 cursor-pointer" 
            onClick={() => setSelectedOrder(order)}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <StatusIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Pedido #{order.id.substring(0, 8)}</h3>
                <p className="text-sm text-muted-foreground">{order.restaurant_name}</p>
              </div>
            </div>
            <Badge variant="outline" className={statusConfig.color}>
              {statusConfig.label}
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{statusConfig.progress}%</span>
            </div>
            <Progress value={statusConfig.progress} className="h-2" />
            
            <p className="text-sm text-muted-foreground">
              {statusConfig.description}
            </p>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(order.created_at), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </span>
              <span className="font-semibold">R$ {order.total_amount.toFixed(2)}</span>
            </div>

            {hasActiveDelivery && order.courier_location && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <MapPin className="w-4 h-4" />
                <span>Entregador localizado - última atualização: {
                  formatDistanceToNow(new Date(order.courier_location.timestamp), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })
                }</span>
              </div>
            )}

            {/* Seção de Pagamento Pendente */}
            {order.status === 'pending_payment' && (
              <div className="border-t pt-3 space-y-3">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Ação Necessária: Verificar Pagamento</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      verifyPaymentStatus(order.id);
                    }}
                    disabled={paymentActions[order.id] === 'processing'}
                    className="text-xs"
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    {paymentActions[order.id] === 'processing' ? 'Verificando...' : 'Verificar'}
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={(e) => {
                      e.stopPropagation();
                      acceptPayment(order.id);
                    }}
                    disabled={paymentActions[order.id] === 'processing'}
                    className="text-xs bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    {paymentActions[order.id] === 'processing' ? 'Processando...' : 'Aceitar'}
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      rejectPayment(order.id);
                    }}
                    disabled={paymentActions[order.id] === 'processing'}
                    className="text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    {paymentActions[order.id] === 'processing' ? 'Processando...' : 'Rejeitar'}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/tracking/${order.id}`);
                }}
                className="flex-1"
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver Detalhes
              </Button>
              
              {hasActiveDelivery && (
                <>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/chat/${order.id}`);
                    }}
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      toast({
                        title: 'Contato do entregador',
                        description: 'Funcionalidade em desenvolvimento'
                      });
                    }}
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const OrderDetailModal = ({ order }: { order: Order }) => {
    const statusConfig = getStatusConfig(order.status);
    const hasActiveDelivery = ['courier_assigned', 'picked_up', 'out_for_delivery'].includes(order.status);

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
           onClick={() => setSelectedOrder(null)}>
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto" 
              onClick={(e) => e.stopPropagation()}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pedido #{order.id.substring(0, 8)}</CardTitle>
              <Button variant="ghost" onClick={() => setSelectedOrder(null)}>×</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status atual */}
            <div className="flex items-center gap-4">
              <Badge variant="outline" className={statusConfig.color}>
                {statusConfig.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {statusConfig.description}
              </span>
              {order.status === 'pending_payment' && (
                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Ação Necessária</span>
                </div>
              )}
            </div>

            {/* Seção de Ações de Pagamento */}
            {order.status === 'pending_payment' && (
              <div className="border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200">Verificação de Pagamento</h3>
                </div>
                
                <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
                  Este pedido está aguardando a confirmação do pagamento. Você pode verificar o status, aceitar ou rejeitar o pagamento.
                </p>
                
                <div className="flex gap-3">
                  <Button 
                    variant="outline"
                    onClick={() => verifyPaymentStatus(order.id)}
                    disabled={paymentActions[order.id] === 'processing'}
                    className="flex-1"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {paymentActions[order.id] === 'processing' ? 'Verificando...' : 'Verificar Status'}
                  </Button>
                  
                  <Button 
                    onClick={() => acceptPayment(order.id)}
                    disabled={paymentActions[order.id] === 'processing'}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {paymentActions[order.id] === 'processing' ? 'Processando...' : 'Aceitar Pagamento'}
                  </Button>
                  
                  <Button 
                    variant="destructive"
                    onClick={() => rejectPayment(order.id)}
                    disabled={paymentActions[order.id] === 'processing'}
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {paymentActions[order.id] === 'processing' ? 'Processando...' : 'Rejeitar'}
                  </Button>
                </div>
              </div>
            )}

            {/* Mapa (se há entrega ativa) */}
            {hasActiveDelivery && order.courier_location && order.delivery_address && (
              <div>
                <h3 className="font-semibold mb-3">Localização em Tempo Real</h3>
                <div className="h-64 rounded-lg overflow-hidden border">
                  <DeliveryMap
                    orderId={order.id}
                    restaurantLocation={{
                      lat: order.restaurant_address?.lat || -16.6869,
                      lng: order.restaurant_address?.lng || -49.2648
                    }}
                    deliveryLocation={{
                      lat: order.delivery_address.lat || order.delivery_address.latitude || -16.6869,
                      lng: order.delivery_address.lng || order.delivery_address.longitude || -49.2648
                    }}
                    courierLocation={{
                      lat: order.courier_location.latitude,
                      lng: order.courier_location.longitude
                    }}
                    className="w-full h-full"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Itens do pedido */}
              <div>
                <h3 className="font-semibold mb-3">Itens do Pedido</h3>
                <div className="space-y-2">
                  {Array.isArray(order.items) ? order.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">Itens não disponíveis</p>
                  )}
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>R$ {order.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Informações de entrega */}
              <div>
                <h3 className="font-semibold mb-3">Endereço de Entrega</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{order.delivery_address?.street}, {order.delivery_address?.number}</p>
                  <p>{order.delivery_address?.neighborhood}</p>
                  <p>{order.delivery_address?.city} - {order.delivery_address?.state}</p>
                  <p>CEP: {order.delivery_address?.zipcode}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={() => navigate(`/tracking/${order.id}`)}
                className="flex-1"
              >
                Ver Página Completa de Rastreamento
              </Button>
              {hasActiveDelivery && (
                <Button 
                  variant="outline"
                  onClick={() => navigate(`/chat/${order.id}`)}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meus Pedidos</h1>
          <p className="text-muted-foreground">Acompanhe o status dos seus pedidos em tempo real</p>
        </div>
        <Button variant="outline" onClick={fetchOrders} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <Tabs value={activeFilter} onValueChange={setActiveFilter}>
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
          {STATUS_FILTERS.map((filter) => {
            const Icon = filter.icon;
            const count = filter.key === 'all' 
              ? orders.length 
              : filter.key === 'active'
              ? orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length
              : orders.filter(o => o.status === filter.key).length;
            
            return (
              <TabsTrigger key={filter.key} value={filter.key} className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{filter.label}</span>
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {STATUS_FILTERS.map((filter) => (
          <TabsContent key={filter.key} value={filter.key} className="mt-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                      <div className="h-2 bg-muted rounded mb-2"></div>
                      <div className="h-2 bg-muted rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {filter.key === 'all' ? 'Nenhum pedido ainda' : `Nenhum pedido ${filter.label.toLowerCase()}`}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {filter.key === 'all' 
                      ? 'Quando você fizer seu primeiro pedido, ele aparecerá aqui.' 
                      : `Você não tem pedidos com status ${filter.label.toLowerCase()}.`
                    }
                  </p>
                  <Button onClick={() => navigate('/')}>
                    Explorar Restaurantes
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Modal de detalhes do pedido */}
      {selectedOrder && <OrderDetailModal order={selectedOrder} />}
    </div>
  );
}