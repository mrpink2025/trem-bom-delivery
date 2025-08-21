import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  OrderStatus, 
  validateStatusTransition, 
  getStatusLabel,
  canTransition 
} from '@/utils/orderStatus';

export interface StatusUpdateRequest {
  orderId: string;
  newStatus: OrderStatus;
  reason?: string;
  validationData?: Record<string, any>;
}

export interface StatusUpdateResult {
  success: boolean;
  oldStatus?: OrderStatus;
  newStatus?: OrderStatus;
  errors?: string[];
  locked?: boolean;
}

/**
 * Hook para validação e atualização segura de status de pedidos
 * Utiliza a RPC v3 com row locking e validação robusta
 */
export function useOrderStatusValidation() {
  
  /**
   * Atualizar status do pedido com validação client-side e server-side
   */
  const updateOrderStatus = useCallback(async (
    request: StatusUpdateRequest
  ): Promise<StatusUpdateResult> => {
    try {
      // Validação client-side primeiro (feedback rápido)
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('status, user_id')
        .eq('id', request.orderId)
        .single();

      if (!currentOrder) {
        toast.error('Pedido não encontrado');
        return { success: false, errors: ['Order not found'] };
      }

      const currentStatus = currentOrder.status as OrderStatus;
      
      // Obter role do usuário atual
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const userRole = profile?.role || 'client';
      
      // Validação client-side
      const validation = validateStatusTransition(
        currentStatus,
        request.newStatus,
        userRole === 'seller' ? 'seller' : 
        userRole === 'courier' ? 'courier' : 
        userRole === 'admin' ? 'admin' : 'customer',
        request.reason
      );

      if (!validation.valid) {
        toast.error(`Transição inválida: ${validation.errors.join(', ')}`);
        return { success: false, errors: validation.errors };
      }

      // Warnings para rollbacks
      if (validation.warnings) {
        validation.warnings.forEach(warning => toast.warning(warning));
      }

      // Chamar RPC v3 com lock e validação server-side
      const { data, error } = await supabase.rpc('update_order_status_v3', {
        p_order_id: request.orderId,
        p_new_status: request.newStatus,
        p_actor_id: (await supabase.auth.getUser()).data.user?.id || null,
        p_validation_data: {
          reason: request.reason,
          client_validation: validation,
          timestamp: new Date().toISOString(),
          ...request.validationData
        }
      });

      if (error) {
        console.error('Order status update error:', error);
        toast.error(`Erro ao atualizar status: ${error.message}`);
        return { 
          success: false, 
          errors: [error.message] 
        };
      }

      // Verificar se data é um objeto válido
      if (!data || typeof data !== 'object') {
        toast.error('Resposta inválida do servidor');
        return { 
          success: false, 
          errors: ['Invalid server response'] 
        };
      }

      const result = data as unknown as StatusUpdateResult;
      
      if (result.success) {
        toast.success(
          `Status alterado: ${getStatusLabel(currentStatus)} → ${getStatusLabel(request.newStatus)}`
        );
        
        return {
          ...result,
          oldStatus: currentStatus,
          newStatus: request.newStatus
        };
      } else {
        toast.error(result.errors?.[0] || 'Falha na atualização');
        return result;
      }

    } catch (error) {
      console.error('Unexpected error updating order status:', error);
      toast.error('Erro inesperado ao atualizar status');
      return { 
        success: false, 
        errors: ['Unexpected error'] 
      };
    }
  }, []);

  /**
   * Verificar se uma transição é válida (client-side preview)
   */
  const checkTransitionValidity = useCallback(async (
    orderId: string,
    newStatus: OrderStatus
  ): Promise<{ valid: boolean; reason?: string }> => {
    try {
      const { data: order } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();

      if (!order) {
        return { valid: false, reason: 'Order not found' };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const userRole = profile?.role || 'client';
      const actorRole = userRole === 'seller' ? 'seller' : 
                       userRole === 'courier' ? 'courier' : 
                       userRole === 'admin' ? 'admin' : 'customer';

      const isValid = canTransition(
        order.status as OrderStatus, 
        newStatus, 
        actorRole
      );

      return {
        valid: isValid,
        reason: isValid ? undefined : `Transição não permitida para ${actorRole}`
      };

    } catch (error) {
      return { valid: false, reason: 'Error checking transition' };
    }
  }, []);

  return {
    updateOrderStatus,
    checkTransitionValidity
  };
}