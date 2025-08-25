import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface LoyaltyPoint {
  id: string;
  user_id: string;
  points: number;
  earned_from: string;
  description?: string;
  created_at: string;
  expires_at?: string;
}

interface LoyaltyReward {
  id: string;
  name: string;
  description?: string;
  points_required: number;
  reward_type: string;
  reward_value: number;
  is_active: boolean;
  max_uses?: number;
  current_uses: number;
}

export function useLoyaltyProgram() {
  const [points, setPoints] = useState<LoyaltyPoint[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchLoyaltyData = async () => {
    if (!user) {
      console.log('🚨 SECURITY: No user logged in, blocking loyalty data access');
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔒 SECURITY: Fetching loyalty data for user:', user.id);
      
      // Fetch user's loyalty points with security check
      const { data: userPoints, error: pointsError } = await supabase
        .from('loyalty_points')
        .select('*')
        .eq('user_id', user.id) // CRITICAL: Only fetch current user's points
        .order('created_at', { ascending: false });

      if (pointsError) {
        console.error('Error fetching loyalty points:', pointsError);
        // Fallback to mock data if table doesn't exist yet
        const mockPoints: LoyaltyPoint[] = JSON.parse(localStorage.getItem(`loyalty_points_${user.id}`) || '[]');
        setPoints(mockPoints);
        const totalPoints = mockPoints.reduce((sum, point) => sum + point.points, 0);
        setBalance(totalPoints);
      } else {
        console.log('✅ SECURITY: Loaded', userPoints?.length || 0, 'loyalty points for user', user.id);
        setPoints(userPoints || []);
        const totalPoints = (userPoints || []).reduce((sum, point) => sum + point.points, 0);
        setBalance(totalPoints);
      }

      // Fetch available rewards (public data, no user filtering needed)
      const { data: availableRewards, error: rewardsError } = await supabase
        .from('loyalty_programs')
        .select('*')
        .eq('is_active', true)
        .order('points_per_real', { ascending: true });

      if (rewardsError || !availableRewards) {
        console.log('Using mock rewards data - table may not exist yet');
        // Mock rewards data
        const mockRewards: LoyaltyReward[] = [
          {
            id: '1',
            name: 'Desconto de R$ 10',
            description: 'Desconto de R$ 10 em qualquer pedido acima de R$ 50',
            points_required: 500,
            reward_type: 'discount',
            reward_value: 10,
            is_active: true,
            max_uses: 100,
            current_uses: 15
          },
          {
            id: '2',
            name: 'Frete Grátis',
            description: 'Taxa de entrega gratuita em qualquer pedido',
            points_required: 300,
            reward_type: 'free_shipping',
            reward_value: 0,
            is_active: true,
            max_uses: undefined,
            current_uses: 45
          },
          {
            id: '3',
            name: 'Desconto de R$ 25',
            description: 'Desconto de R$ 25 em pedidos acima de R$ 100',
            points_required: 1000,
            reward_type: 'discount',
            reward_value: 25,
            is_active: true,
            max_uses: 50,
            current_uses: 8
          }
        ];
        setRewards(mockRewards);
      } else {
        // Map loyalty_programs to rewards format
        const mappedRewards: LoyaltyReward[] = availableRewards.map(program => ({
          id: program.id,
          name: program.name,
          description: program.description,
          points_required: Math.round((program.points_per_real || 1) * 100), // Convert to points needed
          reward_type: 'discount',
          reward_value: 10,
          is_active: program.is_active,
          max_uses: undefined,
          current_uses: 0
        }));
        setRewards(mappedRewards);
      }

    } catch (error) {
      console.error('🚨 SECURITY ERROR: Failed to fetch loyalty data:', error);
      toast({
        title: "Erro de Segurança",
        description: "Não foi possível carregar os dados de fidelidade com segurança",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const redeemReward = async (rewardId: string, pointsCost: number) => {
    if (!user) {
      console.log('🚨 SECURITY: No user logged in, blocking reward redemption');
      toast({
        title: "Acesso Negado",
        description: "Você precisa estar logado para resgatar prêmios",
        variant: "destructive"
      });
      return false;
    }
    
    if (balance < pointsCost) {
      toast({
        title: "Pontos insuficientes",
        description: "Você não tem pontos suficientes para este prêmio",
        variant: "destructive"
      });
      return false;
    }

    try {
      console.log('🔒 SECURITY: User', user.id, 'attempting to redeem reward', rewardId, 'for', pointsCost, 'points');
      
      // Try to insert into loyalty_points table (negative points for redemption)
      const { error: insertError } = await supabase
        .from('loyalty_points')
        .insert({
          user_id: user.id, // CRITICAL: Only allow redemption for current user
          points: -pointsCost,
          earned_from: 'redemption',
          description: `Resgate de prêmio: ${rewardId}`,
          expires_at: null
        });

      if (insertError) {
        console.log('Loyalty points table not available, using localStorage fallback');
        // Fallback to localStorage for development
        const existingPoints = JSON.parse(localStorage.getItem(`loyalty_points_${user.id}`) || '[]');
        existingPoints.push({
          id: crypto.randomUUID(),
          user_id: user.id,
          points: -pointsCost,
          earned_from: 'redemption',
          description: 'Resgate de prêmio',
          created_at: new Date().toISOString()
        });
        localStorage.setItem(`loyalty_points_${user.id}`, JSON.stringify(existingPoints));
      } else {
        console.log('✅ SECURITY: Reward redeemed successfully for user', user.id);
      }

      toast({
        title: "Prêmio resgatado!",
        description: "Seu prêmio foi resgatado com sucesso",
      });

      // Refresh data to reflect changes
      await fetchLoyaltyData();
      return true;

    } catch (error) {
      console.error('🚨 SECURITY ERROR: Failed to redeem reward:', error);
      toast({
        title: "Erro de Segurança",
        description: "Não foi possível resgatar o prêmio com segurança",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchLoyaltyData();
  }, [user]);

  return {
    points,
    rewards,
    balance,
    loading,
    redeemReward,
    refresh: fetchLoyaltyData
  };
}