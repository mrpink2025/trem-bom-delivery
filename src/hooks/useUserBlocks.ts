
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UserBlock {
  id: string;
  user_id: string;
  block_type: string;
  blocked_at: string;
  blocked_until: string;
  reason: string;
  cancelled_orders_count: number;
  is_active: boolean;
}

export function useUserBlocks() {
  const [userBlocks, setUserBlocks] = useState<UserBlock[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [activeBlock, setActiveBlock] = useState<UserBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Verificar se usuário está bloqueado
  const checkUserBlocks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gt('blocked_until', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUserBlocks(data || []);
      
      const currentBlock = data?.[0] || null;
      setActiveBlock(currentBlock);
      setIsBlocked(!!currentBlock);

      // Mostrar notificação se usuário estiver bloqueado
      if (currentBlock) {
        const blockedUntil = new Date(currentBlock.blocked_until).toLocaleDateString('pt-BR');
        toast({
          title: '🚫 Conta Temporariamente Bloqueada',
          description: `Você não pode criar novos pedidos até ${blockedUntil}. Motivo: ${currentBlock.reason}`,
          variant: 'destructive',
          duration: 10000,
        });
      }
    } catch (error) {
      console.error('Error checking user blocks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Verificar se usuário pode fazer pedidos
  const canCreateOrder = async (): Promise<{ allowed: boolean; reason?: string }> => {
    if (!user) return { allowed: false, reason: 'Usuário não autenticado' };

    try {
      // Verificar bloqueios ativos
      const { data: blocks } = await supabase
        .from('user_blocks')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gt('blocked_until', new Date().toISOString())
        .limit(1);

      if (blocks && blocks.length > 0) {
        const block = blocks[0];
        const blockedUntil = new Date(block.blocked_until).toLocaleDateString('pt-BR');
        return {
          allowed: false,
          reason: `Conta bloqueada até ${blockedUntil}. ${block.reason}`
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking order permission:', error);
      return { allowed: false, reason: 'Erro ao verificar permissões' };
    }
  };

  // Configurar real-time para atualizações de bloqueios
  useEffect(() => {
    if (!user) return;

    checkUserBlocks();

    const channel = supabase
      .channel('user_blocks_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_blocks',
        filter: `user_id=eq.${user.id}`
      }, () => {
        checkUserBlocks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    userBlocks,
    isBlocked,
    activeBlock,
    loading,
    canCreateOrder,
    checkUserBlocks
  };
}
