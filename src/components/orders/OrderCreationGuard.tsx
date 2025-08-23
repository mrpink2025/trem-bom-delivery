
import React, { useState } from 'react';
import { useUserBlocks } from '@/hooks/useUserBlocks';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface OrderCreationGuardProps {
  children: React.ReactNode;
  onProceed: () => void | Promise<void>;
  disabled?: boolean;
}

export function OrderCreationGuard({ children, onProceed, disabled }: OrderCreationGuardProps) {
  const [isChecking, setIsChecking] = useState(false);
  const { canCreateOrder } = useUserBlocks();
  const { toast } = useToast();

  const handleProceed = async () => {
    setIsChecking(true);
    
    try {
      const { allowed, reason } = await canCreateOrder();
      
      if (!allowed) {
        toast({
          title: '🚫 Não é possível criar pedido',
          description: reason,
          variant: 'destructive',
          duration: 8000,
        });
        return;
      }

      await onProceed();
    } catch (error) {
      console.error('Error in order creation guard:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao verificar permissões. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Button 
      onClick={handleProceed}
      disabled={disabled || isChecking}
      className="w-full"
    >
      {isChecking ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Verificando...
        </>
      ) : (
        children
      )}
    </Button>
  );
}
