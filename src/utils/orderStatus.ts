// 🎯 Tipagem exhaustiva e validação de FSM para pedidos
export type OrderStatus = 
  | 'pending_payment'
  | 'placed' 
  | 'confirmed' 
  | 'preparing' 
  | 'ready' 
  | 'out_for_delivery' 
  | 'delivered' 
  | 'cancelled';

export type StatusTransition = {
  from: OrderStatus;
  to: OrderStatus;
  allowedActors?: ('customer' | 'seller' | 'courier' | 'admin' | 'system')[];
  requiresReason?: boolean;
};

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings?: string[];
};

// Mapa de transições permitidas com rollbacks controlados
export const ALLOWED_TRANSITIONS: StatusTransition[] = [
  // Fluxo normal
  { from: 'pending_payment', to: 'confirmed', allowedActors: ['system'] },
  { from: 'pending_payment', to: 'cancelled', allowedActors: ['system', 'customer'] },
  { from: 'placed', to: 'confirmed', allowedActors: ['seller', 'admin'] },
  { from: 'placed', to: 'cancelled', allowedActors: ['seller', 'customer', 'admin'] },
  { from: 'confirmed', to: 'preparing', allowedActors: ['seller', 'admin'] },
  { from: 'confirmed', to: 'cancelled', allowedActors: ['seller', 'customer', 'admin'] },
  { from: 'preparing', to: 'ready', allowedActors: ['seller', 'admin'] },
  { from: 'preparing', to: 'cancelled', allowedActors: ['seller', 'admin'] },
  { from: 'ready', to: 'out_for_delivery', allowedActors: ['courier', 'seller', 'admin'] },
  { from: 'ready', to: 'cancelled', allowedActors: ['seller', 'admin'] },
  { from: 'out_for_delivery', to: 'delivered', allowedActors: ['courier', 'admin'] },
  
  // Rollbacks controlados (com justificativa)
  { from: 'preparing', to: 'confirmed', allowedActors: ['seller', 'admin'], requiresReason: true },
  { from: 'ready', to: 'preparing', allowedActors: ['seller', 'admin'], requiresReason: true },
  { from: 'out_for_delivery', to: 'ready', allowedActors: ['courier', 'admin'], requiresReason: true },
];

/**
 * Valida se uma transição de status é permitida
 */
export function canTransition(
  from: OrderStatus, 
  to: OrderStatus, 
  actorRole?: string
): boolean {
  // Estados finais não podem ser alterados
  if (from === 'delivered' || from === 'cancelled') {
    return false;
  }

  const transition = ALLOWED_TRANSITIONS.find(
    t => t.from === from && t.to === to
  );

  if (!transition) {
    return false;
  }

  // Se não especificar actor, assumir que pode (para compatibilidade)
  if (!actorRole || !transition.allowedActors) {
    return true;
  }

  return transition.allowedActors.includes(actorRole as any);
}

/**
 * Validação exhaustiva com TypeScript para garantir todos os cases
 */
export function validateStatusTransition(
  from: OrderStatus,
  to: OrderStatus,
  actorRole?: string,
  reason?: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Verificação exhaustiva usando switch para garantir todos os casos
  const isValidTransition = (() => {
    switch (from) {
      case 'pending_payment':
        return to === 'confirmed' || to === 'cancelled' || to === 'placed';
      case 'placed':
        return to === 'confirmed' || to === 'cancelled';
      case 'confirmed':
        return to === 'preparing' || to === 'cancelled';
      case 'preparing':
        return to === 'ready' || to === 'cancelled' || to === 'confirmed';
      case 'ready':
        return to === 'out_for_delivery' || to === 'cancelled' || to === 'preparing';
      case 'out_for_delivery':
        return to === 'delivered' || to === 'ready';
      case 'delivered':
        return false; // Estado final
      case 'cancelled':
        return false; // Estado final
      default:
        // TypeScript exhaustiveness check
        const _exhaustive: never = from;
        return _exhaustive;
    }
  })();

  if (!isValidTransition) {
    errors.push(`Invalid transition from '${from}' to '${to}'`);
    return { valid: false, errors };
  }

  // Verificar se é um rollback que requer justificativa
  const transition = ALLOWED_TRANSITIONS.find(
    t => t.from === from && t.to === to
  );

  if (transition?.requiresReason && !reason) {
    errors.push(`Rollback from '${from}' to '${to}' requires a reason`);
  }

  // Verificar permissões do actor
  if (actorRole && transition?.allowedActors && 
      !transition.allowedActors.includes(actorRole as any)) {
    errors.push(`Actor '${actorRole}' not allowed to perform transition from '${from}' to '${to}'`);
  }

  // Warnings para rollbacks
  if (transition?.requiresReason && reason) {
    warnings.push(`Rollback operation logged: ${reason}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Obter próximos status possíveis para um status atual
 */
export function getNextValidStatuses(
  currentStatus: OrderStatus,
  actorRole?: string
): OrderStatus[] {
  return ALLOWED_TRANSITIONS
    .filter(t => t.from === currentStatus)
    .filter(t => !actorRole || !t.allowedActors || t.allowedActors.includes(actorRole as any))
    .map(t => t.to);
}

/**
 * Verificar se status é final (não permite mais mudanças)
 */
export function isFinalStatus(status: OrderStatus): boolean {
  return status === 'delivered' || status === 'cancelled';
}

/**
 * Obter label amigável para status
 */
export function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    'pending_payment': 'Aguardando Pagamento',
    'placed': 'Pedido Realizado',
    'confirmed': 'Confirmado',
    'preparing': 'Em Preparação',
    'ready': 'Pronto',
    'out_for_delivery': 'Saiu para Entrega',
    'delivered': 'Entregue',
    'cancelled': 'Cancelado'
  };
  
  return labels[status] || status;
}

/**
 * Obter cor do status para UI
 */
export function getStatusColor(status: OrderStatus): string {
  const colors: Record<OrderStatus, string> = {
    'pending_payment': 'text-orange-600 bg-orange-50',
    'placed': 'text-blue-600 bg-blue-50',
    'confirmed': 'text-green-600 bg-green-50',
    'preparing': 'text-yellow-600 bg-yellow-50',
    'ready': 'text-purple-600 bg-purple-50',
    'out_for_delivery': 'text-indigo-600 bg-indigo-50',
    'delivered': 'text-green-700 bg-green-100',
    'cancelled': 'text-red-600 bg-red-50'
  };
  
  return colors[status] || 'text-gray-600 bg-gray-50';
}