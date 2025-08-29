import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Review {
  id: string;
  user_id: string;
  target_id: string;
  target_type: string;
  order_id: string;
  stars: number;
  comment: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export const useReviews = (restaurantId?: string) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchReviews = async (restaurantId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('target_id', restaurantId)
        .eq('target_type', 'restaurant')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Falha ao carregar avaliações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createReview = async (reviewData: {
    target_id: string;
    stars: number;
    comment: string;
    order_id: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          target_id: reviewData.target_id,
          target_type: 'restaurant',
          order_id: reviewData.order_id,
          stars: reviewData.stars,
          comment: reviewData.comment,
          is_verified: false
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Avaliação enviada",
        description: "Sua avaliação foi enviada com sucesso!",
      });

      // Refresh reviews if we're viewing this restaurant
      if (restaurantId === reviewData.target_id) {
        fetchReviews(restaurantId);
      }

      return data as Review;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao enviar avaliação",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateReview = async (reviewId: string, updates: {
    stars?: number;
    comment?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Avaliação atualizada",
        description: "Sua avaliação foi atualizada com sucesso!",
      });

      // Refresh reviews
      if (restaurantId) {
        fetchReviews(restaurantId);
      }

      return data as Review;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Falha ao atualizar avaliação",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getAverageRating = (reviews: Review[]) => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.stars, 0);
    return Number((sum / reviews.length).toFixed(1));
  };

  const getRatingDistribution = (reviews: Review[]) => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
      distribution[review.stars as keyof typeof distribution]++;
    });
    return distribution;
  };

  useEffect(() => {
    if (restaurantId) {
      fetchReviews(restaurantId);
    }
  }, [restaurantId]);

  return {
    reviews,
    loading,
    createReview,
    updateReview,
    fetchReviews,
    getAverageRating,
    getRatingDistribution
  };
};