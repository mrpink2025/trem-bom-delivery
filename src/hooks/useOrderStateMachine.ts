import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OrderStatusHistory {
  status: string;
  timestamp: string;
  user_id?: string;
}

export interface OrderWithHistory {
  id: string;
  status: string;
  status_updated_at: string;
  status_history: OrderStatusHistory[] | null;
  user_id: string;
  restaurant_id: string;
  courier_id?: string;
  total_amount: number;
  items: any;
  delivery_address: any;
  restaurant_address: any;
  created_at: string;
  updated_at: string;
}

interface UpdateStatusResponse {
  success: boolean;
  error?: string;
  old_status?: string;
  new_status?: string;
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  'pending_payment': 'Aguardando Pagamento',
  'placed': 'Pedido Realizado',
  'confirmed': 'Confirmado',
  'preparing': 'Preparando',
  'ready': 'Pronto para Entrega',
  'out_for_delivery': 'Saiu para Entrega',
  'delivered': 'Entregue',
  'cancelled': 'Cancelado'
};

const ORDER_STATUS_FLOW = [
  'placed',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered'
];

export function useOrderStateMachine(orderId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar pedido com histórico
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (error) throw error;
      return {
        ...data,
        status_history: ((data?.status_history as unknown) as OrderStatusHistory[]) || []
      } as OrderWithHistory;
    },
    enabled: !!orderId,
  });

  // Mutação para atualizar status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ newStatus, courierId }: { newStatus: string; courierId?: string }) => {
      const { data, error } = await supabase.rpc('update_order_status', {
        p_order_id: orderId,
        p_new_status: newStatus,
        p_courier_id: courierId
      });

      if (error) throw error;
      return (data as unknown) as UpdateStatusResponse;
    },
    onSuccess: (data) => {
      if (data?.success) {
        queryClient.invalidateQueries({ queryKey: ['order', orderId] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        toast({
          title: 'Status atualizado',
          description: `Status alterado para: ${ORDER_STATUS_LABELS[data.new_status || ''] || data.new_status}`,
        });
      } else {
        throw new Error(data?.error || 'Erro desconhecido');
      }
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar status do pedido',
        variant: 'destructive',
      });
    }
  });

  // Função para avançar para próximo status
  const advanceToNextStatus = (courierId?: string) => {
    if (!order) return;

    const currentIndex = ORDER_STATUS_FLOW.indexOf(order.status);
    if (currentIndex === -1 || currentIndex === ORDER_STATUS_FLOW.length - 1) {
      return; // Status não encontrado ou já é o último
    }

    const nextStatus = ORDER_STATUS_FLOW[currentIndex + 1];
    updateStatusMutation.mutate({ newStatus: nextStatus, courierId });
  };

  // Função para cancelar pedido
  const cancelOrder = () => {
    if (!order) return;
    updateStatusMutation.mutate({ newStatus: 'cancelled' });
  };

  // Função para obter próximos status válidos
  const getValidNextStatuses = (): string[] => {
    if (!order) return [];

    const transitions: Record<string, string[]> = {
      'pending_payment': ['confirmed', 'cancelled'],
      'placed': ['confirmed', 'cancelled'],
      'confirmed': ['preparing', 'cancelled'],
      'preparing': ['ready', 'cancelled'],
      'ready': ['out_for_delivery', 'cancelled'],
      'out_for_delivery': ['delivered', 'cancelled'],
    };

    return transitions[order.status] || [];
  };

  // Função para calcular progresso
  const getOrderProgress = (): number => {
    if (!order) return 0;
    
    if (order.status === 'cancelled') return 0;
    if (order.status === 'delivered') return 100;
    
    const currentIndex = ORDER_STATUS_FLOW.indexOf(order.status);
    if (currentIndex === -1) return 0;
    
    return Math.round((currentIndex / (ORDER_STATUS_FLOW.length - 1)) * 100);
  };

  return {
    order,
    isLoading,
    error,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
    advanceToNextStatus,
    cancelOrder,
    getValidNextStatuses,
    getOrderProgress,
    statusLabels: ORDER_STATUS_LABELS,
    statusFlow: ORDER_STATUS_FLOW,
  };
}