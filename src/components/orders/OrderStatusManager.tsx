import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { useOrderStateMachine } from '@/hooks/useOrderStateMachine';

interface OrderStatusManagerProps {
  orderId: string;
  userRole?: 'restaurant' | 'courier' | 'admin';
  courierId?: string;
}

export function OrderStatusManager({ orderId, userRole, courierId }: OrderStatusManagerProps) {
  const {
    order,
    isLoading,
    updateStatus,
    isUpdating,
    advanceToNextStatus,
    cancelOrder,
    getValidNextStatuses,
    statusLabels,
  } = useOrderStateMachine(orderId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Carregando status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!order) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Pedido não encontrado</p>
        </CardContent>
      </Card>
    );
  }

  const validNextStatuses = getValidNextStatuses();
  const canAdvance = validNextStatuses.length > 0 && order.status !== 'delivered' && order.status !== 'cancelled';

  // Verificar permissões baseadas no role
  const hasPermissionToUpdate = () => {
    if (userRole === 'admin') return true;
    
    if (userRole === 'restaurant') {
      return ['confirmed', 'preparing', 'ready'].includes(order.status);
    }
    
    if (userRole === 'courier') {
      return ['out_for_delivery', 'delivered'].includes(order.status) || 
             (order.status === 'ready' && !order.courier_id);
    }
    
    return false;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Status do Pedido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Status Atual</p>
            <Badge variant="outline" className="mt-1">
              {statusLabels[order.status] || order.status}
            </Badge>
          </div>
          
          {order.status_updated_at && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Atualizado em</p>
              <p className="text-sm">
                {new Date(order.status_updated_at).toLocaleString('pt-BR')}
              </p>
            </div>
          )}
        </div>

        {hasPermissionToUpdate() && canAdvance && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => advanceToNextStatus(courierId)}
                disabled={isUpdating}
                className="flex-1"
              >
                {isUpdating ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Avançar para Próximo Status
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ou escolha um status específico:</label>
              <Select
                onValueChange={(value) => updateStatus({ newStatus: value, courierId })}
                disabled={isUpdating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  {validNextStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusLabels[status] || status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <Button
                variant="destructive"
                onClick={cancelOrder}
                disabled={isUpdating}
                className="w-full"
              >
                {isUpdating ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Cancelar Pedido
              </Button>
            )}
          </div>
        )}

        {!hasPermissionToUpdate() && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Você não tem permissão para alterar este status
          </p>
        )}

        {!canAdvance && hasPermissionToUpdate() && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {order.status === 'delivered' 
              ? 'Pedido já foi entregue' 
              : order.status === 'cancelled'
              ? 'Pedido foi cancelado'
              : 'Não há próximos status disponíveis'
            }
          </p>
        )}
      </CardContent>
    </Card>
  );
}