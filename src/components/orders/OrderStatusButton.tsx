import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useOrderStatusValidation } from '@/hooks/useOrderStatusValidation';
import { 
  OrderStatus, 
  getNextValidStatuses, 
  getStatusLabel, 
  getStatusColor,
  isFinalStatus 
} from '@/utils/orderStatus';

interface OrderStatusButtonProps {
  orderId: string;
  currentStatus: OrderStatus;
  userRole: string;
  onStatusUpdated?: (newStatus: OrderStatus) => void;
  disabled?: boolean;
}

export function OrderStatusButton({
  orderId,
  currentStatus,
  userRole,
  onStatusUpdated,
  disabled = false
}: OrderStatusButtonProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { updateOrderStatus } = useOrderStatusValidation();

  // Mapear roles do sistema para roles de validação
  const actorRole = userRole === 'restaurant' ? 'seller' : 
                   userRole === 'courier' ? 'courier' : 
                   userRole === 'admin' ? 'admin' : 'customer';

  const nextStatuses = getNextValidStatuses(currentStatus, actorRole);

  const isRollback = selectedStatus && (
    (currentStatus === 'preparing' && selectedStatus === 'confirmed') ||
    (currentStatus === 'ready' && selectedStatus === 'preparing') ||
    (currentStatus === 'out_for_delivery' && selectedStatus === 'ready')
  );

  const handleStatusChange = async () => {
    if (!selectedStatus) return;
    
    // Validar se rollback tem justificativa
    if (isRollback && !reason.trim()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await updateOrderStatus({
        orderId,
        newStatus: selectedStatus,
        reason: reason.trim() || undefined,
        validationData: {
          ui_source: 'order_status_button',
          user_role: userRole
        }
      });

      if (result.success && result.newStatus) {
        onStatusUpdated?.(result.newStatus);
        setSelectedStatus(null);
        setReason('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedStatus(null);
    setReason('');
  };

  // Se não há próximos status ou está desabilitado
  if (nextStatuses.length === 0 || disabled || isFinalStatus(currentStatus)) {
    return (
      <Badge variant="outline" className={getStatusColor(currentStatus)}>
        {getStatusLabel(currentStatus)}
      </Badge>
    );
  }

  return (
    <>
      {/* Status atual com botões de ação */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className={getStatusColor(currentStatus)}>
          {getStatusLabel(currentStatus)}
        </Badge>
        
        {nextStatuses.map((status) => (
          <Button
            key={status}
            variant="outline"
            size="sm"
            onClick={() => setSelectedStatus(status)}
            className="text-xs"
          >
            → {getStatusLabel(status)}
          </Button>
        ))}
      </div>

      {/* Dialog de confirmação */}
      <Dialog open={selectedStatus !== null} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Mudança de Status</DialogTitle>
            <DialogDescription>
              Alterar status de "{getStatusLabel(currentStatus)}" para "{selectedStatus ? getStatusLabel(selectedStatus) : ''}"?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Warning para rollbacks */}
            {isRollback && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-600">⚠️</span>
                  <span className="text-sm font-medium text-yellow-800">
                    Esta é uma operação de rollback
                  </span>
                </div>
                <p className="text-xs text-yellow-700 mt-1">
                  Rollbacks requerem justificativa e serão auditados
                </p>
              </div>
            )}

            {/* Textarea para justificativa */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {isRollback ? 'Justificativa (obrigatória):' : 'Observações (opcional):'}
              </label>
              <Textarea
                placeholder={isRollback ? 'Motivo do rollback...' : 'Comentários adicionais...'}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[80px]"
              />
              {isRollback && !reason.trim() && (
                <p className="text-xs text-red-500">
                  Justificativa obrigatória para rollbacks
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleStatusChange}
              disabled={isLoading || (isRollback && !reason.trim())}
              variant={selectedStatus === 'cancelled' ? 'destructive' : 'default'}
            >
              {isLoading ? 'Processando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}