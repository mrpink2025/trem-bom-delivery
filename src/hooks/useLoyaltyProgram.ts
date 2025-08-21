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
    if (!user) return;
    
    try {
      setLoading(true);
      
      // For now, use mock data until table types are updated
      const mockPoints: LoyaltyPoint[] = JSON.parse(localStorage.getItem(`loyalty_points_${user.id}`) || '[]');
      setPoints(mockPoints);

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

      // Calculate balance from points
      const totalPoints = mockPoints.reduce((sum, point) => sum + point.points, 0);
      setBalance(totalPoints);

    } catch (error) {
      console.error('Error fetching loyalty data:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de fidelidade",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const redeemReward = async (rewardId: string, pointsCost: number) => {
    if (!user) return false;
    
    if (balance < pointsCost) {
      toast({
        title: "Pontos insuficientes",
        description: "Você não tem pontos suficientes para este prêmio",
        variant: "destructive"
      });
      return false;
    }

    try {
      // For now, just simulate the redemption
      const newRedemption = {
        id: crypto.randomUUID(),
        user_id: user.id,
        reward_id: rewardId,
        points_used: pointsCost,
        redeemed_at: new Date().toISOString()
      };

      // Save redemption to localStorage
      const existingRedemptions = JSON.parse(localStorage.getItem(`loyalty_redemptions_${user.id}`) || '[]');
      existingRedemptions.push(newRedemption);
      localStorage.setItem(`loyalty_redemptions_${user.id}`, JSON.stringify(existingRedemptions));

      // Add negative points entry
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

      toast({
        title: "Prêmio resgatado!",
        description: "Seu prêmio foi resgatado com sucesso",
      });

      // Refresh data
      await fetchLoyaltyData();
      return true;

    } catch (error) {
      console.error('Error redeeming reward:', error);
      toast({
        title: "Erro",
        description: "Não foi possível resgatar o prêmio",
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