import { 
  validateStatusTransition, 
  getNextValidStatuses, 
  isFinalStatus,
  getStatusLabel,
  getStatusColor,
  OrderStatus 
} from '../src/utils/orderStatus';

describe('Order Status Validation', () => {
  describe('validateStatusTransition', () => {
    it('should validate normal flow transitions', () => {
      const result = validateStatusTransition('placed', 'confirmed', 'seller');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid transitions', () => {
      const result = validateStatusTransition('delivered', 'confirmed', 'seller');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid transition from 'delivered' to 'confirmed'");
    });

    it('should require reason for rollbacks', () => {
      const result = validateStatusTransition('preparing', 'confirmed', 'seller');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Rollback from 'preparing' to 'confirmed' requires a reason");
    });

    it('should allow rollbacks with reason', () => {
      const result = validateStatusTransition('preparing', 'confirmed', 'seller', 'Kitchen issue');
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Rollback operation logged: Kitchen issue');
    });

    it('should validate actor permissions', () => {
      const result = validateStatusTransition('ready', 'out_for_delivery', 'customer');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Actor 'customer' not allowed to perform transition from 'ready' to 'out_for_delivery'");
    });

    it('should allow admin to perform any valid transition', () => {
      const result = validateStatusTransition('ready', 'out_for_delivery', 'admin');
      expect(result.valid).toBe(true);
    });
  });

  describe('getNextValidStatuses', () => {
    it('should return correct next statuses for preparing', () => {
      const nextStatuses = getNextValidStatuses('preparing');
      expect(nextStatuses).toContain('ready');
      expect(nextStatuses).toContain('cancelled');
      expect(nextStatuses).toContain('confirmed');
      expect(nextStatuses).not.toContain('delivered');
    });

    it('should filter by actor role', () => {
      const courierStatuses = getNextValidStatuses('ready', 'courier');
      expect(courierStatuses).toContain('out_for_delivery');
      
      const customerStatuses = getNextValidStatuses('ready', 'customer');
      expect(customerStatuses).not.toContain('out_for_delivery');
    });

    it('should return empty array for final statuses', () => {
      expect(getNextValidStatuses('delivered')).toHaveLength(0);
      expect(getNextValidStatuses('cancelled')).toHaveLength(0);
    });
  });

  describe('isFinalStatus', () => {
    it('should identify final statuses', () => {
      expect(isFinalStatus('delivered')).toBe(true);
      expect(isFinalStatus('cancelled')).toBe(true);
      expect(isFinalStatus('preparing')).toBe(false);
      expect(isFinalStatus('ready')).toBe(false);
    });
  });

  describe('getStatusLabel', () => {
    it('should return Portuguese labels', () => {
      expect(getStatusLabel('pending_payment')).toBe('Aguardando Pagamento');
      expect(getStatusLabel('confirmed')).toBe('Confirmado');
      expect(getStatusLabel('out_for_delivery')).toBe('Saiu para Entrega');
    });
  });

  describe('getStatusColor', () => {
    it('should return appropriate color classes', () => {
      expect(getStatusColor('confirmed')).toContain('text-green-600');
      expect(getStatusColor('cancelled')).toContain('text-red-600');
      expect(getStatusColor('preparing')).toContain('text-yellow-600');
    });
  });

  describe('exhaustive status handling', () => {
    const allStatuses: OrderStatus[] = [
      'pending_payment',
      'placed',
      'confirmed',
      'preparing',
      'ready',
      'out_for_delivery',
      'delivered',
      'cancelled'
    ];

    it('should handle all possible statuses', () => {
      allStatuses.forEach(status => {
        expect(() => getStatusLabel(status)).not.toThrow();
        expect(() => getStatusColor(status)).not.toThrow();
        expect(() => isFinalStatus(status)).not.toThrow();
        expect(() => getNextValidStatuses(status)).not.toThrow();
      });
    });

    it('should validate all status combinations', () => {
      allStatuses.forEach(fromStatus => {
        allStatuses.forEach(toStatus => {
          expect(() => 
            validateStatusTransition(fromStatus, toStatus, 'admin', 'test')
          ).not.toThrow();
        });
      });
    });
  });
});