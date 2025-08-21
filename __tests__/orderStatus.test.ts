import { canTransition, getValidTransitions, OrderStatus } from '../src/utils/orderStatus';

describe('Order Status Transitions', () => {
  describe('canTransition', () => {
    it('should allow valid transitions from placed', () => {
      expect(canTransition('placed', 'confirmed')).toBe(true);
      expect(canTransition('placed', 'cancelled')).toBe(true);
      expect(canTransition('placed', 'preparing')).toBe(false);
    });

    it('should allow rollback from out_for_delivery to ready', () => {
      expect(canTransition('out_for_delivery', 'ready')).toBe(true);
      expect(canTransition('out_for_delivery', 'delivered')).toBe(true);
    });

    it('should prevent transitions from final states', () => {
      expect(canTransition('delivered', 'cancelled')).toBe(false);
      expect(canTransition('cancelled', 'confirmed')).toBe(false);
    });

    it('should handle pending_payment correctly', () => {
      expect(canTransition('pending_payment', 'confirmed')).toBe(true);
      expect(canTransition('pending_payment', 'cancelled')).toBe(true);
      expect(canTransition('pending_payment', 'preparing')).toBe(false);
    });
  });

  describe('getValidTransitions', () => {
    it('should return correct next states for preparing', () => {
      const transitions = getValidTransitions('preparing');
      expect(transitions).toContain('ready');
      expect(transitions).toContain('cancelled');
      expect(transitions).toContain('confirmed'); // rollback
      expect(transitions).not.toContain('delivered');
    });
  });
});